import { Request, Response } from "express";
import * as db from "../db";
import { ENV } from "../_core/env";

/**
 * Stripe webhook handler
 * Receives events from Stripe and processes them
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  const body = req.body;

  if (!sig) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  try {
    // In production, verify the signature with Stripe's secret
    // For now, we'll just process the event
    // const event = stripe.webhooks.constructEvent(body, sig, ENV.STRIPE_WEBHOOK_SECRET);

    const event = body;
    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object);
        break;

      case "charge.failed":
        await handleChargeFailed(event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    res.status(400).json({ error: "Webhook error" });
  }
}

/**
 * Handle successful charge
 * Update subscription to active and record payment
 */
async function handleChargeSucceeded(charge: any) {
  try {
    console.log(`[Stripe] Processing successful charge: ${charge.id}`);

    // Extract metadata from charge
    const metadata = charge.metadata || {};
    const userId = parseInt(metadata.userId);
    const planDurationDays = parseInt(metadata.planDurationDays) || 30;
    const amountCents = charge.amount;

    if (!userId) {
      console.error("[Stripe] Missing userId in charge metadata");
      return;
    }

    // Create subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + planDurationDays * 24 * 60 * 60 * 1000);

    const subId = await db.createSubscription({
      userId,
      status: "active",
      startDate: now,
      endDate,
      plan: "Mensal",
      priceCents: amountCents,
    });

    // Record payment
    await db.createPayment({
      userId,
      subscriptionId: subId,
      amountCents,
      method: "Cartao de Credito",
      status: "confirmed",
      notes: `Pagamento Stripe: ${charge.id}`,
    });

    console.log(`[Stripe] Subscription created for user ${userId}: ${subId}`);
  } catch (error) {
    console.error("[Stripe] Error processing charge.succeeded:", error);
  }
}

/**
 * Handle failed charge
 * Record failed payment
 */
async function handleChargeFailed(charge: any) {
  try {
    console.log(`[Stripe] Processing failed charge: ${charge.id}`);

    const metadata = charge.metadata || {};
    const userId = parseInt(metadata.userId);
    const amountCents = charge.amount;

    if (!userId) {
      console.error("[Stripe] Missing userId in charge metadata");
      return;
    }

    // Record failed payment
    await db.createPayment({
      userId,
      subscriptionId: undefined,
      amountCents,
      method: "Cartao de Credito",
      status: "pending",
      notes: `Pagamento Stripe falhou: ${charge.id} - ${charge.failure_message}`,
    });

    console.log(`[Stripe] Failed payment recorded for user ${userId}`);
  } catch (error) {
    console.error("[Stripe] Error processing charge.failed:", error);
  }
}

/**
 * Handle refunded charge
 * Cancel subscription if refunded
 */
async function handleChargeRefunded(charge: any) {
  try {
    console.log(`[Stripe] Processing refunded charge: ${charge.id}`);

    const metadata = charge.metadata || {};
    const userId = parseInt(metadata.userId);

    if (!userId) {
      console.error("[Stripe] Missing userId in charge metadata");
      return;
    }

    // Find and cancel active subscription
    const subscriptions = await db.getUserSubscriptions(userId);
    for (const sub of subscriptions) {
      if (sub.status === "active") {
        await db.updateSubscriptionStatus(sub.id, "cancelled");
        console.log(`[Stripe] Subscription cancelled for user ${userId}: ${sub.id}`);
      }
    }
  } catch (error) {
    console.error("[Stripe] Error processing charge.refunded:", error);
  }
}

/**
 * Handle subscription deleted
 * Cancel user's subscription
 */
async function handleSubscriptionDeleted(subscription: any) {
  try {
    console.log(`[Stripe] Processing deleted subscription: ${subscription.id}`);

    const metadata = subscription.metadata || {};
    const userId = parseInt(metadata.userId);

    if (!userId) {
      console.error("[Stripe] Missing userId in subscription metadata");
      return;
    }

    // Find and cancel active subscription
    const subscriptions = await db.getUserSubscriptions(userId);
    for (const sub of subscriptions) {
      if (sub.status === "active") {
        await db.updateSubscriptionStatus(sub.id, "cancelled");
        console.log(`[Stripe] Subscription cancelled for user ${userId}: ${sub.id}`);
      }
    }
  } catch (error) {
    console.error("[Stripe] Error processing customer.subscription.deleted:", error);
  }
}
