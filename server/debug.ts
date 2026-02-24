import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, username: true, isEmailVerified: true }
    });
    fs.writeFileSync('output.json', JSON.stringify(users, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
