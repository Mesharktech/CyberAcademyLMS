import express from 'express';
import { getDashboardStats } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/dashboard-stats', authenticateToken, getDashboardStats);

export default router;
