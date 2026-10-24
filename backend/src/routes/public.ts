import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import { contactMessages, leads } from "../db/schema.js";
import { randomToken } from "../lib/crypto.js";
import {
  DISCOUNT_GENERIC_ERROR,
  normalizeDiscountCode,
} from "../lib/discount.js";
import { notFound } from "../lib/errors.js";
import { hashIp } from "../lib/ip.js";
import {
  contactSchema,
  discountValidateSchema,
  leadSchema,
  listQuerySchema,
  parseWith,
} from "../lib/validation.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import {
  getPublicCourseById,
  getPublicCourseBySlug,
  getPublicPostBySlug,
  listPublicCourses,
  listPublicFaqs,
  listPublicPosts,
  listPublicTeachers,
} from "../services/content.js";
import { checkDiscount } from "../services/orders.js";
import { getPublicSiteSettings } from "../services/settings.js";

const LEAD_MESSAGE =
  "درخواست شما ثبت شد؛ برای هماهنگی با شما تماس می‌گیریم.";
const CONTACT_MESSAGE =
  "پیام شما ثبت شد؛ تیم مسیرهای روشن در نخستین فرصت پاسخ می‌دهد.";

/** هش IP برای محدودیت نرخ؛ مقدار خام هرگز ذخیره یا لاگ نمی‌شود. */
const hashedIpKey = (request: FastifyRequest): string => hashIp(request.ip);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** فیلد تله‌ی ربات؛ در صورت پر بودن، پاسخ موفق قلابی داده می‌شود. */
function honeypotFilled(body: unknown): boolean {
  if (!isRecord(body)) return false;
  const value = body.website;
  return typeof value === "string" && value.trim() !== "";
}

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/courses",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const query = parseWith(listQuerySchema, request.query);
      const courses = await listPublicCourses({
        q: query.q,
        limit: query.limit,
        offset: query.offset,
      });
      return reply.send({ courses });
    },
  );

  app.get(
    "/courses/:slug",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const course = await getPublicCourseBySlug(slug);
      if (!course) throw notFound("دوره پیدا نشد.", "course_not_found");
      return reply.send({ course });
    },
  );

  app.get(
    "/blog",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const query = parseWith(listQuerySchema, request.query);
      const posts = await listPublicPosts({
        q: query.q,
        limit: query.limit,
        offset: query.offset,
      });
      return reply.send({ posts });
    },
  );

  app.get(
    "/blog/:slug",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const post = await getPublicPostBySlug(slug);
      if (!post) throw notFound("نوشته پیدا نشد.", "post_not_found");
      return reply.send({ post });
    },
  );

  app.get(
    "/faqs",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (_request, reply) => {
      return reply.send({ faqs: await listPublicFaqs() });
    },
  );

  app.get(
    "/site-settings",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (_request, reply) => {
      return reply.send({ settings: await getPublicSiteSettings() });
    },
  );

  app.get(
    "/teachers",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (_request, reply) => {
      return reply.send({ teachers: await listPublicTeachers() });
    },
  );

  app.post(
    "/leads",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "10 minutes",
          keyGenerator: hashedIpKey,
        },
      },
    },
    async (request, reply) => {
      if (honeypotFilled(request.body)) {
        return reply
          .code(201)
          .send({ id: randomToken(8), message: LEAD_MESSAGE });
      }

      const input = parseWith(leadSchema, request.body);

      const [row] = await db
        .insert(leads)
        .values({
          fullName: input.fullName,
          contact: input.contact,
          source: "site",
        })
        .returning({ id: leads.id });

      return reply.code(201).send({ id: row?.id ?? "", message: LEAD_MESSAGE });
    },
  );

  app.post(
    "/contact",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "10 minutes",
          keyGenerator: hashedIpKey,
        },
      },
    },
    async (request, reply) => {
      if (honeypotFilled(request.body)) {
        return reply
          .code(201)
          .send({ id: randomToken(8), message: CONTACT_MESSAGE });
      }

      const input = parseWith(contactSchema, request.body);

      const [row] = await db
        .insert(contactMessages)
        .values({
          name: input.name,
          email: input.email,
          subject: input.subject,
          message: input.message,
          status: "new",
        })
        .returning({ id: contactMessages.id });

      return reply.code(201).send({ id: row?.id ?? "", message: CONTACT_MESSAGE });
    },
  );

  app.post(
    "/discount/validate",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
          keyGenerator: hashedIpKey,
        },
      },
    },
    async (request, reply) => {
      const input = parseWith(discountValidateSchema, request.body);
      const course = await getPublicCourseById(input.courseId);

      if (!course) {
        throw notFound("دوره پیدا نشد.", "course_not_found");
      }

      const auth = getAuth(request);
      const { evaluation } = await checkDiscount({
        code: input.code,
        courseId: course.id,
        priceToman: course.priceToman,
        userId: auth.user.id,
      });

      if (!evaluation.valid) {
        // پیام عمومی؛ دلیل دقیق شکست (وجود کد، سقف و...) افشا نمی‌شود.
        return reply.send({
          valid: false,
          message: DISCOUNT_GENERIC_ERROR,
        });
      }

      return reply.send({
        valid: true,
        code: normalizeDiscountCode(evaluation.discount.code),
        label: evaluation.label,
        amountToman: evaluation.amountToman,
        finalToman: evaluation.finalToman,
        discount: {
          type: evaluation.discount.type,
          percent: evaluation.discount.percent ?? null,
          amountToman: evaluation.discount.amountToman ?? null,
          maxDiscountToman: evaluation.discount.maxDiscountToman ?? null,
        },
      });
    },
  );
}
