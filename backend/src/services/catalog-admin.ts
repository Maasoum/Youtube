import { asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  blogPosts,
  courses,
  faqs,
  licenses,
  orders,
  teachers,
  type CourseRow,
  type UserRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { uniqueConstraint } from "../lib/db-errors.js";
import { conflict, notFound } from "../lib/errors.js";
import { writeAudit } from "./audit.js";

export interface CatalogDeps {
  db?: AppDb;
  now?: () => Date;
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface CourseView {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string[];
  level: CourseRow["level"];
  ageMin: number;
  ageMax: number;
  durationWeeks: number;
  sessions: number;
  priceToman: number;
  compareAtPriceToman: number | null;
  outcomes: string[];
  syllabus: { title: string; summary: string }[];
  faqs: { question: string; answer: string }[];
  art: string | null;
  badge: string | null;
  popular: boolean;
  featured: boolean;
  providerName: string;
  providerPanelUrl: string | null;
  activationUrl: string | null;
  activationInstructions: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseInput {
  slug: string;
  title: string;
  tagline: string;
  description: string | string[];
  level: CourseRow["level"];
  ageMin: number;
  ageMax: number;
  durationWeeks: number;
  sessions: number;
  priceToman: number;
  compareAtPriceToman?: number | null;
  outcomes: string[];
  syllabus: { title: string; summary: string }[];
  faqs: { question: string; answer: string }[];
  art?: string | null;
  badge?: string | null;
  popular: boolean;
  featured: boolean;
  providerName: string;
  providerPanelUrl?: string | null;
  activationUrl?: string | null;
  activationInstructions: string;
  published: boolean;
}

function nowOf(deps: CatalogDeps): Date {
  return deps.now ? deps.now() : new Date();
}

function descriptionToText(description: string | string[]): string {
  return Array.isArray(description)
    ? description.map((item) => item.trim()).filter(Boolean).join("\n\n")
    : description.trim();
}

export function descriptionToParagraphs(description: string): string[] {
  return description
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toCourseView(row: CourseRow): CourseView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    description: descriptionToParagraphs(row.description),
    level: row.level,
    ageMin: row.ageMin,
    ageMax: row.ageMax,
    durationWeeks: row.durationWeeks,
    sessions: row.sessions,
    priceToman: row.priceToman,
    compareAtPriceToman: row.compareAtPriceToman,
    outcomes: row.outcomes,
    syllabus: row.syllabus,
    faqs: row.faqs,
    art: row.art,
    badge: row.badge,
    popular: row.popular,
    featured: row.featured,
    providerName: row.providerName,
    providerPanelUrl: row.providerSiteUrl,
    activationUrl: row.activationUrl,
    activationInstructions: row.activationInstructions ?? "",
    published: row.isPublished,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertSlugFree(
  executor: AppDb,
  slug: string,
  exceptId?: string,
): Promise<void> {
  const [row] = await executor
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);
  if (row && row.id !== exceptId) {
    throw conflict("این نامک قبلاً استفاده شده است.", "slug_taken");
  }
}

function courseValues(input: CourseInput) {
  return {
    slug: input.slug,
    title: input.title,
    tagline: input.tagline ?? "",
    description: descriptionToText(input.description),
    level: input.level,
    ageMin: input.ageMin,
    ageMax: input.ageMax,
    durationWeeks: input.durationWeeks,
    sessions: input.sessions,
    priceToman: input.priceToman,
    compareAtPriceToman: input.compareAtPriceToman ?? null,
    outcomes: input.outcomes,
    syllabus: input.syllabus,
    faqs: input.faqs,
    art: input.art ?? null,
    badge: input.badge ?? null,
    popular: input.popular,
    featured: input.featured,
    providerName: input.providerName,
    providerSiteUrl: input.providerPanelUrl || null,
    activationUrl: input.activationUrl || null,
    activationInstructions: input.activationInstructions ?? "",
    isPublished: input.published,
  };
}

export async function listAllCourses(
  executor: AppDb = db,
): Promise<CourseView[]> {
  const rows = await executor
    .select()
    .from(courses)
    .orderBy(desc(courses.createdAt));
  return rows.map(toCourseView);
}

export async function createCourse(
  params: { input: CourseInput; actor: UserRow; request?: RequestMeta },
  deps: CatalogDeps = {},
): Promise<CourseView> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);
  await assertSlugFree(executor, params.input.slug);

  let row: CourseRow | undefined;
  try {
    const inserted = await executor
      .insert(courses)
      .values({ ...courseValues(params.input), createdAt: now, updatedAt: now })
      .returning();
    row = inserted[0];
  } catch (error) {
    if (uniqueConstraint(error)?.includes("courses_slug_uq")) {
      throw conflict("این نامک قبلاً استفاده شده است.", "slug_taken");
    }
    throw error;
  }

  if (!row) throw new Error("ساخت دوره ناموفق بود.");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "course.created",
      entityType: "course",
      entityId: row.id,
      summary: `دوره‌ی «${row.title}» ساخته شد.`,
      request: params.request,
    },
    executor,
  );

  return toCourseView(row);
}

