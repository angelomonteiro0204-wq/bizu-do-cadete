import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with subscription fields for access control.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Subscriptions table - tracks user subscription status.
 * Admin creates/manages subscriptions. Access is blocked when subscription expires.
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to users.id */
  userId: int("userId").notNull(),
  /** Subscription status */
  status: mysqlEnum("status", ["active", "expired", "cancelled", "pending"]).default("pending").notNull(),
  /** When the current subscription period started */
  startDate: timestamp("startDate").notNull(),
  /** When the current subscription period ends - access blocked after this date */
  endDate: timestamp("endDate").notNull(),
  /** Plan description (e.g., "Mensal", "Trimestral", "Semestral") */
  plan: varchar("plan", { length: 100 }).default("Mensal").notNull(),
  /** Price in BRL cents (e.g., 2990 = R$ 29,90) */
  priceCents: int("priceCents").default(0).notNull(),
  /** Admin notes about this subscription */
  notes: text("notes"),
  /** Whether auto-renewal is enabled */
  autoRenew: boolean("autoRenew").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Payment history - tracks all payments for audit trail.
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to users.id */
  userId: int("userId").notNull(),
  /** Reference to subscriptions.id */
  subscriptionId: int("subscriptionId"),
  /** Amount in BRL cents */
  amountCents: int("amountCents").notNull(),
  /** Payment method description */
  method: varchar("method", { length: 100 }),
  /** Payment status */
  status: mysqlEnum("status", ["confirmed", "pending", "refunded"]).default("confirmed").notNull(),
  /** Admin notes */
  notes: text("notes"),
  /** Date payment was received */
  paidAt: timestamp("paidAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
