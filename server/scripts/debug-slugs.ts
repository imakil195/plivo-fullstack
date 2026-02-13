import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing organizations:');
    const orgs = await prisma.organization.findMany();

    if (orgs.length === 0) {
        console.log('No organizations found.');
    } else {
        orgs.forEach(o => {
            console.log(`- ID: ${o.id}, Name: "${o.name}", Slug: "${o.slug}"`);
        });
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