export async function updateCourse(
  params: {
    courseId: string;
    input: CourseInput;
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<CourseView> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const [existing] = await executor
    .select()
    .from(courses)
    .where(eq(courses.id, params.courseId))
    .limit(1);
  if (!existing) throw notFound("دوره پیدا نشد.", "course_not_found");

  await assertSlugFree(executor, params.input.slug, params.courseId);

  let row: CourseRow | undefined;
  try {
    const updated = await executor
      .update(courses)
      .set({ ...courseValues(params.input), updatedAt: now })
      .where(eq(courses.id, params.courseId))
      .returning();
    row = updated[0];
  } catch (error) {
    if (uniqueConstraint(error)?.includes("courses_slug_uq")) {
      throw conflict("این نامک قبلاً استفاده شده است.", "slug_taken");
    }
    throw error;
  }

  if (!row) throw new Error("به‌روزرسانی دوره ناموفق بود.");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "course.updated",
      entityType: "course",
      entityId: row.id,
      summary: `دوره‌ی «${row.title}» به‌روزرسانی شد.`,
      request: params.request,
    },
    executor,
  );

  return toCourseView(row);
}

export async function setCoursePublished(
  params: {
    courseId: string;
    published: boolean;
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<CourseView> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const [row] = await executor
    .update(courses)
    .set({ isPublished: params.published, updatedAt: now })
    .where(eq(courses.id, params.courseId))
    .returning();

  if (!row) throw notFound("دوره پیدا نشد.", "course_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "course.published",
      entityType: "course",
      entityId: row.id,
      summary: params.published
        ? `دوره‌ی «${row.title}» منتشر شد.`
        : `انتشار دوره‌ی «${row.title}» متوقف شد.`,
      request: params.request,
    },
    executor,
  );

  return toCourseView(row);
}

export async function deleteCourse(
  params: {
    courseId: string;
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;

  const [existing] = await executor
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.id, params.courseId))
    .limit(1);
  if (!existing) throw notFound("دوره پیدا نشد.", "course_not_found");

  const [orderCount] = await executor
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.courseId, params.courseId));
  const [licenseCount] = await executor
    .select({ value: count() })
    .from(licenses)
    .where(eq(licenses.courseId, params.courseId));

  if (Number(orderCount?.value ?? 0) > 0 || Number(licenseCount?.value ?? 0) > 0) {
    throw conflict(
      "این دوره سفارش یا لایسنس دارد و قابل حذف نیست؛ آن را از انتشار خارج کنید.",
      "course_in_use",
    );
  }

  await executor.delete(courses).where(eq(courses.id, params.courseId));

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "course.deleted",
      entityType: "course",
      entityId: params.courseId,
      summary: `دوره‌ی «${existing.title}» حذف شد.`,
      request: params.request,
    },
    executor,
  );
}

