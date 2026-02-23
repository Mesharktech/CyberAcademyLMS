import express from 'express';
import {
    createCourse, getCourses, getCourseBySlug, addModule, updateProgress,
    updateCourse, deleteCourse, publishCourse, getMyEnrollments,
    updateModule, deleteModule, reorderModules, getAllCoursesAdmin
} from '../controllers/courseController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { UserRole } from '@prisma/client';

const router = express.Router();

// ─── Admin only — MUST be before /:slug to avoid being caught ──
router.get('/admin/all', authenticateToken, requireRole([UserRole.ADMIN]), getAllCoursesAdmin);

// ─── Enrolled Courses (Dashboard) ──────────────────────────────
router.get('/my-enrollments', authenticateToken, getMyEnrollments);

// ─── Public ───────────────────────────────────────────────────
router.get('/', getCourses);
router.get('/:slug', getCourseBySlug);

// ─── Progress (all authenticated users) ───────────────────────
router.post('/progress', authenticateToken, updateProgress);

// ─── Instructor / Admin — Course CRUD ─────────────────────────
router.post('/', authenticateToken, requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]), createCourse);
router.put('/:id', authenticateToken, requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]), updateCourse);
router.delete('/:id', authenticateToken, requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]), deleteCourse);
router.patch('/:id/publish', authenticateToken, requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]), publishCourse);

// ─── Instructor / Admin — Module CRUD ─────────────────────────
router.post('/:courseId/modules', authenticateToken, requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]), addModule);
router.put('/modules/:moduleId', authenticateToken, requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]), updateModule);
router.delete('/modules/:moduleId', authenticateToken, requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]), deleteModule);
router.patch('/:courseId/modules/reorder', authenticateToken, requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]), reorderModules);

export default router;
