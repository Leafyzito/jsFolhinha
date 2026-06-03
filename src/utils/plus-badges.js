const BADGE_BASE = "https://folhinhabot.com/badges";
const ROLES = ["dev", "admin", "founder", "sub"];

function roleBadges(role) {
  return {
    1: `${BADGE_BASE}/${role}1.webp`,
    2: `${BADGE_BASE}/${role}2.webp`,
    3: `${BADGE_BASE}/${role}3.webp`,
  };
}

const PLUS_BADGES = Object.fromEntries(
  ROLES.map((role) => [role, roleBadges(role)])
);

module.exports = { PLUS_BADGES };
