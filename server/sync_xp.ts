import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Retroactive XP Sync...");
    const users = await prisma.user.findMany({
        include: { progress: { include: { module: true } } }
    });

    for (const user of users) {
        if (user.role === 'ADMIN') continue;

        let xp = 0;
        for (const p of user.progress) {
            if (p.completed) {
                xp += (p.module?.xpReward || 50);
            }
        }

        let newRank = 1;
        if (xp >= 1000) newRank = 2; // Operative
        if (xp >= 5000) newRank = 3; // Specialist
        if (xp >= 15000) newRank = 4; // Ghost

        await prisma.user.update({
            where: { id: user.id },
            data: { xp, rank: newRank }
        });
        console.log(`Updated user ${user.username} to XP: ${xp}, Rank: ${newRank}`);
    }
    console.log("XP Sync Complete.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
