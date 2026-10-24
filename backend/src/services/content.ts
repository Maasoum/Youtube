import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  blogPosts,
  courses,
  faqs,
  teachers,
  type CourseRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";

export interface PublicCourse {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  level: CourseRow["level"];
  ageMin: number;
  ageMax: number;
  durationWeeks: number;
  sessions: number;
  outcomes: string[];
  syllabus: { title: string; summary: string }[];
  faqs: { question: string; answer: string }[];
  art: string | null;
  badge: string | null;
  popular: boolean;
  featured: boolean;
  providerName: string;
  providerSiteUrl: string | null;
  priceToman: number;
  compareAtPriceToman: number | null;
  createdAt: string;
}

export interface PublicBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body?: string;
  category: string;
  author: string;
  readMinutes: number;
  art: string | null;
  publishedAt: string | null;
}

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
}

export interface PublicTeacher {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
  accent: string;
}

function toPublicCourse(course: CourseRow): PublicCourse {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    tagline: course.tagline,
    description: course.description,
    level: course.level,
    ageMin: course.ageMin,
    ageMax: course.ageMax,
    durationWeeks: course.durationWeeks,
    sessions: course.sessions,
    outcomes: course.outcomes,
    syllabus: course.syllabus,
    faqs: course.faqs,
    art: course.art,
    badge: course.badge,
    popular: course.popular,
    featured: course.featured,
    providerName: course.providerName,
    providerSiteUrl: course.providerSiteUrl,
    priceToman: course.priceToman,
    compareAtPriceToman: course.compareAtPriceToman,
    createdAt: course.createdAt.toISOString(),
  };
}

export async function listPublicCourses(
  options: { q?: string; limit?: number; offset?: number } = {},
  executor: AppDb = db,
): Promise<PublicCourse[]> {
  const conditions = [eq(courses.isPublished, true)];
  if (options.q) {
    conditions.push(ilike(courses.title, `%${options.q}%`));
  }

  const rows = await executor
    .select()
    .from(courses)
    .where(and(...conditions))
    .orderBy(desc(courses.createdAt))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);

  return rows.map(toPublicCourse);
}

export async function getPublicCourseBySlug(
  slug: string,
  executor: AppDb = db,
): Promise<PublicCourse | null> {
  const [row] = await executor
    .select()
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.isPublished, true)))
    .limit(1);

  return row ? toPublicCourse(row) : null;
}

export async function getPublicCourseById(
  courseId: string,
  executor: AppDb = db,
): Promise<PublicCourse | null> {
  const [row] = await executor
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.isPublished, true)))
    .limit(1);

  return row ? toPublicCourse(row) : null;
}

export async function listPublicPosts(
  options: { q?: string; limit?: number; offset?: number } = {},
  executor: AppDb = db,
): Promise<PublicBlogPost[]> {
  const conditions = [eq(blogPosts.status, "published")];
  if (options.q) {
    conditions.push(ilike(blogPosts.title, `%${options.q}%`));
  }

  const rows = await executor
    .select()
    .from(blogPosts)
    .where(and(...conditions))
    .orderBy(desc(sql`coalesce(${blogPosts.publishedAt}, ${blogPosts.createdAt})`))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);

  return rows.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: post.author,
    readMinutes: post.readMinutes,
    art: post.art,
    publishedAt: post.publishedAt?.toISOString() ?? null,
  }));
}

export async function getPublicPostBySlug(
  slug: string,
  executor: AppDb = db,
): Promise<PublicBlogPost | null> {
  const [post] = await executor
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!post) return null;

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    category: post.category,
    author: post.author,
    readMinutes: post.readMinutes,
    art: post.art,
    publishedAt: post.publishedAt?.toISOString() ?? null,
  };
}

export async function listPublicFaqs(
  executor: AppDb = db,
): Promise<PublicFaq[]> {
  const rows = await executor
    .select()
    .from(faqs)
    .where(eq(faqs.isActive, true))
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));

  return rows.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
  }));
}

export async function listPublicTeachers(
  executor: AppDb = db,
): Promise<PublicTeacher[]> {
  const rows = await executor
    .select()
    .from(teachers)
    .where(eq(teachers.isActive, true))
    .orderBy(asc(teachers.sortOrder), asc(teachers.createdAt));

  return rows.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    role: teacher.role,
    bio: teacher.bio,
    initials: teacher.initials,
    accent: teacher.accent,
  }));
}
