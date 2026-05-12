import express from 'express';
import { UserRole } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/authMiddleware';
import {
    getChallenges, submitFlag, getLeaderboard, getMySolves,
    createChallenge, toggleChallenge, getAllChallengesAdmin,
    updateChallenge, deleteChallenge
} from '../controllers/challengeController';
import { aiService } from '../services/aiService';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const hashFlag = (flag: string) => createHash('sha256').update(flag.trim()).digest('hex');

// ─── Public ────────────────────────────────────────────────────────────────────
router.get('/leaderboard', getLeaderboard);
router.get('/', authenticateToken, getChallenges);

// ─── Authenticated ─────────────────────────────────────────────────────────────
router.post('/:id/submit', authenticateToken, submitFlag);
router.get('/my-solves', authenticateToken, getMySolves);

// ─── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/all', authenticateToken, requireRole([UserRole.ADMIN]), getAllChallengesAdmin);
router.post('/', authenticateToken, requireRole([UserRole.ADMIN]), createChallenge);
router.put('/:id', authenticateToken, requireRole([UserRole.ADMIN]), updateChallenge);
router.delete('/:id', authenticateToken, requireRole([UserRole.ADMIN]), deleteChallenge);
router.patch('/:id/toggle', authenticateToken, requireRole([UserRole.ADMIN]), toggleChallenge);

// ─── AI Challenge Generator (Admin) ───────────────────────────────────────────
router.post(
    '/ai-generate',
    authenticateToken,
    requireRole([UserRole.ADMIN]),
    async (req: AuthRequest, res: any) => {
        try {
            const { topic, difficulty, category } = req.body;
            if (!topic) { res.status(400).json({ error: 'topic is required' }); return; }

            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                temperature: 0.8,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: `You are a CTF challenge designer for SherkAcademy, an African cybersecurity training platform.
Create a realistic, educational CTF challenge. The flag format is SHERK{...}.

Rules:
- The challenge must be solvable through reasoning/knowledge, not a live system
- Description should include enough context for the player to find the flag
- The flag should be hidden within the challenge description/scenario itself (a hash, encoded string, hidden value, etc.)
- Make it authentic and educational — based on real techniques

Respond ONLY with this exact JSON:
{
  "title": "Challenge title",
  "description": "Full challenge description. Include the flag hidden naturally within the scenario — e.g., in a log snippet, encoded in base64, embedded in a config file excerpt, etc.",
  "flag": "SHERK{the_actual_flag_value}",
  "hint": "A subtle hint that helps without giving it away",
  "points": 100
}`
                    },
                    {
                        role: 'user',
                        content: `Create a ${difficulty || 'MEDIUM'} ${category || 'WEB'} challenge about: ${topic}`
                    }
                ]
            });

            const raw = completion.choices[0]?.message?.content || '{}';
            let generated: any;
            try { generated = JSON.parse(raw); }
            catch { const m = raw.match(/\{[\s\S]*\}/); generated = JSON.parse(m ? m[0] : '{}'); }

            if (!generated.flag || !generated.title) {
                res.status(500).json({ error: 'AI returned incomplete challenge' });
                return;
            }

            // Auto-save to DB
            const challenge = await prisma.challenge.create({
                data: {
                    title: generated.title,
                    description: generated.description,
                    category: category || 'WEB',
                    difficulty: difficulty || 'MEDIUM',
                    points: generated.points || 100,
                    flagHash: hashFlag(generated.flag),
                    hint: generated.hint || null,
                    authorId: req.user?.userId
                }
            });

            res.status(201).json({ challenge, plainFlag: generated.flag });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'AI generation failed';
            res.status(500).json({ error: msg });
        }
    }
);

export default router;
