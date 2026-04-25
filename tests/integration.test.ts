import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "../server/db";

/**
 * Integration tests for main user flows
 * These tests verify that different parts of the system work together
 */
describe("Integration Tests - User Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Authentication Flow", () => {
    it("should create user on first login", async () => {
      const newUser = {
        openId: "google_123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "google" as const,
      };

      // Simulate user creation
      await db.upsertUser(newUser);

      // Verify user can be retrieved
      const user = await db.getUserByOpenId("google_123");
      expect(user).toBeDefined();
      expect(user?.email).toBe("test@example.com");
    });

    it("should not create duplicate users on multiple logins", async () => {
      const user = {
        openId: "google_456",
        name: "Test User 2",
        email: "test2@example.com",
        loginMethod: "google" as const,
      };

      await db.upsertUser(user);
      await db.upsertUser(user);

      const allUsers = await db.getAllUsers();
      const testUsers = allUsers.filter((u) => u.openId === "google_456");
      expect(testUsers.length).toBe(1);
    });
  });

  describe("Subscription Management Flow", () => {
    it("should create subscription and record payment", async () => {
      // Create user
      const user = {
        openId: "google_789",
        name: "Subscriber",
        email: "subscriber@example.com",
        loginMethod: "google" as const,
      };
      await db.upsertUser(user);
      const createdUser = await db.getUserByOpenId("google_789");
      if (!createdUser) throw new Error("User not created");

      // Create subscription
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const subId = await db.createSubscription({
        userId: createdUser.id,
        status: "active",
        startDate: now,
        endDate,
        plan: "Mensal",
        priceCents: 9900,
      });

      expect(subId).toBeGreaterThan(0);

      // Record payment
      const paymentId = await db.createPayment({
        userId: createdUser.id,
        subscriptionId: subId,
        amountCents: 9900,
        method: "Cartao de Credito",
        status: "confirmed",
        notes: "Test payment",
      });

      expect(paymentId).toBeGreaterThan(0);

      // Verify subscription is active
      const activeSub = await db.getActiveSubscription(createdUser.id);
      expect(activeSub).toBeDefined();
      expect(activeSub?.status).toBe("active");

      // Verify payment is recorded
      const payments = await db.getUserPayments(createdUser.id);
      expect(payments.length).toBeGreaterThan(0);
      expect(payments[0]?.status).toBe("confirmed");
    });

    it("should expire overdue subscriptions", async () => {
      // Create user
      const user = {
        openId: "google_expired",
        name: "Expired User",
        email: "expired@example.com",
        loginMethod: "google" as const,
      };
      await db.upsertUser(user);
      const createdUser = await db.getUserByOpenId("google_expired");
      if (!createdUser) throw new Error("User not created");

      // Create subscription that expired yesterday
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await db.createSubscription({
        userId: createdUser.id,
        status: "active",
        startDate: new Date(yesterday.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: yesterday,
        plan: "Mensal",
        priceCents: 9900,
      });

      // Expire overdue subscriptions
      const expiredCount = await db.expireOverdueSubscriptions();
      expect(expiredCount).toBeGreaterThanOrEqual(0);

      // Verify subscription is expired
      const activeSub = await db.getActiveSubscription(createdUser.id);
      expect(activeSub).toBeNull();
    });

    it("should cancel subscription", async () => {
      // Create user with active subscription
      const user = {
        openId: "google_cancel",
        name: "Cancel User",
        email: "cancel@example.com",
        loginMethod: "google" as const,
      };
      await db.upsertUser(user);
      const createdUser = await db.getUserByOpenId("google_cancel");
      if (!createdUser) throw new Error("User not created");

      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const subId = await db.createSubscription({
        userId: createdUser.id,
        status: "active",
        startDate: now,
        endDate,
        plan: "Mensal",
        priceCents: 9900,
      });

      // Cancel subscription
      await db.updateSubscriptionStatus(subId, "cancelled");

      // Verify subscription is cancelled
      const activeSub = await db.getActiveSubscription(createdUser.id);
      expect(activeSub).toBeNull();

      const allSubs = await db.getUserSubscriptions(createdUser.id);
      const cancelledSub = allSubs.find((s) => s.id === subId);
      expect(cancelledSub?.status).toBe("cancelled");
    });
  });

  describe("Admin Statistics", () => {
    it("should calculate admin statistics correctly", async () => {
      const stats = await db.getAdminStats();

      expect(stats).toHaveProperty("totalUsers");
      expect(stats).toHaveProperty("activeSubscriptions");
      expect(stats).toHaveProperty("expiredSubscriptions");
      expect(stats).toHaveProperty("totalRevenue");

      const totalUsers = typeof stats.totalUsers === "string" ? parseInt(stats.totalUsers) : stats.totalUsers;
      const activeSubscriptions = typeof stats.activeSubscriptions === "string" ? parseInt(stats.activeSubscriptions) : stats.activeSubscriptions;
      const expiredSubscriptions = typeof stats.expiredSubscriptions === "string" ? parseInt(stats.expiredSubscriptions) : stats.expiredSubscriptions;
      const totalRevenue = typeof stats.totalRevenue === "string" ? parseInt(stats.totalRevenue) : stats.totalRevenue;

      expect(totalUsers).toBeGreaterThanOrEqual(0);
      expect(activeSubscriptions).toBeGreaterThanOrEqual(0);
      expect(expiredSubscriptions).toBeGreaterThanOrEqual(0);
      expect(totalRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Payment History", () => {
    it("should retrieve all payments", async () => {
      const allPayments = await db.getAllPayments();

      expect(Array.isArray(allPayments)).toBe(true);

      if (allPayments.length > 0) {
        const payment = allPayments[0];
        expect(payment).toHaveProperty("id");
        expect(payment).toHaveProperty("userId");
        expect(payment).toHaveProperty("amountCents");
        expect(payment).toHaveProperty("method");
        expect(payment).toHaveProperty("status");
        expect(payment).toHaveProperty("createdAt");
      }
    });
  });

  describe("User Management", () => {
    it("should list all users", async () => {
      const allUsers = await db.getAllUsers();

      expect(Array.isArray(allUsers)).toBe(true);

      if (allUsers.length > 0) {
        const user = allUsers[0];
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("openId");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("name");
      }
    });

    it("should get user by ID", async () => {
      const allUsers = await db.getAllUsers();

      if (allUsers.length > 0) {
        const firstUser = allUsers[0];
        const retrievedUser = await db.getUserById(firstUser.id);

        expect(retrievedUser).toBeDefined();
        expect(retrievedUser?.id).toBe(firstUser.id);
        expect(retrievedUser?.openId).toBe(firstUser.openId);
      }
    });
  });
});
