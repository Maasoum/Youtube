/** تنظیمات مشترک جریان خرید؛ در نسخه‌ی واقعی از سرور می‌آید. */
export const purchaseConfig = {
  /** حداکثر زمان تحویل لایسنس پس از پرداخت (ساعت کاری). */
  licenseDeliveryHours: 24,
  /** مهلت بازگشت وجه پس از تحویل لایسنس (روز). */
  refundDays: 7,
  /** SLA صف تحویل لایسنس؛ عبور از این تعداد ساعت هشدار دیرکرد می‌سازد. */
  fulfillmentSlaHours: 24,
  /** هر سفارش: یک دوره و حداکثر یک کد تخفیف. */
  maxCoursesPerOrder: 1,
  maxDiscountCodesPerOrder: 1,
} as const;
