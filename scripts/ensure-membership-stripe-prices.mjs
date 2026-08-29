/**
 * Create or reuse the four recurring membership Stripe Prices.
 * Never invent Price IDs. Prints env mappings only.
 *
 * Usage: node --env-file=.env.local scripts/ensure-membership-stripe-prices.mjs
 */
import Stripe from "stripe";

const MEMBERSHIPS = [
  {
    key: "golden_monthly",
    env: "STRIPE_PRICE_ID_GOLDEN_MONTHLY",
    name: "Metaprom Golden Monthly",
    amount: 35000,
    interval: "month",
    commercials: 8,
  },
  {
    key: "golden_annual",
    env: "STRIPE_PRICE_ID_GOLDEN_ANNUAL",
    name: "Metaprom Golden Annual",
    amount: 299000,
    interval: "year",
    commercials: 100,
  },
  {
    key: "premium_monthly",
    env: "STRIPE_PRICE_ID_PREMIUM_MONTHLY",
    name: "Metaprom Premium Monthly",
    amount: 60000,
    interval: "month",
    commercials: 15,
  },
  {
    key: "premium_annual",
    env: "STRIPE_PRICE_ID_PREMIUM_ANNUAL",
    name: "Metaprom Premium Annual",
    amount: 499000,
    interval: "year",
    commercials: 200,
  },
];

const secret = process.env.STRIPE_SECRET_KEY?.trim();
if (!secret || (!secret.startsWith("sk_test_") && !secret.startsWith("sk_live_"))) {
  console.error("STRIPE_SECRET_KEY is missing or not a Stripe secret key.");
  process.exit(1);
}

const stripe = new Stripe(secret);
const livemode = secret.startsWith("sk_live_");

async function findExistingPrice(spec) {
  const configured = process.env[spec.env]?.trim();
  if (configured?.startsWith("price_")) {
    try {
      const price = await stripe.prices.retrieve(configured);
      if (
        price.livemode === livemode &&
        price.type === "recurring" &&
        price.recurring?.interval === spec.interval &&
        price.currency === "mxn" &&
        price.unit_amount === spec.amount
      ) {
        return price;
      }
    } catch {
      // configured ID is not usable in this mode
    }
  }

  const products = await stripe.products.search({
    query: `metadata["metaprom_membership_key"]:"${spec.key}"`,
    limit: 5,
  });

  for (const product of products.data) {
    if (product.livemode !== livemode) continue;
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      type: "recurring",
      limit: 20,
    });
    const match = prices.data.find(
      (price) =>
        price.currency === "mxn" &&
        price.unit_amount === spec.amount &&
        price.recurring?.interval === spec.interval,
    );
    if (match) return match;
  }

  return null;
}

const mapping = [];

for (const spec of MEMBERSHIPS) {
  let price = await findExistingPrice(spec);
  if (!price) {
    const product = await stripe.products.create({
      name: spec.name,
      metadata: {
        metaprom_membership_key: spec.key,
        commercials: String(spec.commercials),
      },
    });
    price = await stripe.prices.create({
      product: product.id,
      currency: "mxn",
      unit_amount: spec.amount,
      recurring: { interval: spec.interval },
      metadata: {
        metaprom_membership_key: spec.key,
        commercials: String(spec.commercials),
      },
    });
    console.log(`created ${spec.key} ${price.id}`);
  } else {
    console.log(`reused ${spec.key} ${price.id}`);
  }

  mapping.push({
    key: spec.key,
    env: spec.env,
    priceId: price.id,
    livemode: price.livemode,
    amount: price.unit_amount,
    interval: price.recurring?.interval,
  });
}

console.log(JSON.stringify({ livemode, mapping }, null, 2));
