import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/utils/helpers';

const prisma = new PrismaClient();

async function migrateSlugs() {
    console.log('Starting slug migration...');
    const organizations = await prisma.organization.findMany();

    for (const org of organizations) {
        let baseSlug = slugify(org.name);
        let newSlug = baseSlug;
        let counter = 1;

        // Check if slug exists (exclude current org)
        while (true) {
            const existing = await prisma.organization.findFirst({
                where: {
                    slug: newSlug,
                    id: { not: org.id },
                },
            });

            if (!existing) break;

            counter++;
            newSlug = `${baseSlug}-${counter}`;
        }

        if (newSlug !== org.slug) {
            console.log(`Updating ${org.name}: ${org.slug} -> ${newSlug}`);
            await prisma.organization.update({
                where: { id: org.id },
                data: { slug: newSlug },
            });
        }
    }

    console.log('Migration complete.');
    await prisma.$disconnect();
}

migrateSlugs().catch((e) => {
    console.error(e);
    process.exit(1);
});
