import express from 'express';
import { UserRole } from '@prisma/client';
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
const router = express.Router();

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
router.get('/admin/all', authenticateToken, requireRole([UserRole.ADMIN]), getAllChallengesAdmin);
router.get('/admin/instances', authenticateToken, requireRole([UserRole.ADMIN]), getAllInstances);
router.post('/ai-generate-live', authenticateToken, requireRole([UserRole.ADMIN]), generateLiveChallengeHandler);
router.post('/:id/deploy', authenticateToken, requireRole([UserRole.ADMIN]), adminDeployChallenge);
router.post('/', authenticateToken, requireRole([UserRole.ADMIN]), createChallenge);
router.put('/:id', authenticateToken, requireRole([UserRole.ADMIN]), updateChallenge);
router.delete('/:id', authenticateToken, requireRole([UserRole.ADMIN]), deleteChallenge);
router.patch('/:id/toggle', authenticateToken, requireRole([UserRole.ADMIN]), toggleChallenge);


export default router;