/* -------------------------------------------------------------------------- */
/* Blog                                                                       */
/* -------------------------------------------------------------------------- */

export interface BlogPostView {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  readMinutes: number;
  art: string | null;
  body: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostInput {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  readMinutes: number;
  art?: string | null;
  body: string;
  status: "draft" | "published";
}

function toBlogView(row: typeof blogPosts.$inferSelect): BlogPostView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    author: row.author,
    readMinutes: row.readMinutes,
    art: row.art,
    body: row.body,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertPostSlugFree(
  executor: AppDb,
  slug: string,
  exceptId?: string,
): Promise<void> {
  const [row] = await executor
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  if (row && row.id !== exceptId) {
    throw conflict("این نامک قبلاً برای نوشته‌ی دیگری استفاده شده است.", "slug_taken");
  }
}

export async function listAllPosts(
  executor: AppDb = db,
): Promise<BlogPostView[]> {
  const rows = await executor
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt));
  return rows.map(toBlogView);
}

export async function createPost(
  params: { input: BlogPostInput; actor: UserRow; request?: RequestMeta },
  deps: CatalogDeps = {},
): Promise<BlogPostView> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);
  await assertPostSlugFree(executor, params.input.slug);

  const [row] = await executor
    .insert(blogPosts)
    .values({
      slug: params.input.slug,
      title: params.input.title,
      excerpt: params.input.excerpt,
      category: params.input.category,
      author: params.input.author,
      readMinutes: params.input.readMinutes,
      art: params.input.art ?? null,
      body: params.input.body,
      status: params.input.status,
      publishedAt: params.input.status === "published" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) throw new Error("ساخت نوشته ناموفق بود.");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "blog.created",
      entityType: "blog_post",
      entityId: row.id,
      summary: `نوشته‌ی «${row.title}» ساخته شد.`,
      request: params.request,
    },
    executor,
  );

  return toBlogView(row);
}

export async function updatePost(
  params: {
    postId: string;
    input: BlogPostInput;
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<BlogPostView> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const [existing] = await executor
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, params.postId))
    .limit(1);
  if (!existing) throw notFound("نوشته پیدا نشد.", "post_not_found");
  await assertPostSlugFree(executor, params.input.slug, params.postId);

  const [row] = await executor
    .update(blogPosts)
    .set({
      slug: params.input.slug,
      title: params.input.title,
      excerpt: params.input.excerpt,
      category: params.input.category,
      author: params.input.author,
      readMinutes: params.input.readMinutes,
      art: params.input.art ?? null,
      body: params.input.body,
      status: params.input.status,
      publishedAt:
        params.input.status === "published"
          ? existing.publishedAt ?? now
          : existing.publishedAt,
      updatedAt: now,
    })
    .where(eq(blogPosts.id, params.postId))
    .returning();

  if (!row) throw new Error("به‌روزرسانی نوشته ناموفق بود.");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "blog.updated",
      entityType: "blog_post",
      entityId: row.id,
      summary: `نوشته‌ی «${row.title}» به‌روزرسانی شد.`,
      request: params.request,
    },
    executor,
  );

  return toBlogView(row);
}

export async function setPostStatus(
  params: {
    postId: string;
    status: "draft" | "published";
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<BlogPostView> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const [row] = await executor
    .update(blogPosts)
    .set({
      status: params.status,
      publishedAt:
        params.status === "published" ? now : undefined,
      updatedAt: now,
    })
    .where(eq(blogPosts.id, params.postId))
    .returning();

  if (!row) throw notFound("نوشته پیدا نشد.", "post_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "blog.status_changed",
      entityType: "blog_post",
      entityId: row.id,
      summary:
        params.status === "published"
          ? `نوشته‌ی «${row.title}» منتشر شد.`
          : `انتشار نوشته‌ی «${row.title}» متوقف شد.`,
      request: params.request,
    },
    executor,
  );

  return toBlogView(row);
}

