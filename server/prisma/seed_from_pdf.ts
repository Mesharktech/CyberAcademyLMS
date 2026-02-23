import { PrismaClient, UserRole, ModuleType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const DATA_FILE = path.join(__dirname, 'data/extracted_content.json');

async function main() {
    if (!fs.existsSync(DATA_FILE)) {
        console.log('No extracted content found. Skipping.');
        return;
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const modules = JSON.parse(rawData);

    // Get Admin User for instructorId
    const admin = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN }
    });

    if (!admin) {
        console.error('Admin user not found. Cannot seed courses.');
        return;
    }

    console.log(`Found ${modules.length} PDFs to ingest...`);

    for (const item of modules) {
        const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Create Course
        const course = await prisma.course.upsert({
            where: { slug },
            update: {},
            create: {
                title: item.title,
                slug,
                description: `Imported study material for ${item.title}. Difficulty Level: ${item.difficulty}/5`,
                instructorId: admin.id,
                isPublished: true,
                price: 0,
            }
        });

        console.log(`Upserted Course: ${course.title}`);

        // Create Module
        await prisma.module.create({
            data: {
                courseId: course.id,
                title: "Complete Study Guide",
                orderIndex: 0,
                type: ModuleType.TEXT,
                content: item.content.substring(0, 10000), // Limit char count for safety
            }
        });
    }

    console.log('Ingestion Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
