import { createClient, createDatabase } from "monarch-orm";
import { schemas } from "./schemas";

async function main() {
  const client = createClient("mongodb://localhost:27017/monarch", {});

  try {
    // Connect to the configured local example database.
    await client.connect();

    const nativeDb = client.db();

    // Start from a clean slate by dropping every existing collection.
    const existingCollections = createDatabase(nativeDb, schemas, { initialize: false }).listCollections();

    for (const collection of existingCollections) {
      await nativeDb
        .collection(collection)
        .drop()
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.includes("ns not found")) throw error;
        });
    }

    // Recreate the Monarch-backed database so validation and transforms are active.
    const db = createDatabase(nativeDb, schemas);
    await db.isReady;

    // Seed the base users in parallel because the rest of the demo data references them.
    const [ada, malik, sora] = await Promise.all([
      db.collections.users.insertOne({
        name: "Ada Lovelace",
        email: "ada@monarch.dev",
        password: "ada-lovelace-demo-password",
        role: "admin",
        isActive: true,
        lastLoginAt: new Date("2026-04-05T09:30:00.000Z"),
        profile: {
          bio: "Designs data-heavy product workflows and keeps a sharp eye on schema quality.",
          title: "Staff Engineer",
          timezone: "Europe/London",
          location: {
            country: "United Kingdom",
            city: "London",
            coordinates: [51.5072, -0.1276],
          },
          socialLinks: {
            github: "ada-lovelace",
            website: "https://monarch.dev/team/ada",
          },
        },
        preferences: {
          theme: "system",
          locale: "en-GB",
          emailNotifications: true,
          dashboardWidgets: ["recent-activity", "project-health", "orders"],
        },
      }),
      db.collections.users.insertOne({
        name: "Malik Johnson",
        email: "malik@monarch.dev",
        password: "malik-johnson-demo-password",
        role: "member",
        isActive: true,
        lastLoginAt: new Date("2026-04-06T07:15:00.000Z"),
        profile: {
          bio: "Owns delivery ops, support escalations, and launch readiness.",
          title: "Operations Lead",
          timezone: "America/New_York",
          location: {
            country: "United States",
            city: "New York",
            coordinates: [40.7128, -74.006],
          },
          socialLinks: {
            linkedin: "malik-johnson",
          },
        },
        preferences: {
          theme: "light",
          locale: "en-US",
          emailNotifications: true,
          dashboardWidgets: ["orders", "deployments"],
        },
      }),
      db.collections.users.insertOne({
        name: "Sora Tanaka",
        email: "sora@monarch.dev",
        password: "sora-tanaka-demo-password",
        role: 2,
        isActive: false,
        lastLoginAt: null,
        profile: {
          bio: "Experiments with internal tooling, prototypes, and AI-assisted authoring flows.",
          title: "Prototype Engineer",
          timezone: "Asia/Tokyo",
          location: {
            country: "Japan",
            city: "Tokyo",
            coordinates: [35.6764, 139.65],
          },
          socialLinks: {
            x: "@sora_builds",
            github: "sora-tanaka",
          },
        },
        preferences: {
          theme: "dark",
          locale: "ja-JP",
          emailNotifications: false,
          dashboardWidgets: ["recent-activity", "experiments"],
        },
      }),
    ]);

    // Seed projects after users so owner and collaborator references are valid.
    await db.collections.projects.insertMany([
      {
        name: "Studio Relaunch",
        slug: "studio-relaunch",
        ownerId: ada._id,
        collaboratorIds: [malik._id, sora._id],
        status: "active",
        tags: ["ui", "studio", "priority"],
        metadata: {
          repositoryUrl: "https://github.com/monarch-orm/monarch-kit",
          deploymentUrl: "https://studio.monarch.dev",
          customDomain: "studio.monarch.dev",
          featureFlags: {
            inlineEditing: true,
            nestedDialogs: true,
            exportCsv: false,
          },
        },
        milestones: [
          {
            name: "Schema-driven editor",
            dueAt: new Date("2026-04-10T00:00:00.000Z"),
            completed: true,
            ownerId: ada._id,
          },
          {
            name: "Seed realistic demo data",
            dueAt: new Date("2026-04-12T00:00:00.000Z"),
            completed: false,
            ownerId: sora._id,
          },
        ],
        audit: {
          createdAt: new Date("2026-03-28T10:00:00.000Z"),
          updatedAt: new Date("2026-04-06T08:00:00.000Z"),
          archivedAt: null,
        },
      },
      {
        name: "Operations Console",
        slug: "operations-console",
        ownerId: malik._id,
        collaboratorIds: [ada._id],
        status: "draft",
        tags: ["ops", "internal"],
        metadata: {
          repositoryUrl: "https://github.com/monarch-orm/operations-console",
          deploymentUrl: undefined,
          customDomain: null,
          featureFlags: {
            incidentTimeline: true,
            pagerdutySync: false,
          },
        },
        milestones: [
          {
            name: "Support queue sync",
            dueAt: new Date("2026-04-18T00:00:00.000Z"),
            completed: false,
            ownerId: malik._id,
          },
        ],
        audit: {
          createdAt: new Date("2026-04-01T09:30:00.000Z"),
          updatedAt: new Date("2026-04-05T17:20:00.000Z"),
          archivedAt: null,
        },
      },
    ]);

    // Seed orders after users so customer references point to real documents.
    await db.collections.orders.insertMany([
      {
        orderNumber: "6f0a8b7b-5cd4-4f9e-98f2-d9ac7a2cb101",
        customerId: malik._id,
        status: "paid",
        currency: "USD",
        lineItems: [
          {
            sku: "STUDIO-PRO",
            title: "Monarch Studio Pro",
            quantity: 1,
            unitPrice: 249,
            attributes: {
              billingCycle: "annual",
              supportTier: "priority",
            },
          },
          {
            sku: "ONBOARDING",
            title: "Guided Onboarding",
            quantity: 2,
            unitPrice: 75,
            attributes: {
              duration: "90m",
            },
          },
        ],
        shippingAddress: {
          name: "Malik Johnson",
          line1: "150 W 28th St",
          line2: "Floor 12",
          city: "New York",
          region: "NY",
          postalCode: "10001",
          country: "US",
        },
        payment: {
          provider: "stripe",
          transactionId: "pi_demo_paid_001",
          paidAt: new Date("2026-04-04T13:45:00.000Z"),
          amountCaptured: 399,
        },
        notes: ["Customer requested white-glove onboarding", "Provision workspace before April 9"],
      },
      {
        orderNumber: "5b0b8afb-b69e-42c1-9b5d-4bb20f7f0124",
        customerId: sora._id,
        status: "pending",
        currency: "USD",
        lineItems: [
          {
            sku: "AI-LABS",
            title: "AI Labs Access",
            quantity: 1,
            unitPrice: 99,
            attributes: {
              environment: "sandbox",
            },
          },
        ],
        shippingAddress: {
          name: "Sora Tanaka",
          line1: "2-8-1 Nishishinjuku",
          line2: "Suite 2104",
          city: "Tokyo",
          region: "Tokyo",
          postalCode: "163-8001",
          country: "JP",
        },
        payment: {
          provider: "stripe",
          transactionId: undefined,
          paidAt: null,
          amountCaptured: 0,
        },
        notes: "Awaiting finance approval before capture.",
      },
    ]);

    // Seed timeline events last so they can reference the inserted users and seeded activity.
    await db.collections.events.insertMany([
      {
        type: "user.login",
        actorId: ada._id,
        occurredAt: new Date("2026-04-06T08:30:00.000Z"),
        source: {
          app: "studio",
          version: "2.1.0",
          ipAddress: "203.0.113.10",
        },
        payload: {
          summary: "Ada signed into the studio dashboard.",
          changes: {
            success: true,
            method: "password",
          },
          attachments: [],
        },
      },
      {
        type: "project.updated",
        actorId: sora._id,
        occurredAt: new Date("2026-04-06T10:05:00.000Z"),
        source: {
          app: "studio",
          version: "2.1.0",
          ipAddress: "198.51.100.24",
        },
        payload: {
          summary: "Updated milestone metadata for Studio Relaunch.",
          changes: {
            field: "milestones",
            previousCount: 1,
            nextCount: 2,
          },
          attachments: [
            {
              name: "milestone-plan.pdf",
              size: 218304,
              mimeType: "application/pdf",
            },
          ],
        },
      },
      {
        type: "order.payment_pending",
        actorId: malik._id,
        occurredAt: new Date("2026-04-06T11:20:00.000Z"),
        source: {
          app: "ops-console",
          version: "0.9.0",
          ipAddress: "192.0.2.42",
        },
        payload: {
          summary: "Flagged order for manual finance review.",
          changes: {
            orderStatus: "pending",
            requiresReview: true,
          },
          attachments: [],
        },
      },
    ]);

    // Seed a larger log stream so the studio has enough rows to exercise pagination.
    await db.collections.logs.insertMany(
      Array.from({ length: 200 }, (_, index) => ({
        level: index % 10 === 0 ? "error" : index % 3 === 0 ? "warn" : "info",
        message: `Log entry ${index + 1} processed for studio pagination demo.`,
        source: index % 2 === 0 ? "studio" : "worker",
        createdAt: new Date(Date.UTC(2026, 3, 6, 12, 0, index)),
      })),
    );

    console.log("Seeded collections: ", Object.keys(schemas.schemas));
  } finally {
    // Always close the Mongo client, even if seeding fails midway through.
    await client.close();
  }
}

// Run the seed script as a standalone entrypoint.
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
