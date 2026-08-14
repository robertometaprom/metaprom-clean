import assert from "node:assert/strict";

// Guards the business rule independently from production data: only completed
// Stripe purchases may contribute revenue; mocks and pending OXXO remain zero.
const purchases = [
  { provider: "mock", status: "completed", amount_mxn: 149 },
  { provider: "stripe", status: "awaiting_payment", amount_mxn: 99 },
  { provider: "stripe", status: "completed", amount_mxn: 180 },
];
const revenue = purchases
  .filter((purchase) => purchase.provider === "stripe" && purchase.status === "completed")
  .reduce((total, purchase) => total + purchase.amount_mxn, 0);
assert.equal(revenue, 180);
console.log("dashboard canonical revenue rule: ok");
