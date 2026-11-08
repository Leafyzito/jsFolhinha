const got = require("got");
const metrics = require("../metrics");

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function httpOutcome(statusCode) {
  if (statusCode >= 200 && statusCode <= 299) {
    return "ok";
  }
  if (statusCode >= 500) {
    return "http_5xx";
  }
  return statusCode >= 400 ? "http_4xx" : "http_other";
}

async function fetchData(url, options = {}) {
  const host = metrics.hostLabel(url);
  const endRequest = metrics.httpDuration.startTimer({ host });
  try {
    const {
      forcedUserAgent,
      headers: userHeaders,
      ...gotOptions
    } = options || {};

    const requestHeaders = { ...(userHeaders || {}) };

    if (forcedUserAgent === true) {
      requestHeaders["user-agent"] =
        requestHeaders["user-agent"] ||
        requestHeaders["User-Agent"] ||
        DEFAULT_USER_AGENT;
      delete requestHeaders["User-Agent"];
    }

    const {
      rawBody,
      headers: responseHeaders,
      statusCode,
    } = await got(url, {
      throwHttpErrors: false,
      responseType: "buffer",
      ...gotOptions,
      headers: requestHeaders,
    });

    const outcome = httpOutcome(statusCode);
    endRequest({ outcome });
    metrics.httpRequests.inc({ host, outcome });

    if (!options.returnErrorBody && (statusCode < 200 || statusCode > 299)) {
      return null;
    }

    if (options.responseType === "text") {
      return rawBody.toString("utf8");
    }

    if (options.responseType === "buffer") {
      return rawBody;
    }

    const contentType = responseHeaders["content-type"] || "";

    if (contentType.includes("application/json")) {
      return JSON.parse(rawBody.toString("utf8"));
    }

    if (contentType.startsWith("text/")) {
      return rawBody.toString("utf8");
    }

    // fallback → return raw buffer (useful for images, pdfs, etc.)
    return rawBody;
  } catch (err) {
    // got errors (timeouts, dns, resets) end up here, a bad json body too
    if (!(err instanceof SyntaxError)) {
      const outcome = err.name === "TimeoutError" ? "timeout" : "error";
      endRequest({ outcome });
      metrics.httpRequests.inc({ host, outcome });
    }
    console.error(`Request error for url ${url}:`, err.message);
    return null;
  }
}

module.exports = { fetchData };
