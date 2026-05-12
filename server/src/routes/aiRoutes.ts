/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { UserRole } from '@prisma/client';
import { aiService } from '../services/aiService';
import { pdfAgentService } from '../services/pdfAgentService';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// multer loaded at runtime (installed via: npm install multer @types/multer pdf-parse @types/pdf-parse)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'));
    }
});

// Extend AuthRequest locally to include multer's file field
type PdfRequest = AuthRequest & { file?: any };

// ─── PDF Two-Agent Pipeline (Admin only) ─────────────────────────────────────
router.post(
    '/generate-from-pdf',
    authenticateToken,
    requireRole([UserRole.ADMIN]),
    upload.single('pdf'),
    async (req: PdfRequest, res: any) => {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No PDF file uploaded' });
                return;
            }

            const result = await pdfAgentService.processAndGenerate(
                req.file.buffer,
                req.file.originalname
            );

            res.json(result);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to process PDF';
            res.status(500).json({ error: msg });
        }
    }
);

// ─── Save AI-Generated Module to a Course (Admin only) ───────────────────────
router.post(
    '/save-module',
    authenticateToken,
    requireRole([UserRole.ADMIN]),
    async (req: AuthRequest, res: any) => {
        try {
            const { courseId, title, content, xpReward, requiredRank } = req.body;
            if (!courseId || !title || !content) {
                res.status(400).json({ error: 'courseId, title, and content are required' });
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            const orderIndex = await prisma.module.count({ where: { courseId } });
            const module = await prisma.module.create({
                data: {
                    courseId,
                    title,
                    type: 'TEXT',
                    content,
                    orderIndex,
                    xpReward: xpReward || 100,
                    requiredRank: requiredRank || 1
                }
            });
            res.status(201).json(module);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to save module';
            res.status(500).json({ error: msg });
        }
    }
);

// ─── Existing Routes ──────────────────────────────────────────────────────────
router.post('/mentor/feedback', async (req: any, res: any) => {
    try {
        const { content, context } = req.body;
        if (!content) { res.status(400).json({ error: 'Content is required' }); return; }
        const result = await aiService.analyzeSubmission(content, context);
        try { res.json(JSON.parse(result)); } catch { res.json({ feedback: result }); }
    } catch { res.status(500).json({ error: 'Internal Server Error' }); }
});

router.get('/scenarios/daily', async (_req: any, res: any) => {
    try {
        const result = await aiService.generateDailyScenario();
        try { res.json(JSON.parse(result)); } catch { res.json({ scenario: result }); }
    } catch { res.status(500).json({ error: 'Internal Server Error' }); }
});

router.post('/chat', async (req: any, res: any) => {
    try {
        const { message, context } = req.body;
        if (!message) { res.status(400).json({ error: 'Message is required' }); return; }
        const result = await aiService.chat(message, context);
        try { res.json(JSON.parse(result)); } catch { res.json({ content: result }); }
    } catch { res.status(500).json({ error: 'AI Communication Failure' }); }
});

export default router;
