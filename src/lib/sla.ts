import { purchaseConfig } from "@/config/purchase";
import type { Order } from "@/api";
import { toPersianDigits } from "./format";

/** ساعت‌های سپری‌شده از لنگر زمانی سفارش (پرداخت یا ثبت). */
export function hoursSince(value: string, now = Date.now()): number {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, (now - timestamp) / (60 * 60 * 1000));
}

export function orderQueueAnchor(order: Order): string {
  return order.paidAt ?? order.createdAt;
}

export function isQueueOverdue(
  order: Order,
  now = Date.now(),
  slaHours: number = purchaseConfig.fulfillmentSlaHours,
): boolean {
  if (order.status !== "awaiting_license" && order.status !== "on_hold") {
    return false;
  }
  return hoursSince(orderQueueAnchor(order), now) > slaHours;
}

export function formatElapsed(hours: number): string {
  if (hours < 1) {
    return `${toPersianDigits(Math.max(1, Math.round(hours * 60)))} دقیقه`;
  }
  if (hours < 24) {
    return `${toPersianDigits(Math.round(hours))} ساعت`;
  }
  const days = Math.floor(hours / 24);
  const remaining = Math.round(hours % 24);
  return remaining > 0
    ? `${toPersianDigits(days)} روز و ${toPersianDigits(remaining)} ساعت`
    : `${toPersianDigits(days)} روز`;
}

export function formatSlaRemaining(
  order: Order,
  now = Date.now(),
  slaHours: number = purchaseConfig.fulfillmentSlaHours,
): string {
  const elapsed = hoursSince(orderQueueAnchor(order), now);
  const remaining = slaHours - elapsed;
  if (remaining <= 0) {
    return `${formatElapsed(Math.abs(remaining))} از SLA گذشته`;
  }
  return `${formatElapsed(remaining)} تا پایان SLA`;
}
