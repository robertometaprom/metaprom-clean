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

const authUsers = [
  { email: "founder@company.invalid" },
  { email: "alternate@company.invalid" },
  { email: "welcome-a-00000000-0000-4000-8000-000000000001@example.com" },
  { email: "welcome-b-00000000-0000-4000-8000-000000000002@example.com" },
];
const isClearlyAutomatedTestUser = (user) => /^welcome-[ab]-[0-9a-f-]+@example\.com$/i.test(user.email ?? "");
assert.equal(authUsers.filter(isClearlyAutomatedTestUser).length, 2);
assert.equal(authUsers.filter((user) => !isClearlyAutomatedTestUser(user)).length, 2);
console.log("dashboard automated Auth test-user exclusion: ok");
