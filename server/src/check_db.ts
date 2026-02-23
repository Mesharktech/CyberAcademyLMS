
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        include: { modules: true }
    });
    console.log('Courses found:', courses.length);
    courses.forEach(c => {
        console.log(`TITLE: "${c.title}"`);
        console.log(`SLUG:  "${c.slug}"`);
        console.log(`ID:    "${c.id}"`);
        console.log(`MODULES: ${c.modules.length}`);
        console.log('-----------------------------------');
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
