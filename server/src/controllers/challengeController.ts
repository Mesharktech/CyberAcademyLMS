import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

const hashFlag = (flag: string) => createHash('sha256').update(flag.trim()).digest('hex');

// GET /challenges — list all active challenges with solve status for current user
export const getChallenges = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { category, difficulty } = req.query;

        const where: any = { isActive: true };
        if (category) where.category = category;
        if (difficulty) where.difficulty = difficulty;

        const challenges = await prisma.challenge.findMany({
            where,
            orderBy: [{ difficulty: 'asc' }, { points: 'asc' }],
            select: {
                id: true, title: true, description: true, category: true,
                difficulty: true, points: true, hint: true, solveCount: true,
                isLive: true, liveUrl: true,
                createdAt: true,
                solves: userId ? { where: { userId }, select: { solvedAt: true } } : false
            }
        });

        const formatted = challenges.map((c: any) => ({
            ...c,
            solved: userId ? c.solves?.length > 0 : false,
            solvedAt: userId ? c.solves?.[0]?.solvedAt || null : null,
            solves: undefined
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Get Challenges Error:', error);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
};

// POST /challenges/:id/submit — submit a flag
export const submitFlag = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params as { id: string };
        const { flag, hintUsed } = req.body;
        if (!flag) { res.status(400).json({ error: 'Flag is required' }); return; }

        const challenge = await prisma.challenge.findUnique({ where: { id, isActive: true } });
        if (!challenge) { res.status(404).json({ error: 'Challenge not found' }); return; }

        // Check already solved
        const existing = await (prisma as any).challengeSolve.findUnique({
            where: { userId_challengeId: { userId, challengeId: id } }
        });
        if (existing) {
            res.json({ correct: true, alreadySolved: true, message: 'Already solved. Keep hunting.' });
            return;
        }

        // Live challenges: compare against the user's unique instance flag, not the generic challenge hash
        if ((challenge as any).isLive) {
            const instance = await (prisma as any).challengeInstance.findFirst({
                where: { userId, challengeId: id, status: { in: ['RUNNING', 'STARTING', 'STOPPED', 'EXPIRED'] } },
                orderBy: { createdAt: 'desc' }
            });
            const correctFlag = instance?.uniqueFlag;
            if (!correctFlag || flag.trim() !== correctFlag) {
                res.json({ correct: false, message: 'Wrong flag. Keep hacking.' });
                return;
            }
        } else {
            const submitted = hashFlag(flag);
            if (submitted !== challenge.flagHash) {
                res.json({ correct: false, message: 'Wrong flag. Keep trying.' });
                return;
            }
        }

        // Apply hint penalty: -10% XP if hint was revealed
        const awardedPoints = hintUsed ? Math.floor(challenge.points * 0.9) : challenge.points;

        // Record solve + award XP in a transaction
        await prisma.$transaction(async (tx: any) => {
            await tx.challengeSolve.create({ data: { userId, challengeId: id } });
            await tx.challenge.update({ where: { id }, data: { solveCount: { increment: 1 } } });
            const user = await tx.user.findUnique({ where: { id: userId } });
            const newXp = (user.xp || 0) + awardedPoints;
            let newRank = user.rank;
            if (newXp >= 1000 && newRank < 2) newRank = 2;
            if (newXp >= 5000 && newRank < 3) newRank = 3;
            if (newXp >= 15000 && newRank < 4) newRank = 4;
            if (newXp >= 40000 && newRank < 5) newRank = 5;
            await tx.user.update({ where: { id: userId }, data: { xp: newXp, rank: newRank } });
        });

        const hintNote = hintUsed ? ' (−10% hint penalty)' : '';
        res.json({ correct: true, alreadySolved: false, points: awardedPoints, message: `+${awardedPoints} XP. Flag captured.${hintNote}` });
    } catch (error) {
        console.error('Submit Flag Error:', error);
        res.status(500).json({ error: 'Failed to submit flag' });
    }
};

// GET /challenges/leaderboard — top 50 users by XP with solve counts
export const getLeaderboard = async (_req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true, role: 'LEARNER' },
            orderBy: [{ xp: 'desc' }, { rank: 'desc' }],
            take: 50,
            select: {
                id: true, username: true, xp: true, rank: true, createdAt: true,
                challengeSolves: { select: { challengeId: true } },
                progress: { where: { completed: true }, select: { moduleId: true } }
            }
        });

        const leaderboard = users.map((u: any, i: number) => ({
            position: i + 1,
            id: u.id,
            username: u.username,
            xp: u.xp,
            rank: u.rank,
            solves: u.challengeSolves.length,
            completedModules: u.progress.length,
            joinedAt: u.createdAt
        }));

        res.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard Error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

// GET /challenges/my-solves — current user's solved challenges
export const getMySolves = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const solves = await (prisma as any).challengeSolve.findMany({
            where: { userId },
            include: {
                challenge: {
                    select: { id: true, title: true, category: true, difficulty: true, points: true }
                }
            },
            orderBy: { solvedAt: 'desc' }
        });

        res.json(solves);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch solves' });
    }
};

// Admin: create challenge
export const createChallenge = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, category, difficulty, points, flag, hint } = req.body;
        if (!title || !description || !category || !difficulty || !flag) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const challenge = await prisma.challenge.create({
            data: {
                title, description, category, difficulty,
                points: points || 100,
                flagHash: hashFlag(flag),
                hint: hint || null,
                authorId: req.user?.userId
            }
        });
        res.status(201).json(challenge);
    } catch (error) {
        console.error('Create Challenge Error:', error);
        res.status(500).json({ error: 'Failed to create challenge' });
    }
};

// Admin: get ALL challenges including inactive
export const getAllChallengesAdmin = async (_req: AuthRequest, res: Response) => {
    try {
        const challenges = await prisma.challenge.findMany({
            orderBy: [{ category: 'asc' }, { difficulty: 'asc' }],
            include: { _count: { select: { solves: true } } }
        });
        res.json(challenges);
    } catch { res.status(500).json({ error: 'Failed to fetch challenges' }); }
};

// Admin: update challenge
export const updateChallenge = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { title, description, category, difficulty, points, flag, hint } = req.body;
        const data: any = { title, description, category, difficulty, points, hint };
        if (flag) data.flagHash = createHash('sha256').update(flag.trim()).digest('hex');
        const updated = await prisma.challenge.update({ where: { id }, data });
        res.json(updated);
    } catch { res.status(500).json({ error: 'Failed to update challenge' }); }
};

// Admin: delete challenge
export const deleteChallenge = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await prisma.challenge.delete({ where: { id } });
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to delete challenge' }); }
};

// Admin: toggle challenge active status
export const toggleChallenge = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const challenge = await prisma.challenge.findUnique({ where: { id } });
        if (!challenge) { res.status(404).json({ error: 'Not found' }); return; }
        const updated = await prisma.challenge.update({ where: { id }, data: { isActive: !challenge.isActive } });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle challenge' });
    }
};
