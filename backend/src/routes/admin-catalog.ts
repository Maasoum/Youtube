import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { notFound } from "../lib/errors.js";
import {
  blogInputSchema,
  courseInputSchema,
  coursePublishSchema,
  faqInputSchema,
  moveSchema,
  postStatusSchema,
  teacherInputSchema,
} from "../lib/validation-panel.js";
import { parseWith } from "../lib/validation.js";
import { getAuth, requireAdmin } from "../middleware/auth.js";
import { requestMeta } from "../services/auth.js";
import {
  createCourse,
  createFaq,
  createPost,
  createTeacher,
  deleteCourse,
  deleteFaq,
  deletePost,
  deleteTeacher,
  listAllCourses,
  listAllFaqs,
  listAllPosts,
  listAllTeachers,
  moveFaq,
  moveTeacher,
  setCoursePublished,
  setPostStatus,
  updateCourse,
  updateFaq,
  updatePost,
  updateTeacher,
} from "../services/catalog-admin.js";

const idSchema = z.uuid({ message: "شناسه معتبر نیست." });

function idOf(params: unknown, message: string): string {
  const { id } = params as { id?: string };
  if (!id || !idSchema.safeParse(id).success) {
    throw notFound(message, "not_found");
  }
  return id;
}

export async function adminCatalogRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = { preHandler: requireAdmin };
  const readConfig = { rateLimit: { max: 120, timeWindow: "1 minute" } };
  const writeConfig = { rateLimit: { max: 30, timeWindow: "1 minute" } };

  /* ------------------------------- Courses ------------------------------- */

  app.get(
    "/admin/courses",
    { ...adminOnly, config: readConfig },
    async (_request, reply) => reply.send({ courses: await listAllCourses() }),
  );

  app.post(
    "/admin/courses",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const input = parseWith(courseInputSchema, request.body);
      const auth = getAuth(request);
      const course = await createCourse({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(201).send({ course });
    },
  );

  app.put(
    "/admin/courses/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const courseId = idOf(request.params, "دوره پیدا نشد.");
      const input = parseWith(courseInputSchema, request.body);
      const auth = getAuth(request);
      const course = await updateCourse({
        courseId,
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ course });
    },
  );

  app.post(
    "/admin/courses/:id/publish",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const courseId = idOf(request.params, "دوره پیدا نشد.");
      const input = parseWith(coursePublishSchema, request.body);
      const auth = getAuth(request);
      const course = await setCoursePublished({
        courseId,
        published: input.published,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ course });
    },
  );

  app.delete(
    "/admin/courses/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const courseId = idOf(request.params, "دوره پیدا نشد.");
      const auth = getAuth(request);
      await deleteCourse({
        courseId,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(204).send();
    },
  );

  /* -------------------------------- Blog --------------------------------- */

  app.get(
    "/admin/blog",
    { ...adminOnly, config: readConfig },
    async (_request, reply) => reply.send({ posts: await listAllPosts() }),
  );

  app.post(
    "/admin/blog",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const input = parseWith(blogInputSchema, request.body);
      const auth = getAuth(request);
      const post = await createPost({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(201).send({ post });
    },
  );

  app.put(
    "/admin/blog/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const postId = idOf(request.params, "نوشته پیدا نشد.");
      const input = parseWith(blogInputSchema, request.body);
      const auth = getAuth(request);
      const post = await updatePost({
        postId,
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ post });
    },
  );

  app.post(
    "/admin/blog/:id/status",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const postId = idOf(request.params, "نوشته پیدا نشد.");
      const input = parseWith(postStatusSchema, request.body);
      const auth = getAuth(request);
      const post = await setPostStatus({
        postId,
        status: input.status,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ post });
    },
  );

  app.delete(
    "/admin/blog/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const postId = idOf(request.params, "نوشته پیدا نشد.");
      const auth = getAuth(request);
      await deletePost({
        postId,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(204).send();
    },
  );

  /* -------------------------------- FAQs --------------------------------- */

  app.get(
    "/admin/faqs",
    { ...adminOnly, config: readConfig },
    async (_request, reply) => reply.send({ faqs: await listAllFaqs() }),
  );

  app.post(
    "/admin/faqs",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const input = parseWith(faqInputSchema, request.body);
      const auth = getAuth(request);
      const faq = await createFaq({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(201).send({ faq });
    },
  );

  app.put(
    "/admin/faqs/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const faqId = idOf(request.params, "پرسش پیدا نشد.");
      const input = parseWith(faqInputSchema, request.body);
      const auth = getAuth(request);
      const faq = await updateFaq({
        faqId,
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ faq });
    },
  );

  app.delete(
    "/admin/faqs/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const faqId = idOf(request.params, "پرسش پیدا نشد.");
      const auth = getAuth(request);
      await deleteFaq({
        faqId,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(204).send();
    },
  );

  app.post(
    "/admin/faqs/:id/move",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const faqId = idOf(request.params, "پرسش پیدا نشد.");
      const input = parseWith(moveSchema, request.body);
      const auth = getAuth(request);
      const faqs = await moveFaq({
        faqId,
        direction: input.direction,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ faqs });
    },
  );

  /* ------------------------------ Teachers ------------------------------- */

  app.get(
    "/admin/teachers",
    { ...adminOnly, config: readConfig },
    async (_request, reply) =>
      reply.send({ teachers: await listAllTeachers() }),
  );

  app.post(
    "/admin/teachers",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const input = parseWith(teacherInputSchema, request.body);
      const auth = getAuth(request);
      const teacher = await createTeacher({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(201).send({ teacher });
    },
  );

  app.put(
    "/admin/teachers/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const teacherId = idOf(request.params, "مربی پیدا نشد.");
      const input = parseWith(teacherInputSchema, request.body);
      const auth = getAuth(request);
      const teacher = await updateTeacher({
        teacherId,
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ teacher });
    },
  );

  app.delete(
    "/admin/teachers/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const teacherId = idOf(request.params, "مربی پیدا نشد.");
      const auth = getAuth(request);
      await deleteTeacher({
        teacherId,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(204).send();
    },
  );

  app.post(
    "/admin/teachers/:id/move",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const teacherId = idOf(request.params, "مربی پیدا نشد.");
      const input = parseWith(moveSchema, request.body);
      const auth = getAuth(request);
      const teachers = await moveTeacher({
        teacherId,
        direction: input.direction,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ teachers });
    },
  );
}
