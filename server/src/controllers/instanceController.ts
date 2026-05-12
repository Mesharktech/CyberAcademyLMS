import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { generateLiveChallenge } from '../services/challengeAgentService';
import { deployChallenge, destroyMachine, getMachineStatus } from '../services/flyDeployer';

const prisma = new PrismaClient();
const db = prisma as any;

const hashFlag = (flag: string) => createHash('sha256').update(flag.trim()).digest('hex');

function uniqueFlag(userId: string, challengeId: string): string {
    const seed = `${userId}:${challengeId}:${process.env.FLAG_SECRET || 'sherk2026'}`;
    const h = createHash('sha256').update(seed).digest('hex').slice(0, 16);
    return `SHERK{live_${h}}`;
}

// ─── POST /challenges/ai-generate-live ─────────────────────────────────────────
// Admin: run 3-agent pipeline, save challenge with appCode, do NOT deploy yet
export const generateLiveChallengeHandler = async (req: AuthRequest, res: Response) => {
    try {
        const { topic, difficulty, category } = req.body;
        if (!topic) { res.status(400).json({ error: 'topic is required' }); return; }

        // Stream-style: send progress updates via JSON lines would need SSE.
        // For now, run full pipeline and return result.
        const { design, app, validation } = await generateLiveChallenge(
            topic,
            difficulty || 'MEDIUM',
            category || 'WEB'
        );

        // Save to DB with appCode (not yet deployed)
        const challenge = await prisma.challenge.create({
            data: {
                title: design.title,
                description: design.scenario,
                category: (design.category as any) || 'WEB',
                difficulty: (design.difficulty as any) || 'MEDIUM',
                points: design.points || 150,
                flagHash: hashFlag(design.flagValue),
                hint: design.hint || null,
                authorId: req.user?.userId,
                isLive: true,
                appCode: app.code
            } as any
        });

        res.status(201).json({
            challenge,
            design,
            validation,
            plainFlag: design.flagValue,
            message: validation.issues.length > 0
                ? `Generated with warnings: ${validation.issues.join(', ')}`
                : 'Challenge generated and validated. Ready to deploy.'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Generation failed' });
    }
};

// ─── POST /challenges/:id/deploy ───────────────────────────────────────────────
// Admin: deploy a generated challenge to Fly.io (shared instance — same URL for all users)
export const adminDeployChallenge = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const challenge = await (prisma.challenge as any).findUnique({ where: { id } });
        if (!challenge) { res.status(404).json({ error: 'Challenge not found' }); return; }
        if (!challenge.appCode) { res.status(400).json({ error: 'No app code. Generate challenge first.' }); return; }

        const flag = `SHERK{sharedlab_${id.slice(0, 8)}}`;

        const { appName, machineId, url } = await deployChallenge(id, challenge.appCode, flag);

        await (prisma.challenge as any).update({
            where: { id },
            data: { isLive: true, liveUrl: url }
        });

        res.json({ success: true, url, appName, machineId, message: 'Deployed. Live in ~30s at ' + url });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Deployment failed' });
    }
};

// ─── POST /challenges/:id/launch ───────────────────────────────────────────────
// User: spin up a personal instance of a live challenge
export const launchInstance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id: challengeId } = req.params as { id: string };
        const challenge = await (prisma.challenge as any).findUnique({ where: { id: challengeId, isActive: true } });
        if (!challenge) { res.status(404).json({ error: 'Challenge not found' }); return; }
        if (!challenge.isLive || !challenge.appCode) {
            res.status(400).json({ error: 'This challenge does not have a live environment' });
            return;
        }

        // Return existing running instance
        const existing = await db.challengeInstance.findFirst({
            where: { userId, challengeId, status: { in: ['STARTING', 'RUNNING'] } }
        });
        if (existing) {
            res.json({ instance: existing, alreadyRunning: true });
            return;
        }

        const flag = uniqueFlag(userId, challengeId);
        const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

        const instance = await db.challengeInstance.create({
            data: { userId, challengeId, uniqueFlag: flag, status: 'STARTING', expiresAt }
        });

        // Deploy asynchronously — don't block the response
        deployChallenge(`${challengeId}-${userId.slice(0, 6)}`, challenge.appCode, flag)
            .then(async ({ appName, machineId, url }) => {
                await db.challengeInstance.update({
                    where: { id: instance.id },
                    data: { flyAppName: appName, flyMachineId: machineId, liveUrl: url, status: 'RUNNING' }
                });
            })
            .catch(async (err) => {
                await db.challengeInstance.update({
                    where: { id: instance.id },
                    data: { status: 'FAILED' }
                });
                console.error('Instance deploy failed:', err.message);
            });

        res.status(201).json({
            instance,
            message: 'Instance launching. Poll /challenges/' + challengeId + '/instance for status.'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to launch instance' });
    }
};

// ─── GET /challenges/:id/instance ──────────────────────────────────────────────
export const getMyInstance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id: challengeId } = req.params as { id: string };
        const instance = await db.challengeInstance.findFirst({
            where: { userId, challengeId },
            orderBy: { createdAt: 'desc' }
        });

        if (!instance) { res.status(404).json({ error: 'No active instance' }); return; }

        if (new Date() > instance.expiresAt) {
            await db.challengeInstance.update({ where: { id: instance.id }, data: { status: 'EXPIRED' } });
            res.json({ ...instance, status: 'EXPIRED' });
            return;
        }

        // Sync status from Fly.io if still starting
        if (instance.status === 'STARTING' && instance.flyAppName && instance.flyMachineId) {
            const flyStatus = await getMachineStatus(instance.flyAppName, instance.flyMachineId);
            if (flyStatus === 'started' || flyStatus === 'running') {
                await db.challengeInstance.update({ where: { id: instance.id }, data: { status: 'RUNNING' } });
                instance.status = 'RUNNING';
            }
        }

        res.json(instance);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get instance' });
    }
};

// ─── DELETE /challenges/:id/instance ───────────────────────────────────────────
export const stopInstance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id: challengeId } = req.params as { id: string };
        const instance = await db.challengeInstance.findFirst({
            where: { userId, challengeId, status: { in: ['STARTING', 'RUNNING'] } }
        });

        if (!instance) { res.status(404).json({ error: 'No active instance' }); return; }

        if (instance.flyAppName && instance.flyMachineId) {
            await destroyMachine(instance.flyAppName, instance.flyMachineId);
        }

        await db.challengeInstance.update({ where: { id: instance.id }, data: { status: 'STOPPED' } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to stop instance' });
    }
};

// ─── Admin: GET /admin/instances ───────────────────────────────────────────────
export const getAllInstances = async (_req: AuthRequest, res: Response) => {
    try {
        const instances = await db.challengeInstance.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                user: { select: { username: true, email: true } },
                challenge: { select: { title: true } }
            }
        });
        res.json(instances);
    } catch {
        res.status(500).json({ error: 'Failed to fetch instances' });
    }
};
