import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const p = await prisma.userProgress.findMany();
    console.log("All User Progress rows:", p);

    const users = await prisma.user.findMany();
    console.log("Users:", users.map(u => ({ id: u.id, username: u.username })));
}

check().catch(console.error).finally(() => prisma.$disconnect());
