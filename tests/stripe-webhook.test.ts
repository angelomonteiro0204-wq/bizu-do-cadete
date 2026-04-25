import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleStripeWebhook } from "../server/webhooks/stripe";
import * as db from "../server/db";

// Mock database functions
vi.mock("../server/db", () => ({
  createSubscription: vi.fn(),
  createPayment: vi.fn(),
  getUserSubscriptions: vi.fn(),
  updateSubscriptionStatus: vi.fn(),
}));

describe("Stripe Webhook Handler", () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = {
      headers: {
        "stripe-signature": "test-signature",
      },
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  it("should reject requests without stripe-signature header", async () => {
    mockReq.headers["stripe-signature"] = undefined;

    await handleStripeWebhook(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("stripe-signature"),
      })
    );
  });

  it("should handle charge.succeeded event", async () => {
    const chargeEvent = {
      type: "charge.succeeded",
      data: {
        object: {
          id: "ch_test_123",
          amount: 9900,
          metadata: {
            userId: "1",
            planDurationDays: "30",
          },
        },
      },
    };

    mockReq.body = chargeEvent;
    vi.mocked(db.createSubscription).mockResolvedValue(1);
    vi.mocked(db.createPayment).mockResolvedValue(1);

    await handleStripeWebhook(mockReq, mockRes);

    expect(db.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        status: "active",
        priceCents: 9900,
      })
    );

    expect(db.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        amountCents: 9900,
        method: "Cartao de Credito",
        status: "confirmed",
      })
    );

    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it("should handle charge.failed event", async () => {
    const failedEvent = {
      type: "charge.failed",
      data: {
        object: {
          id: "ch_test_failed",
          amount: 9900,
          failure_message: "Card declined",
          metadata: {
            userId: "1",
          },
        },
      },
    };

    mockReq.body = failedEvent;
    vi.mocked(db.createPayment).mockResolvedValue(1);

    await handleStripeWebhook(mockReq, mockRes);

    expect(db.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        status: "pending",
        notes: expect.stringContaining("falhou"),
      })
    );

    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it("should handle charge.refunded event", async () => {
    const refundEvent = {
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test_refunded",
          metadata: {
            userId: "1",
          },
        },
      },
    };

    mockReq.body = refundEvent;
    vi.mocked(db.getUserSubscriptions).mockResolvedValue([
      {
        id: 1,
        userId: 1,
        status: "active" as const,
        plan: "Mensal",
        startDate: new Date(),
        endDate: new Date(),
        priceCents: 9900,
        autoRenew: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(db.updateSubscriptionStatus).mockResolvedValue(undefined);

    await handleStripeWebhook(mockReq, mockRes);

    expect(db.updateSubscriptionStatus).toHaveBeenCalledWith(1, "cancelled");
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it("should handle customer.subscription.deleted event", async () => {
    const deleteEvent = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test_deleted",
          metadata: {
            userId: "1",
          },
        },
      },
    };

    mockReq.body = deleteEvent;
    vi.mocked(db.getUserSubscriptions).mockResolvedValue([
      {
        id: 1,
        userId: 1,
        status: "active" as const,
        plan: "Mensal",
        startDate: new Date(),
        endDate: new Date(),
        priceCents: 9900,
        autoRenew: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(db.updateSubscriptionStatus).mockResolvedValue(undefined);

    await handleStripeWebhook(mockReq, mockRes);

    expect(db.updateSubscriptionStatus).toHaveBeenCalledWith(1, "cancelled");
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it("should handle unknown event types gracefully", async () => {
    const unknownEvent = {
      type: "payment_intent.created",
      data: {
        object: {},
      },
    };

    mockReq.body = unknownEvent;

    await handleStripeWebhook(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it("should handle missing userId in metadata", async () => {
    const chargeEvent = {
      type: "charge.succeeded",
      data: {
        object: {
          id: "ch_test_no_user",
          amount: 9900,
          metadata: {},
        },
      },
    };

    mockReq.body = chargeEvent;

    await handleStripeWebhook(mockReq, mockRes);

    expect(db.createSubscription).not.toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });
});
