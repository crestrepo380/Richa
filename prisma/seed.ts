/**
 * Development seed. Creates a small but realistic dataset so the dashboards,
 * reports, and the replenishment maths can be exercised without waiting for
 * real dealers to submit anything.
 *
 * Idempotent — safe to re-run. Uses upserts keyed on natural keys (sku, email).
 *
 * Run: npm run db:seed
 *
 * Note: this seeds *business* data only. Login accounts live in Supabase's
 * auth.users table; create them in the Supabase dashboard (or via the invite
 * flow) and the trigger in supabase/sql/001_profiles_trigger.sql will attach a
 * profile. To link a dealer login, set the user's metadata `dealer_id` to the
 * matching dealer id printed at the end of this script.
 */
import { PrismaClient, type ProductCategory } from "@prisma/client";
import { deriveInventory } from "../src/lib/business/inventory";
import { getWeekStart, addWeeks } from "../src/lib/week";

const prisma = new PrismaClient();

const PRODUCTS: Array<{
  sku: string;
  productNumber: string;
  description: string;
  color: string;
  size: string;
  category: ProductCategory;
}> = [
  { sku: "RCH-JKT-001-BLK-M", productNumber: "RCH-JKT-001", description: "Airvent Mesh Riding Jacket", color: "Black", size: "M", category: "APPAREL" },
  { sku: "RCH-JKT-001-BLK-L", productNumber: "RCH-JKT-001", description: "Airvent Mesh Riding Jacket", color: "Black", size: "L", category: "APPAREL" },
  { sku: "RCH-JKT-002-RED-L", productNumber: "RCH-JKT-002", description: "Tourer Waterproof Jacket", color: "Red", size: "L", category: "APPAREL" },
  { sku: "RCH-GLV-010-BLK-M", productNumber: "RCH-GLV-010", description: "Summer Vent Gloves", color: "Black", size: "M", category: "ACCESSORIES" },
  { sku: "RCH-GLV-010-GRY-L", productNumber: "RCH-GLV-010", description: "Summer Vent Gloves", color: "Grey", size: "L", category: "ACCESSORIES" },
  { sku: "RCH-HLM-020-WHT-L", productNumber: "RCH-HLM-020", description: "Full Face Helmet Pro", color: "White", size: "L", category: "HELMETS" },
  { sku: "RCH-HLM-020-BLK-XL", productNumber: "RCH-HLM-020", description: "Full Face Helmet Pro", color: "Black", size: "XL", category: "HELMETS" },
  { sku: "RCH-BRK-030-STD", productNumber: "RCH-BRK-030", description: "Sintered Brake Pad Set", color: null as unknown as string, size: "STD", category: "PARTS" },
];

const DEALERS = [
  { company: "Ridgeline Motorsports", contactName: "Richard Alvarez", email: "richard@ridgelinemoto.test", phone: "+1-555-0142" },
  { company: "Coastal Cycle Co.", contactName: "Dana Whitfield", email: "dana@coastalcycle.test", phone: "+1-555-0188" },
  { company: "Summit Powersports", contactName: "Marcus Lee", email: "marcus@summitpower.test", phone: "+1-555-0231" },
];

/** Deterministic pseudo-random so repeated seeds produce stable numbers. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10_000;
  return x - Math.floor(x);
}

async function main() {
  console.log("Seeding products…");
  const products = await Promise.all(
    PRODUCTS.map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: { description: p.description, category: p.category },
        create: p,
      }),
    ),
  );

  console.log("Seeding dealers…");
  const dealers = await Promise.all(
    DEALERS.map((d) =>
      prisma.dealer.upsert({
        where: { email: d.email },
        update: { company: d.company, contactName: d.contactName },
        create: d,
      }),
    ),
  );

  console.log("Seeding dealer inventory…");
  let seedCounter = 1;
  for (const dealer of dealers) {
    for (const product of products) {
      const originalQuantity = 6 + Math.floor(pseudoRandom(seedCounter++) * 15);
      const currentOnHand = Math.floor(
        originalQuantity * pseudoRandom(seedCounter++),
      );
      const derived = deriveInventory({ originalQuantity, currentOnHand });

      await prisma.dealerInventory.upsert({
        where: {
          dealerId_productId: { dealerId: dealer.id, productId: product.id },
        },
        update: derived,
        create: { dealerId: dealer.id, productId: product.id, ...derived },
      });
    }
  }

  console.log("Seeding weekly reports…");
  const currentWeek = getWeekStart();

  // Two weeks of submitted history plus the open current week, so charts and
  // the "pending vs submitted" dashboard split both have something to show.
  for (const [index, dealer] of dealers.entries()) {
    for (const weeksAgo of [2, 1]) {
      const week = addWeeks(currentWeek, -weeksAgo);
      await prisma.weeklyReport.upsert({
        where: { dealerId_week: { dealerId: dealer.id, week } },
        update: {},
        create: {
          dealerId: dealer.id,
          week,
          status: "SUBMITTED",
          submitted: true,
          submittedAt: new Date(week.getTime() + 2 * 86_400_000),
        },
      });
    }

    // Leave the last dealer unsubmitted for the current week.
    const submitted = index < dealers.length - 1;
    await prisma.weeklyReport.upsert({
      where: { dealerId_week: { dealerId: dealer.id, week: currentWeek } },
      update: {},
      create: {
        dealerId: dealer.id,
        week: currentWeek,
        status: submitted ? "SUBMITTED" : "PENDING",
        submitted,
        submittedAt: submitted ? new Date() : null,
      },
    });
  }

  console.log("Seeding email templates…");
  await prisma.emailTemplate.upsert({
    where: { name: "weekly_reminder" },
    update: {},
    create: {
      name: "weekly_reminder",
      subject: "Weekly Inventory Reminder",
      body: [
        "Hello {{dealer_name}},",
        "",
        "Please update your inventory for the week of {{week}}.",
        "",
        "{{update_button}}",
        "",
        "It takes about two minutes — just tell us how many units you have on hand.",
      ].join("\n"),
      variables: ["dealer_name", "week", "update_button"],
    },
  });

  console.log("\nSeed complete.\n");
  console.log("Dealer ids (use as `dealer_id` in a Supabase user's metadata):");
  for (const dealer of dealers) {
    console.log(`  ${dealer.company.padEnd(24)} ${dealer.id}  ${dealer.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
