import express from 'express';
import { UserRole, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/authMiddleware';
import {
    getChallenges, submitFlag, getLeaderboard, getMySolves,
    createChallenge, toggleChallenge, getAllChallengesAdmin,
    updateChallenge, deleteChallenge
} from '../controllers/challengeController';
import {
    generateLiveChallengeHandler, adminDeployChallenge,
    launchInstance, getMyInstance, stopInstance, getAllInstances
} from '../controllers/instanceController';
import { generateLiveChallenge } from '../services/challengeAgentService';

const router = express.Router();
const prisma = new PrismaClient();

// ─── Public ────────────────────────────────────────────────────────────────────
router.get('/leaderboard', getLeaderboard);
router.get('/', authenticateToken, getChallenges);

// ─── Authenticated ─────────────────────────────────────────────────────────────
router.get('/my-solves', authenticateToken, getMySolves);
router.post('/:id/submit', authenticateToken, submitFlag);
router.post('/:id/launch', authenticateToken, launchInstance);
router.get('/:id/instance', authenticateToken, getMyInstance);
router.delete('/:id/instance', authenticateToken, stopInstance);

// ─── Admin ─────────────────────────────────────────────────────────────────────
router.post('/ai-generate', authenticateToken, requireRole([UserRole.ADMIN]), async (req: AuthRequest, res: any) => {
    try {
        const { topic, difficulty, category } = req.body;
        if (!topic) { res.status(400).json({ error: 'topic is required' }); return; }
        const { design } = await generateLiveChallenge(topic, difficulty || 'MEDIUM', category || 'WEB');
        const flagHash = createHash('sha256').update(design.flagValue.trim()).digest('hex');
        const challenge = await prisma.challenge.create({
            data: {
                title: design.title,
                description: design.scenario,
                category: (design.category as any) || 'WEB',
                difficulty: (design.difficulty as any) || 'MEDIUM',
                points: design.points || 150,
                flagHash,
                hint: design.hint || null,
                authorId: req.user?.userId
            }
        });
        res.status(201).json({ ...challenge, plainFlag: design.flagValue });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'AI generation failed' });
    }
});
router.get('/admin/all', authenticateToken, requireRole([UserRole.ADMIN]), getAllChallengesAdmin);
router.get('/admin/instances', authenticateToken, requireRole([UserRole.ADMIN]), getAllInstances);
router.post('/ai-generate-live', authenticateToken, requireRole([UserRole.ADMIN]), generateLiveChallengeHandler);
router.post('/:id/deploy', authenticateToken, requireRole([UserRole.ADMIN]), adminDeployChallenge);
router.post('/', authenticateToken, requireRole([UserRole.ADMIN]), createChallenge);
router.put('/:id', authenticateToken, requireRole([UserRole.ADMIN]), updateChallenge);
router.delete('/:id', authenticateToken, requireRole([UserRole.ADMIN]), deleteChallenge);
router.patch('/:id/toggle', authenticateToken, requireRole([UserRole.ADMIN]), toggleChallenge);


export default router;
