const METHODS = ["log", "error", "warn", "info", "debug"];

const LABELS = {
  log: "",
  error: "ERROR",
  warn: "WARN",
  info: "INFO",
  debug: "DEBUG",
};

const COLORS = {
  log: "",
  error: "\x1b[31m",
  warn: "\x1b[33m",
  info: "\x1b[36m",
  debug: "\x1b[90m",
};

const RESET = "\x1b[0m";

function colorEnabled(method) {
  if (process.env.NO_COLOR) {
    return false;
  }

  if (process.env.FORCE_COLOR) {
    return true;
  }

  const stream =
    method === "error" || method === "warn" ? process.stderr : process.stdout;
  return stream.isTTY === true;
}

function formatPrefix(method) {
  const timestamp = `[${new Date().toISOString()}]`;
  const label = LABELS[method];
  const prefix = label ? `${timestamp} ${label}` : timestamp;

  if (!colorEnabled(method) || !COLORS[method]) {
    return prefix;
  }

  return `${COLORS[method]}${prefix}${RESET}`;
}

for (const method of METHODS) {
  const original = console[method].bind(console);
  console[method] = (...args) => {
    original(formatPrefix(method), ...args);
  };
}
