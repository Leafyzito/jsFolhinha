const BADGE_BASE = "https://folhinhabot.com/badges";

// sorted from highest to lowest; months are total months subbed, not streak
const PLUS_TIERS = [
  { name: "Floresta", months: 24, badge: "sub24m" },
  { name: "Árvore", months: 12, badge: "sub12m" },
  { name: "Ramo", months: 6, badge: "sub6m" },
  { name: "Folha", months: 3, badge: "sub3m" },
  { name: "Broto", months: 1, badge: "sub" },
];
const DEFAULT_PLUS_BADGE = "sub";

const ROLES = [
  "dev",
  "admin",
  "founder",
  ...PLUS_TIERS.map((tier) => tier.badge),
];

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

function getPlusTier(months) {
  return (
    PLUS_TIERS.find((tier) => months >= tier.months) ||
    PLUS_TIERS[PLUS_TIERS.length - 1]
  );
}

module.exports = { PLUS_BADGES, PLUS_TIERS, DEFAULT_PLUS_BADGE, getPlusTier };
