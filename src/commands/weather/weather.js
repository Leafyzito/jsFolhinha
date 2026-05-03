const path = require("path");
const weatherCodes = {
  0: "☀️ Céu Limpo",
  1: "🌤️ Predominantemente Limpo",
  2: "⛅ Parcialmente Nublado",
  3: "☁️ Encoberto",
  45: "🌫️ Nevoeiro",
  48: "❄️ Nevoeiro com Geada",
  51: "🌦️ Chuvisco Leve",
  53: "🌧️ Chuvisco Moderada",
  55: "🌧️ Chuvisco Densa",
  56: "🌨️ Chuvisco Congelante Leve",
  57: "🌨️❄️ Chuvisco Congelante Densa",
  61: "🌦️ Chuva Fraca",
  63: "🌧️ Chuva Moderada",
  65: "🌧️🌊 Chuva Forte",
  66: "🌨️ Chuva Congelante Leve",
  67: "🌨️❄️ Chuva Congelante Forte",
  71: "❄️ Neve Fraca",
  73: "❄️☃️ Neve Moderada",
  75: "❄️🌨️ Neve Forte",
  77: "🌨️ Granizo",
  80: "🌦️ Pancadas de Chuva Fracas",
  81: "🌧️ Pancadas de Chuva Moderadas",
  82: "🌧️ Pancadas de Chuva Violentas",
  85: "❄️ Pancadas de Neve Fracas",
  86: "❄️🌨️ Pancadas de Neve Fortes",
  95: "🌩️ Trovoada Fraca ou Moderada",
  96: "⛈️ Trovoada com Granizo Leve",
  99: "⛈️ Trovoada com Granizo Forte",
};

function formatWindDirection(windDirection) {
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]; // should work xd
  return directions[Math.floor(windDirection / 45)];
}

async function getWeather(location) {
  const api_url = `https://nominatim.openstreetmap.org/search?q=${location}&format=json&limit=1&addressdetails=1&accept-language=pt-PT`;

  const data = await fb.got(api_url, {
    retry: { limit: 3 },
    forcedUserAgent: true,
  });
  if (!data || data.length === 0) {
    return null;
  }

  const locationData = data[0];
  const lat = locationData.lat;
  const lon = locationData.lon;
  const city = Object.values(locationData.address)[0];
  const country = locationData.address.country;
  const displayName = city + ", " + country;

  const weatherInfo = await getWeatherInfo(displayName, lat, lon);

  return weatherInfo;
}

async function getWeatherInfo(displayName, lat, lon) {
  const api_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m`;

  const res = await fb.got(api_url, { retry: { limit: 3 } });
  if (!res) {
    return null;
  }

  const weatherCode = res.current.weather_code;
  const weatherDescription = weatherCodes[weatherCode];
  const temperature = res.current.temperature_2m;
  const humidity = res.current.relative_humidity_2m;
  const feelsLike = res.current.apparent_temperature;
  const precipitation = res.current.precipitation;
  const windSpeed = res.current.wind_speed_10m;
  const windDirection = formatWindDirection(res.current.wind_direction_10m);

  return {
    displayName,
    weatherDescription,
    temperature,
    humidity,
    feelsLike,
    precipitation,
    windSpeed,
    windDirection,
  };
}

const weatherCommand = async (message) => {
  let weatherTargetLocation = message.args.slice(1).join(" ");
  let usedDbInfo = false;

  if (!weatherTargetLocation) {
    const userDoc = await fb.db.get("users", {
      userid: message.senderUserID,
    });
    const savedWeather = userDoc?.connections?.weather;
    if (!savedWeather?.location) {
      return {
        reply: `Você ainda não configurou uma localização. Use ${message.prefix}weather set <localização> para configurar`,
      };
    }
    weatherTargetLocation = savedWeather.location;
    usedDbInfo = true;
  }

  if (weatherTargetLocation.split(" ")[0] === "set") {
    const location = weatherTargetLocation.split(" ").slice(1).join(" ");
    if (!location) {
      return {
        reply: `Você precisa fornecer uma localização para configurar. Use ${message.prefix}weather set <localização>`,
      };
    }

    if (["secret", "secreto"].includes(location.toLowerCase())) {
      const userDoc = await fb.db.get("users", {
        userid: message.senderUserID,
      });
      const savedWeather = userDoc?.connections?.weather;
      if (!savedWeather?.location) {
        return {
          reply: `Você ainda não configurou uma localização. Use ${message.prefix}weather set <localização> para configurar`,
        };
      }
      const currentSecretState = savedWeather.secret;
      await fb.db.update(
        "users",
        { userid: message.senderUserID },
        { $set: { "connections.weather.secret": !currentSecretState } }
      );

      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        ["joia", "jumilhao"],
        "👍"
      );
      return {
        reply: `Localização alterada para estado ${
          !currentSecretState ? "secreto" : "público"
        } ${emote}`,
      };
    }

    const userDoc = await fb.db.get("users", {
      userid: message.senderUserID,
    });
    const savedWeather = userDoc?.connections?.weather;
    if (!savedWeather?.location) {
      await fb.db.update(
        "users",
        { userid: message.senderUserID },
        { $set: { "connections.weather": { location, secret: false } } }
      );

      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        ["joia", "jumilhao"],
        "👍"
      );
      return {
        reply: `Localização configurada com sucesso ${emote}`,
      };
    }
    await fb.db.update(
      "users",
      { userid: message.senderUserID },
      { $set: { "connections.weather.location": location } }
    );

    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["joia", "jumilhao"],
      "👍"
    );
    return {
      reply: `Localização configurada com sucesso ${emote}`,
    };
  }

  const weatherInfo = await getWeather(weatherTargetLocation);
  if (!weatherInfo) {
    return {
      reply: `Localização não encontrada`,
    };
  }

  if (usedDbInfo) {
    const userDoc = await fb.db.get("users", {
      userid: message.senderUserID,
    });
    if (userDoc?.connections?.weather?.secret) {
      weatherInfo.displayName = "(Localização escondida)";
    }
  }

  return {
    reply: `${weatherInfo.displayName}: ${weatherInfo.weatherDescription}, ${
      weatherInfo.temperature
    }°C (aparente: ${weatherInfo.feelsLike}°C), ${
      weatherInfo.humidity
    }% humidade, ${
      weatherInfo.precipitation !== 0
        ? `precipitação: ${weatherInfo.precipitation}mm, `
        : ""
    }${weatherInfo.windSpeed}km/h ${weatherInfo.windDirection}`,
  };
};

weatherCommand.commandName = "weather";
weatherCommand.aliases = ["weather", "wt", "clima"];
weatherCommand.shortDescription =
  "Comando para verificar o clima de uma localização";
weatherCommand.cooldown = 5000;
weatherCommand.cooldownType = "channel";
weatherCommand.whisperable = true;
weatherCommand.description = `Comando para verificar o clima de uma localização

!weather {localização} - Verifica o clima de uma localização específica fornecida
!weather set {localização} - Configure a sua localização para não ter de especificar todas as vezes, se quiser que seja secreta, use este comando no whisper e depois use o !weather set secret

!weather set secret - Alterna o estado da localização entre público e secreto, para que não seja exibida para outros usuários

!weather - Caso tenha configurado uma localização, verifica o clima da sua localização configurada`;
weatherCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  weatherCommand,
};
