import axios, { AxiosError } from 'axios';

const FLY_API_TOKEN = process.env.FLY_API_TOKEN;
const FLY_ORG_SLUG = process.env.FLY_ORG_SLUG || 'personal';
const FLY_REGION = process.env.FLY_REGION || 'jnb';

const fly = axios.create({
    baseURL: 'https://api.machines.dev/v1',
    headers: {
        Authorization: `Bearer ${FLY_API_TOKEN}`,
        'Content-Type': 'application/json'
    },
    timeout: 45000
});

function appName(challengeId: string): string {
    return `sherk-${challengeId.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

async function ensureApp(name: string): Promise<void> {
    try {
        await fly.post('/apps', { app_name: name, org_slug: FLY_ORG_SLUG });
    } catch (e: any) {
        const msg = JSON.stringify(e.response?.data || '');
        if (!msg.toLowerCase().includes('already exist') && !msg.toLowerCase().includes('taken')) throw e;
    }
}

// Deploy a challenge to Fly.io — returns the live URL
export async function deployChallenge(challengeId: string, appCode: string, flag: string): Promise<{
    appName: string;
    machineId: string;
    url: string;
}> {
    if (!FLY_API_TOKEN) throw new Error('FLY_API_TOKEN not configured on server');

    const name = appName(challengeId);
    const encoded = Buffer.from(appCode).toString('base64');

    await ensureApp(name);

    // Destroy existing machine if any (redeploy)
    try {
        const { data: machines } = await fly.get(`/apps/${name}/machines`);
        for (const m of machines || []) {
            await fly.delete(`/apps/${name}/machines/${m.id}?force=true`).catch(() => {});
        }
    } catch { /* no existing machines */ }

    const { data: machine } = await fly.post(`/apps/${name}/machines`, {
        name: 'challenge',
        region: FLY_REGION,
        config: {
            image: 'python:3.11-slim',
            env: {
                APP_CODE: encoded,
                FLAG: flag,
                PORT: '5000'
            },
            init: {
                cmd: [
                    'sh', '-c',
                    'pip install flask -q 2>/dev/null && echo "$APP_CODE" | base64 -d > /challenge.py && python /challenge.py'
                ]
            },
            services: [{
                ports: [
                    { port: 443, handlers: ['tls', 'http'] },
                    { port: 80, handlers: ['http'] }
                ],
                protocol: 'tcp',
                internal_port: 5000
            }],
            guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 512 },
            restart: { policy: 'no' }
        }
    });

    return {
        appName: name,
        machineId: machine.id,
        url: `https://${name}.fly.dev`
    };
}

export async function stopMachine(appN: string, machineId: string): Promise<void> {
    if (!FLY_API_TOKEN) return;
    await fly.post(`/apps/${appN}/machines/${machineId}/stop`).catch(() => {});
}

export async function destroyMachine(appN: string, machineId: string): Promise<void> {
    if (!FLY_API_TOKEN) return;
    await fly.delete(`/apps/${appN}/machines/${machineId}?force=true`).catch(() => {});
}

export async function getMachineStatus(appN: string, machineId: string): Promise<string> {
    if (!FLY_API_TOKEN) return 'unknown';
    try {
        const { data } = await fly.get(`/apps/${appN}/machines/${machineId}`);
        return data.state || 'unknown';
    } catch {
        return 'unknown';
    }
}
