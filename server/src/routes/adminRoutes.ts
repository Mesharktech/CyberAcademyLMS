import express from 'express';
import { UserRole } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import {
    changeUserRole, toggleUserBan, resetUserXP,
    getEnrollments, manualEnroll, removeEnrollment,
    getAnnouncements, createAnnouncement, toggleAnnouncement, deleteAnnouncement,
    getPlatformHealth
} from '../controllers/adminController';

const router = express.Router();
const adminOnly = [authenticateToken, requireRole([UserRole.ADMIN])];

// ─── Users ────────────────────────────────────────────────────────────────────
router.patch('/users/:id/role',    ...adminOnly, changeUserRole);
router.patch('/users/:id/ban',     ...adminOnly, toggleUserBan);
router.post('/users/:id/reset-xp', ...adminOnly, resetUserXP);

// ─── Enrollments ──────────────────────────────────────────────────────────────
router.get('/enrollments',    ...adminOnly, getEnrollments);
router.post('/enrollments',   ...adminOnly, manualEnroll);
router.delete('/enrollments/:id', ...adminOnly, removeEnrollment);

// ─── Announcements ────────────────────────────────────────────────────────────
router.get('/announcements',          ...adminOnly, getAnnouncements);
router.post('/announcements',         ...adminOnly, createAnnouncement);
router.patch('/announcements/:id',    ...adminOnly, toggleAnnouncement);
router.delete('/announcements/:id',   ...adminOnly, deleteAnnouncement);

// ─── Health ───────────────────────────────────────────────────────────────────
router.get('/health', ...adminOnly, getPlatformHealth);

export default router;