export async function deletePost(
  params: { postId: string; actor: UserRow; request?: RequestMeta },
  deps: CatalogDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;
  const [row] = await executor
    .delete(blogPosts)
    .where(eq(blogPosts.id, params.postId))
    .returning({ id: blogPosts.id, title: blogPosts.title });

  if (!row) throw notFound("نوشته پیدا نشد.", "post_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "blog.deleted",
      entityType: "blog_post",
      entityId: params.postId,
      summary: `نوشته‌ی «${row.title}» حذف شد.`,
      request: params.request,
    },
    executor,
  );
}

/* -------------------------------------------------------------------------- */
/* FAQs and teachers                                                          */
/* -------------------------------------------------------------------------- */

export interface FaqView {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

export async function listAllFaqs(executor: AppDb = db): Promise<FaqView[]> {
  const rows = await executor
    .select()
    .from(faqs)
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }));
}

export async function createFaq(
  params: {
    input: { question: string; answer: string; isActive: boolean };
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<FaqView> {
  const executor = deps.db ?? db;
  const [maxRow] = await executor
    .select({ value: sql<number>`coalesce(max(${faqs.sortOrder}), 0)::int` })
    .from(faqs);

  const [row] = await executor
    .insert(faqs)
    .values({
      question: params.input.question,
      answer: params.input.answer,
      isActive: params.input.isActive,
      sortOrder: Number(maxRow?.value ?? 0) + 1,
    })
    .returning();
  if (!row) throw new Error("ساخت پرسش ناموفق بود.");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "faq.created",
      entityType: "faq",
      entityId: row.id,
      summary: "پرسش متداول تازه ساخته شد.",
      request: params.request,
    },
    executor,
  );

  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export async function updateFaq(
  params: {
    faqId: string;
    input: { question: string; answer: string; isActive: boolean };
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<FaqView> {
  const executor = deps.db ?? db;
  const [row] = await executor
    .update(faqs)
    .set({
      question: params.input.question,
      answer: params.input.answer,
      isActive: params.input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(faqs.id, params.faqId))
    .returning();

  if (!row) throw notFound("پرسش پیدا نشد.", "faq_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "faq.updated",
      entityType: "faq",
      entityId: row.id,
      summary: "پرسش متداول به‌روزرسانی شد.",
      request: params.request,
    },
    executor,
  );

  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export async function deleteFaq(
  params: { faqId: string; actor: UserRow; request?: RequestMeta },
  deps: CatalogDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;
  const [row] = await executor
    .delete(faqs)
    .where(eq(faqs.id, params.faqId))
    .returning({ id: faqs.id });
  if (!row) throw notFound("پرسش پیدا نشد.", "faq_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "faq.deleted",
      entityType: "faq",
      entityId: params.faqId,
      summary: "پرسش متداول حذف شد.",
      request: params.request,
    },
    executor,
  );
}

export interface TeacherInput {
  name: string;
  role: string;
  bio: string;
  initials: string;
  accent: "lavender" | "yellow" | "sky" | "coral";
  isActive: boolean;
}

export interface TeacherView extends TeacherInput {
  id: string;
  sortOrder: number;
}

export async function listAllTeachers(
  executor: AppDb = db,
): Promise<TeacherView[]> {
  const rows = await executor
    .select()
    .from(teachers)
    .orderBy(asc(teachers.sortOrder), asc(teachers.createdAt));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    initials: row.initials,
    accent: row.accent,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  }));
}

