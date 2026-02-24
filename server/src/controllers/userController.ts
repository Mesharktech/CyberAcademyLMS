import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();
const db = prisma as any;

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const userXp = user?.xp || 0;
        const userRank = user?.rank || 1;

        // 1. Calculate Active Ops (enrolled courses)
        let activeOpsCount = 0;
        if (role === 'ADMIN') {
            activeOpsCount = await prisma.course.count({ where: { isPublished: true } });
        } else {
            const enrollments = await db.enrollment.findMany({
                where: { userId, status: 'COMPLETED' },
                select: { courseId: true }
            });
            const enrolledCourseIds = enrollments.map((e: any) => e.courseId);
            const freeAccess = await prisma.course.count({ where: { isPublished: true, price: 0 } });
            // Approximate count to avoid overlapping free + enrolled (doesn't have to be perfect for UI, but let's query exactly)
            activeOpsCount = await prisma.course.count({
                where: {
                    isPublished: true,
                    OR: [
                        { id: { in: enrolledCourseIds } },
                        { price: 0 }
                    ]
                }
            });
        }

        // 2. Calculate Total Field Time (dummy approximation based on completed modules: 1 module = 2 hours)
        const completedModulesCount = await prisma.userProgress.count({
            where: { userId, completed: true }
        });
        const totalFieldTimeHours = completedModulesCount * 2;

        // 3. Calculate Global Rank (mock percentile based on module count)
        const rankPercentile = Math.max(1, 99 - (completedModulesCount * 5)); // e.g., 0 modules = 99%, 10 modules = 49%, 20+ modules = 1%

        // 4. Get Latest Intel (last 3 published courses)
        const latestIntel = await prisma.course.findMany({
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { title: true, createdAt: true }
        });

        // Format dates to "T-24H" style strings relative to now
        const formattedIntel = latestIntel.map(intel => {
            const hoursDiff = Math.floor((new Date().getTime() - new Date(intel.createdAt).getTime()) / (1000 * 60 * 60));
            let dateStr = 'T-0';
            if (hoursDiff > 0 && hoursDiff < 24) dateStr = `T-${hoursDiff}H`;
            else if (hoursDiff >= 24) dateStr = `T-${Math.floor(hoursDiff / 24)}D`;

            return {
                title: intel.title,
                date: dateStr
            };
        });

        res.json({
            activeOps: activeOpsCount,
            fieldTime: totalFieldTimeHours,
            globalRank: rankPercentile,
            latestIntel: formattedIntel,
            xp: userXp,
            rank: userRank
        });

    } catch (error) {
        console.error('getDashboardStats Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
