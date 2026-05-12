import { Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();
const db = prisma as any;

// ─── User Management ───────────────────────────────────────────────────────────

export const changeUserRole = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { role } = req.body;
        if (!['LEARNER', 'INSTRUCTOR', 'ADMIN'].includes(role)) {
            res.status(400).json({ error: 'Invalid role' }); return;
        }
        const user = await prisma.user.update({ where: { id }, data: { role: role as UserRole } });
        res.json({ id: user.id, username: user.username, role: user.role });
    } catch { res.status(500).json({ error: 'Failed to change role' }); }
};

export const toggleUserBan = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
        res.json({ id: updated.id, username: updated.username, isActive: updated.isActive });
    } catch { res.status(500).json({ error: 'Failed to toggle ban' }); }
};

export const resetUserXP = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await prisma.user.update({ where: { id }, data: { xp: 0, rank: 1 } });
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to reset XP' }); }
};

// ─── Enrollment Management ─────────────────────────────────────────────────────

export const getEnrollments = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(String(req.query.page || '1'));
        const limit = 20;
        const skip = (page - 1) * limit;
        const search = String(req.query.search || '');

        const where = search ? {
            OR: [
                { user: { username: { contains: search, mode: 'insensitive' as const } } },
                { course: { title: { contains: search, mode: 'insensitive' as const } } }
            ]
        } : {};

        const [enrollments, total] = await Promise.all([
            db.enrollment.findMany({
                where, skip, take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, username: true, email: true } },
                    course: { select: { id: true, title: true, price: true } }
                }
            }),
            db.enrollment.count({ where })
        ]);

        res.json({ enrollments, total, page, pages: Math.ceil(total / limit) });
    } catch { res.status(500).json({ error: 'Failed to fetch enrollments' }); }
};

export const manualEnroll = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, courseId } = req.body;
        if (!userId || !courseId) { res.status(400).json({ error: 'userId and courseId required' }); return; }

        const enrollment = await db.enrollment.upsert({
            where: { userId_courseId: { userId, courseId } },
            update: { status: 'COMPLETED' },
            create: { userId, courseId, paymentMethod: 'FREE', amountPaid: 0, status: 'COMPLETED' }
        });
        res.status(201).json(enrollment);
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Failed to enroll user' });
    }
};

export const removeEnrollment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await db.enrollment.delete({ where: { id } });
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to remove enrollment' }); }
};

// ─── Announcements ─────────────────────────────────────────────────────────────

export const getAnnouncements = async (_req: AuthRequest, res: Response) => {
    try {
        const announcements = await db.announcement.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(announcements);
    } catch { res.status(500).json({ error: 'Failed to fetch announcements' }); }
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content, type } = req.body;
        if (!title || !content) { res.status(400).json({ error: 'title and content required' }); return; }
        const announcement = await db.announcement.create({
            data: { title, content, type: type || 'INFO', authorId: req.user!.userId }
        });
        res.status(201).json(announcement);
    } catch { res.status(500).json({ error: 'Failed to create announcement' }); }
};

export const toggleAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const ann = await db.announcement.findUnique({ where: { id } });
        if (!ann) { res.status(404).json({ error: 'Not found' }); return; }
        const updated = await db.announcement.update({ where: { id }, data: { isActive: !ann.isActive } });
        res.json(updated);
    } catch { res.status(500).json({ error: 'Failed to toggle announcement' }); }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await db.announcement.delete({ where: { id } });
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to delete announcement' }); }
};

// ─── Platform Health ───────────────────────────────────────────────────────────

export const getPlatformHealth = async (_req: AuthRequest, res: Response) => {
    try {
        const [
            totalUsers, activeUsers, totalCourses, totalModules,
            totalEnrollments, totalChallenges, totalSolves,
            totalProgress, recentActivity
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.course.count(),
            prisma.module.count(),
            db.enrollment.count(),
            prisma.challenge.count(),
            db.challengeSolve.count(),
            prisma.userProgress.count({ where: { completed: true } }),
            prisma.user.findMany({
                orderBy: { createdAt: 'desc' }, take: 5,
                select: { username: true, createdAt: true, role: true }
            })
        ]);

        const dbStatus = 'healthy';
        const uptime = process.uptime();
        const memUsage = process.memoryUsage();

        res.json({
            status: 'operational',
            db: dbStatus,
            uptime: Math.floor(uptime),
            memory: {
                used: Math.round(memUsage.heapUsed / 1024 / 1024),
                total: Math.round(memUsage.heapTotal / 1024 / 1024)
            },
            counts: {
                totalUsers, activeUsers,
                bannedUsers: totalUsers - activeUsers,
                totalCourses, totalModules,
                totalEnrollments, totalChallenges,
                totalSolves, totalProgress
            },
            recentSignups: recentActivity
        });
    } catch (error) {
        res.status(500).json({ status: 'degraded', error: 'Health check failed' });
    }
};
