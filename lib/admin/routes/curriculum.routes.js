import express from 'express';
import { z } from 'zod';

const CourseSchema = z.object({
  category: z.enum(['language', 'programming']),
  subject: z.string().trim().min(1).max(40),
  title_ar: z.string().trim().min(2).max(160),
  description_ar: z.string().trim().min(2).max(600),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_published: z.boolean().default(true),
});

const CourseUpdateSchema = CourseSchema.partial();
const PositiveIdSchema = z.coerce.number().int().positive();

const LessonSchema = z.object({
  course_id: z.coerce.number().int().positive(),
  lesson_type: z
    .enum(['vocabulary', 'grammar', 'reading', 'writing', 'listening', 'pronunciation', 'lesson', 'project'])
    .default('lesson'),
  title_ar: z.string().trim().min(2).max(180),
  content_ar: z.string().trim().min(5).max(5000),
  examples: z.array(z.string().trim()).optional().default([]),
  pronunciation_text: z.string().trim().max(500).optional().default(''),
  pronunciation_lang: z.string().trim().max(12).optional().default('en'),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_published: z.boolean().default(true),
});

export function createCurriculumRoutes({ repos, authMiddleware }) {
  const router = express.Router();

  router.get('/courses', authMiddleware.requireAuth, authMiddleware.requireRole('viewer'), (_req, res) => {
    const courses = repos.curriculum.listCourses({ includeUnpublished: true });
    const lessons = repos.curriculum.listAllLessons();
    res.json({ courses, lessons });
  });

  router.post('/courses', authMiddleware.requireAuth, authMiddleware.requireRole('editor'), (req, res) => {
    const parsed = CourseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid course payload' });
    const created = repos.curriculum.createCourse(parsed.data);
    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'course_created',
      targetType: 'course',
      targetId: created.id,
      details: { title: created.title_ar },
    });
    res.status(201).json({ course: created });
  });

  router.put('/courses/:id', authMiddleware.requireAuth, authMiddleware.requireRole('editor'), (req, res) => {
    const idCheck = PositiveIdSchema.safeParse(req.params.id);
    if (!idCheck.success) return res.status(400).json({ error: 'Invalid course id' });
    const parsed = CourseUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid course update payload' });
    const id = idCheck.data;
    const updated = repos.curriculum.updateCourse(id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Course not found' });
    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'course_updated',
      targetType: 'course',
      targetId: id,
    });
    res.json({ course: updated });
  });

  router.delete('/courses/:id', authMiddleware.requireAuth, authMiddleware.requireRole('super_admin'), (req, res) => {
    const idCheck = PositiveIdSchema.safeParse(req.params.id);
    if (!idCheck.success) return res.status(400).json({ error: 'Invalid course id' });
    const id = idCheck.data;
    const ok = repos.curriculum.deleteCourse(id);
    if (!ok) return res.status(404).json({ error: 'Course not found' });
    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'course_deleted',
      targetType: 'course',
      targetId: id,
    });
    res.json({ ok: true });
  });

  router.post('/lessons', authMiddleware.requireAuth, authMiddleware.requireRole('editor'), (req, res) => {
    const parsed = LessonSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid lesson payload' });
    const course = repos.curriculum.getCourseById(parsed.data.course_id);
    if (!course) return res.status(404).json({ error: 'Parent course not found' });

    const created = repos.curriculum.createLesson(parsed.data);
    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'lesson_created',
      targetType: 'lesson',
      targetId: created.id,
      details: { title: created.title_ar },
    });
    res.status(201).json({ lesson: created });
  });

  router.delete('/lessons/:id', authMiddleware.requireAuth, authMiddleware.requireRole('editor'), (req, res) => {
    const idCheck = PositiveIdSchema.safeParse(req.params.id);
    if (!idCheck.success) return res.status(400).json({ error: 'Invalid lesson id' });
    const id = idCheck.data;
    const ok = repos.curriculum.deleteLesson(id);
    if (!ok) return res.status(404).json({ error: 'Lesson not found' });
    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'lesson_deleted',
      targetType: 'lesson',
      targetId: id,
    });
    res.json({ ok: true });
  });

  return router;
}
