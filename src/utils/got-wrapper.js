const got = require("got");

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchData(url, options = {}) {
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
    console.error(`Request error for url ${url}:`, err.message);
    return null;
  }
}

module.exports = { fetchData };
