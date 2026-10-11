import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Dynamic import — named import of `betterAuth` resolves to undefined under tsx ESM
  // for this module shape; dynamic import reliably exposes the `auth` export.
  const authMod = await import("../src/lib/auth");
  const auth = authMod.auth;

  const demoEmail = "demo@kinlist.app";
  let user = await prisma.user.findUnique({ where: { email: demoEmail } });

  if (!user) {
    // Use Better Auth's API to sign up so the password hash is correct.
    const res = await auth.api.signUpEmail({
      body: { email: demoEmail, password: "password123", name: "Demo User" },
    });
    if (!res?.user) throw new Error("Sign up failed: " + JSON.stringify(res));
    user = await prisma.user.findUnique({ where: { email: demoEmail } });
  }
  if (!user) throw new Error("Could not create demo user");
  console.log("Demo user ready:", user.email);

  // Family
  let family = await prisma.family.findFirst({ where: { name: "The Demo Family" } });
  if (!family) {
    family = await prisma.family.create({
      data: {
        name: "The Demo Family",
        slug: "the-demo-family",
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
  }

  // People
  const mom = await prisma.person.upsert({
    where: { id: "demo-mom" },
    update: {},
    create: {
      id: "demo-mom",
      familyId: family.id,
      name: "Mom",
      relation: "Mom",
      birthday: new Date("1968-04-12"),
      likes: ["coffee", "books", "gardening"],
      dislikes: ["scented candles"],
      notes: "Loves a quiet morning with a good novel.",
    },
  });

  const dad = await prisma.person.upsert({
    where: { id: "demo-dad" },
    update: {},
    create: {
      id: "demo-dad",
      familyId: family.id,
      name: "Dad",
      relation: "Dad",
      birthday: new Date("1965-09-03"),
      likes: ["grilling", "golf", "tech"],
      dislikes: ["ties"],
      notes: "Always tinkering with gadgets.",
    },
  });

  const kid = await prisma.person.upsert({
    where: { id: "demo-kid" },
    update: {},
    create: {
      id: "demo-kid",
      familyId: family.id,
      name: "Jake",
      relation: "Son",
      birthday: new Date("2012-11-20"),
      likes: ["video games", "lego", "basketball"],
      dislikes: ["vegetables"],
      notes: "10 years old, into gaming and basketball.",
    },
  });

  // Occasion: Christmas 2026
  let xmas = await prisma.occasion.findFirst({ where: { familyId: family.id, name: "Christmas 2026" } });
  if (!xmas) {
    xmas = await prisma.occasion.create({
      data: {
        familyId: family.id,
        name: "Christmas 2026",
        date: new Date("2026-12-25"),
        budget: 400,
        createdById: user.id,
        people: {
          create: [
            { personId: mom.id, budget: 150 },
            { personId: dad.id, budget: 150 },
            { personId: kid.id, budget: 100 },
          ],
        },
      },
    });
  }

  // Gift ideas
  const existing = await prisma.gift.count({ where: { occasionId: xmas.id } });
  if (existing === 0) {
    await prisma.gift.createMany({
      data: [
        { personId: mom.id, occasionId: xmas.id, title: "Specialty coffee subscription (3 months)", description: "Fresh beans monthly.", price: 45, currency: "USD", source: "AI", status: "IDEA" },
        { personId: mom.id, occasionId: xmas.id, title: "Bestselling novel box set", description: "Her favourite author.", price: 35, currency: "USD", source: "MANUAL", status: "CLAIMED", purchaserId: user.id },
        { personId: dad.id, occasionId: xmas.id, title: "Portable charger (20,000 mAh)", price: 35, currency: "USD", source: "AI", status: "IDEA" },
        { personId: kid.id, occasionId: xmas.id, title: "Board game — cooperative", description: "Great for family game night.", price: 35, currency: "USD", source: "AI", status: "PURCHASED", purchaserId: user.id, purchasedAt: new Date() },
      ],
    });
  }

  console.log("Seed complete ✅");
  console.log(`  Family: ${family.name} (slug: ${family.slug})`);
  console.log(`  People: Mom, Dad, Jake`);
  console.log(`  Occasion: Christmas 2026 (budget $400)`);
  console.log(`  Login: ${demoEmail} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
