import type { CourseLevel, OrderStatus } from "@/api";
import { toPersianDigits } from "./format";

export const courseLevelLabels: Record<CourseLevel, string> = {
  beginner: "مقدماتی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  awaiting_payment: "در انتظار پرداخت",
  paid: "در انتظار لایسنس",
  delivered: "لایسنس تحویل شد",
  canceled: "لغو شده",
};

export function formatAgeRange(min: number, max: number): string {
  return `${toPersianDigits(min)} تا ${toPersianDigits(max)} سال`;
}

export function formatWeeks(weeks: number): string {
  return `${toPersianDigits(weeks)} هفته`;
}

export function formatSessions(sessions: number): string {
  return `${toPersianDigits(sessions)} جلسه`;
}

export function formatOrderNumber(number: number): string {
  return `سفارش ${toPersianDigits(number)}`;
}
