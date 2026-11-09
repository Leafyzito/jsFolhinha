// the cookie cache only holds the users seen lately, so the total comes from mongo
async function countCookies() {
  const [result] = await fb.db.aggregate("cookie", [
    { $group: { _id: null, cookies: { $sum: "$total" } } },
  ]);
  // aggregate returns [] when it fails, keep the last value instead of dropping to 0
  if (!result) {
    throw new Error("cookie aggregation returned nothing");
  }
  fb.metrics.setCookiesHeld(result.cookies);
}

module.exports = countCookies;
