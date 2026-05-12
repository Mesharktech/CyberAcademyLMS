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
                        content: `You are an elite CTF challenge designer for SherkAcademy, an African cybersecurity training platform.
Create a REAL, multi-step CTF challenge that requires actual hacking skill. The flag format is SHERK{...}.

STRICT RULES — violating these makes a bad challenge:
1. NEVER write the flag in plaintext anywhere in the description. The player must EARN it.
2. The player must perform real technical steps to extract the flag: decode, decrypt, analyze, exploit, manipulate, or chain multiple techniques.
3. The description sets the scenario and gives the player RAW DATA to work with (e.g., an actual base64 blob, a JWT token, a hex dump, a cipher text, a pcap hex excerpt, an obfuscated script, a hash to crack). NOT a story that hands them the answer.
4. The flag must be DERIVED from the raw data through the correct technique — e.g., decode base64 → decode hex → find SHERK{...}, or crack MD5 hash to reveal flag, or decode JWT payload to reveal hidden claim.
5. Design the solve path: state WHAT data is given, WHAT technique solves it, and ensure the flag is the end result of correctly applying that technique.
6. Points scale: EASY=50, MEDIUM=150, HARD=300, INSANE=500.

GOOD challenge examples:
- Crypto: Give a ROT13+base64 encoded ciphertext. Decode it to get the flag.
- Web: Give a JWT with alg:none vulnerability. Manipulate payload to reveal admin claim containing the flag.
- Forensics: Give a hex dump of a file with the flag hidden after a null byte.
- Reverse: Give obfuscated Python/JS. Trace execution to find what string gets printed.
- OSINT: Give metadata clues. Chain them to find a specific value that forms the flag.

Respond ONLY with this exact JSON (no extra fields):
{
  "title": "Short punchy challenge title",
  "description": "Scenario intro (2-3 sentences). Then: HERE IS YOUR DATA: [paste the actual raw data the player must work with — a real base64 string, JWT, hex, ciphertext, etc.]. End with the specific question: What is the flag?",
  "flag": "SHERK{the_flag_derived_from_solving_the_data}",
  "hint": "A subtle technique hint without giving away the steps (e.g. 'Two layers. Start with the outer one.')",
  "points": 150
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
