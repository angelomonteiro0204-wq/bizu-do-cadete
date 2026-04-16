import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertSubscription, subscriptions,
  InsertPayment, payments,
  type Subscription,
  type Payment,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// =============================================
// USER QUERIES
// =============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// =============================================
// SUBSCRIPTION QUERIES
// =============================================

/** Get active subscription for a user (endDate >= now AND status = active) */
export async function getActiveSubscription(userId: number): Promise<Subscription | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const result = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gte(subscriptions.endDate, now)
      )
    )
    .orderBy(desc(subscriptions.endDate))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/** Get all subscriptions for a user */
export async function getUserSubscriptions(userId: number): Promise<Subscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));
}

/** Get all subscriptions (admin) */
export async function getAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

/** Create a new subscription */
export async function createSubscription(data: InsertSubscription): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptions).values(data);
  return Number(result[0].insertId);
}

/** Update subscription status */
export async function updateSubscriptionStatus(subId: number, status: "active" | "expired" | "cancelled" | "pending") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set({ status }).where(eq(subscriptions.id, subId));
}

/** Expire all overdue active subscriptions (auto-block by delinquency) */
export async function expireOverdueSubscriptions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const result = await db
    .update(subscriptions)
    .set({ status: "expired" })
    .where(
      and(
        eq(subscriptions.status, "active"),
        lte(subscriptions.endDate, now)
      )
    );

  return result[0].affectedRows ?? 0;
}

/** Renew/extend a subscription by N days */
export async function renewSubscription(subId: number, days: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sub = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
  if (sub.length === 0) throw new Error("Assinatura não encontrada");

  const currentEnd = new Date(sub[0].endDate);
  const now = new Date();
  const baseDate = currentEnd > now ? currentEnd : now;
  const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  await db
    .update(subscriptions)
    .set({ endDate: newEnd, status: "active", startDate: now })
    .where(eq(subscriptions.id, subId));

  return { newEndDate: newEnd.toISOString() };
}

// =============================================
// PAYMENT QUERIES
// =============================================

/** Record a payment */
export async function createPayment(data: InsertPayment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values(data);
  return Number(result[0].insertId);
}

/** Get payments for a user */
export async function getUserPayments(userId: number): Promise<Payment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.paidAt));
}

/** Get all payments (admin) */
export async function getAllPayments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.paidAt));
}

/** Get dashboard stats for admin */
export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, activeSubscriptions: 0, expiredSubscriptions: 0, totalRevenue: 0 };

  const now = new Date();

  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [activeSubs] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, "active"), gte(subscriptions.endDate, now)));
  const [expiredSubs] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "expired"));
  const [revenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(amountCents), 0)` })
    .from(payments)
    .where(eq(payments.status, "confirmed"));

  return {
    totalUsers: userCount.count,
    activeSubscriptions: activeSubs.count,
    expiredSubscriptions: expiredSubs.count,
    totalRevenue: revenue.total,
  };
}
