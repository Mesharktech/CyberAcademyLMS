import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'mesharkmuindi69@gmail.com' } });

    if (user) {
        let baseUsername = 'mesharkmuindi69';
        let username = baseUsername;
        let counter = 1;

        // Check if the target username already exists and belongs to someone else
        let existing = await prisma.user.findUnique({ where: { username } });
        while (existing && existing.id !== user.id) {
            username = `${baseUsername}${counter}`;
            counter++;
            existing = await prisma.user.findUnique({ where: { username } });
        }

        await prisma.user.update({
            where: { email: 'mesharkmuindi69@gmail.com' },
            data: { username }
        });
        console.log(`Updated username to ${username}`);
    } else {
        console.log('User not found');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