export async function createTeacher(
  params: { input: TeacherInput; actor: UserRow; request?: RequestMeta },
  deps: CatalogDeps = {},
): Promise<TeacherView> {
  const executor = deps.db ?? db;
  const [maxRow] = await executor
    .select({ value: sql<number>`coalesce(max(${teachers.sortOrder}), 0)::int` })
    .from(teachers);

  const [row] = await executor
    .insert(teachers)
    .values({
      name: params.input.name,
      role: params.input.role,
      bio: params.input.bio,
      initials: params.input.initials,
      accent: params.input.accent,
      isActive: params.input.isActive,
      sortOrder: Number(maxRow?.value ?? 0) + 1,
    })
    .returning();
  if (!row) throw new Error("ساخت مربی ناموفق بود.");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "teacher.created",
      entityType: "teacher",
      entityId: row.id,
      summary: `مربی «${row.name}» اضافه شد.`,
      request: params.request,
    },
    executor,
  );

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    initials: row.initials,
    accent: row.accent,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function updateTeacher(
  params: {
    teacherId: string;
    input: TeacherInput;
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<TeacherView> {
  const executor = deps.db ?? db;
  const [row] = await executor
    .update(teachers)
    .set({
      name: params.input.name,
      role: params.input.role,
      bio: params.input.bio,
      initials: params.input.initials,
      accent: params.input.accent,
      isActive: params.input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(teachers.id, params.teacherId))
    .returning();

  if (!row) throw notFound("مربی پیدا نشد.", "teacher_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "teacher.updated",
      entityType: "teacher",
      entityId: row.id,
      summary: `اطلاعات مربی «${row.name}» به‌روزرسانی شد.`,
      request: params.request,
    },
    executor,
  );

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    initials: row.initials,
    accent: row.accent,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function deleteTeacher(
  params: { teacherId: string; actor: UserRow; request?: RequestMeta },
  deps: CatalogDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;
  const [row] = await executor
    .delete(teachers)
    .where(eq(teachers.id, params.teacherId))
    .returning({ id: teachers.id, name: teachers.name });
  if (!row) throw notFound("مربی پیدا نشد.", "teacher_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "teacher.deleted",
      entityType: "teacher",
      entityId: params.teacherId,
      summary: `مربی «${row.name}» حذف شد.`,
      request: params.request,
    },
    executor,
  );
}

export async function moveFaq(
  params: {
    faqId: string;
    direction: "up" | "down";
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<FaqView[]> {
  return moveOrdered(
    "faqs",
    faqs,
    params.faqId,
    params.direction,
    params.actor,
    params.request,
    deps,
  );
}

export async function moveTeacher(
  params: {
    teacherId: string;
    direction: "up" | "down";
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: CatalogDeps = {},
): Promise<TeacherView[]> {
  await moveOrdered(
    "teachers",
    teachers,
    params.teacherId,
    params.direction,
    params.actor,
    params.request,
    deps,
  );
  return listAllTeachers(deps.db ?? db);
}

type OrderedTable = typeof faqs | typeof teachers;

async function moveOrdered(
  entityName: string,
  table: OrderedTable,
  id: string,
  direction: "up" | "down",
  actor: UserRow,
  request: RequestMeta | undefined,
  deps: CatalogDeps,
): Promise<FaqView[]> {
  const executor = deps.db ?? db;

  await executor.transaction(async (tx) => {
    const rows = await tx
      .select({ id: table.id, sortOrder: table.sortOrder })
      .from(table)
      .orderBy(asc(table.sortOrder), asc(table.id));

    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) {
      throw notFound("موردی پیدا نشد.", "not_found");
    }
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= rows.length) return;

    const current = rows[index];
    const neighbor = rows[neighborIndex];
    if (!current || !neighbor) return;

    await tx
      .update(table)
      .set({ sortOrder: neighbor.sortOrder, updatedAt: new Date() })
      .where(eq(table.id, current.id));
    await tx
      .update(table)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(table.id, neighbor.id));
  });

  await writeAudit(
    {
      actor: { id: actor.id, name: actor.fullName },
      action: `${entityName}.reordered`,
      entityType: entityName === "faqs" ? "faq" : "teacher",
      entityId: id,
      summary: "ترتیب نمایش تغییر کرد.",
      request,
    },
    executor,
  );

  return listAllFaqs(executor);
}
