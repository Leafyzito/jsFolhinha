/**
 * Expands placeholders in custom command response templates.
 * Escape literal braces: {{ → {, }} → }
 *
 * Placeholders: {user}, {channel}, {args}, {1}, {2}, ...
 */
const ESC_OPEN = "\uE000";
const ESC_CLOSE = "\uE001";

function expandCustomCommandResponse(template, message) {
  if (typeof template !== "string") {
    return "";
  }

  let s = template.replace(/\{\{/g, ESC_OPEN).replace(/\}\}/g, ESC_CLOSE);

  const cmdArgs = Array.isArray(message.args) ? message.args.slice(1) : [];
  const user =
    (typeof message.displayName === "string" && message.displayName.trim()) ||
    message.senderUsername ||
    "";
  const channel =
    typeof message.channelName === "string" ? message.channelName : "";

  s = s.replace(/\{args\}/g, () => cmdArgs.join(" "));

  s = s.replace(/\{(\d+)\}/g, (_, raw) => {
    const idx = Number(raw) - 1;
    return idx >= 0 && idx < cmdArgs.length ? cmdArgs[idx] : "";
  });

  s = s.replace(/\{user\}/gi, user);
  s = s.replace(/\{channel\}/gi, channel);

  s = s.replaceAll(ESC_OPEN, "{").replaceAll(ESC_CLOSE, "}");

  return s;
}

module.exports = {
  expandCustomCommandResponse,
};
