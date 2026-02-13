import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Attempting to fix apple slug...');

    // Find checking by name first
    const orgs = await prisma.organization.findMany();
    const appleOrg = orgs.find(o => o.name.toLowerCase() === 'apple' || o.slug.startsWith('apple-'));

    if (!appleOrg) {
        console.log('Organization "apple" not found.');
        return;
    }

    console.log(`Found organization: ${appleOrg.name} (${appleOrg.slug})`);

    try {
        await prisma.organization.update({
            where: { id: appleOrg.id },
            data: { slug: 'apple' },
        });
        console.log('Successfully updated slug to "apple".');
    } catch (error) {
        console.error('Failed to update slug. It might be taken or DB error.', error);
    }

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
