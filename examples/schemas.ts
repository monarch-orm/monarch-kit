import { createSchema, defineSchemas } from "monarch-orm";
import { array, boolean, date, number, object, objectId, record, string, tuple, union, uuid } from "monarch-orm/types";

const users = createSchema("users", {
  name: string().trim().nonempty(),
  email: string().trim().lowercase().nonempty(),
  password: string().minLength(12),
  role: union(string(), number()).default("member"),
  isActive: boolean().default(true),
  lastLoginAt: date().nullable().optional(),
  profile: object({
    bio: string().trim().maxLength(280).optional(),
    title: string().trim().optional(),
    timezone: string().default("UTC"),
    location: object({
      country: string().trim().nonempty(),
      city: string().trim().nonempty(),
      coordinates: tuple([number(), number()]).optional(),
    }).optional(),
    socialLinks: record(string()).default({}),
  }),
  preferences: object({
    theme: string().default("system"),
    locale: string().default("en-US"),
    emailNotifications: boolean().default(true),
    dashboardWidgets: array(string()).default([]),
  }).default({}),
}).omit({ password: true });

const projects = createSchema("projects", {
  name: string().trim().nonempty(),
  slug: string().trim().lowercase().nonempty(),
  ownerId: objectId(),
  collaboratorIds: array(objectId()).default([]),
  status: string().default("draft"),
  tags: array(string().trim().nonempty()).default([]),
  metadata: object({
    repositoryUrl: string().optional(),
    deploymentUrl: string().optional(),
    customDomain: string().nullable().optional(),
    featureFlags: record(boolean()).default({}),
  }),
  milestones: array(
    object({
      name: string().trim().nonempty(),
      dueAt: date().optional(),
      completed: boolean().default(false),
      ownerId: objectId().optional(),
    }),
  ).default([]),
  audit: object({
    createdAt: date(),
    updatedAt: date(),
    archivedAt: date().nullable().optional(),
  }),
});

const orders = createSchema("orders", {
  orderNumber: uuid(),
  customerId: objectId(),
  status: string().default("pending"),
  currency: string().default("USD"),
  lineItems: array(
    object({
      sku: string().trim().nonempty(),
      title: string().trim().nonempty(),
      quantity: number().integer().min(1),
      unitPrice: number().min(0),
      attributes: record(string()).default({}),
    }),
  ),
  shippingAddress: object({
    name: string().trim().nonempty(),
    line1: string().trim().nonempty(),
    line2: string().trim().optional(),
    city: string().trim().nonempty(),
    region: string().trim().nonempty(),
    postalCode: string().trim().nonempty(),
    country: string().trim().uppercase().length(2),
  }),
  payment: object({
    provider: string().default("stripe"),
    transactionId: string().optional(),
    paidAt: date().nullable().optional(),
    amountCaptured: number().min(0).default(0),
  }),
  notes: union(string(), array(string())).optional(),
});

const events = createSchema("events", {
  type: string().trim().nonempty(),
  actorId: objectId().optional(),
  sessionId: uuid().optional(),
  occurredAt: date(),
  source: object({
    app: string().default("studio"),
    version: string().optional(),
    ipAddress: string().optional(),
  }),
  payload: object({
    summary: string().optional(),
    changes: record(union(string(), number(), boolean())).default({}),
    attachments: array(
      object({
        name: string().trim().nonempty(),
        size: number().integer().min(0),
        mimeType: string().trim().nonempty(),
      }),
    ).default([]),
  }),
});

const logs = createSchema("logs", {
  level: string().trim().nonempty(),
  message: string().trim().nonempty(),
  source: string().trim().nonempty(),
  createdAt: date(),
});

export const schemas = defineSchemas({
  users,
  projects,
  orders,
  events,
  logs,
});
