const path = require("path");

async function getLocationCoordinates(location) {
  const api_url = `https://nominatim.openstreetmap.org/search?q=${location}&format=json&limit=1&addressdetails=1&accept-language=pt-PT`;

  const data = await fb.got(api_url, {
    retry: { limit: 3 },
    forcedUserAgent: true,
  });
  if (!data || data.length === 0) {
    return null;
  }

  const locationData = data[0];
  const city = Object.values(locationData.address)[0];
  const country = locationData.address.country;

  return {
    lat: locationData.lat,
    lon: locationData.lon,
    displayName: `${city}, ${country}`,
  };
}

async function getTimezoneInfo(displayName, lat, lon) {
  const api_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1`;

  const res = await fb.got(api_url);
  if (!res) {
    return null;
  }

  return {
    displayName,
    timezone: res.timezone,
    utcOffsetSeconds: res.utc_offset_seconds,
  };
}

function formatTimeResponse(timeInfo) {
  const now = new Date();

  // Format time in target timezone
  const time = now.toLocaleTimeString("pt-PT", {
    timeZone: timeInfo.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Format date in YYYY-MM-DD format
  const date = now
    .toLocaleDateString("pt-PT", {
      timeZone: timeInfo.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");

  // Format UTC offset
  const offsetHours = Math.floor(Math.abs(timeInfo.utcOffsetSeconds) / 3600);
  const offsetMinutes = Math.floor(
    (Math.abs(timeInfo.utcOffsetSeconds) % 3600) / 60
  );
  const offsetSign = timeInfo.utcOffsetSeconds >= 0 ? "+" : "-";
  const utcOffset = `UTC${offsetSign}${String(offsetHours).padStart(
    2,
    "0"
  )}:${String(offsetMinutes).padStart(2, "0")}`;

  // Get timezone long name
  const formatter = new Intl.DateTimeFormat("pt-PT", {
    timeZone: timeInfo.timezone,
    timeZoneName: "long",
  });
  const parts = formatter.formatToParts(now);
  const timeZoneName = parts.find((part) => part.type === "timeZoneName");
  const tzName = timeZoneName ? timeZoneName.value : timeInfo.timezone;

  return {
    displayName: timeInfo.displayName,
    timezone: tzName,
    utcOffset,
    time,
    date,
  };
}

const timeCommand = async (message) => {
  let targetLocation = message.args.slice(1).join(" ");
  let usedDbInfo = false;

  // Get location from database if not provided
  if (!targetLocation) {
    const userWeatherDb = await fb.db.get("weather", {
      userId: message.senderUserID,
    });
    if (!userWeatherDb) {
      return {
        reply: `Você ainda não configurou uma localização. Use ${message.prefix}weather set <localização> para configurar`,
      };
    }
    targetLocation = userWeatherDb.location;
    usedDbInfo = true;
  }

  // Get location coordinates
  const locationData = await getLocationCoordinates(targetLocation);
  if (!locationData) {
    return {
      reply: `Localização não encontrada`,
    };
  }

  // Get timezone information
  const timeInfo = await getTimezoneInfo(
    locationData.displayName,
    locationData.lat,
    locationData.lon
  );
  if (!timeInfo) {
    return {
      reply: `Não foi possível obter informações de fuso horário`,
    };
  }

  // Hide location if user has it marked as secret
  if (usedDbInfo) {
    const userWeatherDb = await fb.db.get("weather", {
      userId: message.senderUserID,
    });
    if (userWeatherDb.secret) {
      timeInfo.displayName = "(Localização escondida)";
    }
  }

  const formattedInfo = formatTimeResponse(timeInfo);
  return {
    reply: `${formattedInfo.displayName}: ${formattedInfo.time} de ${formattedInfo.date} lá agora - observando ${formattedInfo.timezone}, que é ${formattedInfo.utcOffset}`,
  };
};

timeCommand.commandName = "time";
timeCommand.aliases = ["time", "hora"];
timeCommand.shortDescription =
  "Comando para verificar a hora de uma localização";
timeCommand.cooldown = 5000;
timeCommand.cooldownType = "channel";
timeCommand.whisperable = true;
timeCommand.description = `Comando para verificar a hora de uma localização

!time {localização} - Verifica a hora de uma localização específica fornecida
!weather set {localização} - Configure a sua localização para não ter de especificar todas as vezes, se quiser que seja secreta, use este comando no whisper e depois use o !weather set secret

!weather set secret - Alterna o estado da localização entre público e secreto, para que não seja exibida para outros usuários

!weather - Caso tenha configurado uma localização, verifica o clima da sua localização configurada`;
timeCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  timeCommand,
};
