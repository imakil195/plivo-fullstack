const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const logPath = path.join(__dirname, '../fix_log.txt');

async function main() {
    try {
        fs.writeFileSync(logPath, 'Starting fix script...\n');

        const orgs = await prisma.organization.findMany();
        fs.appendFileSync(logPath, `Found ${orgs.length} orgs in DB:\n`);
        orgs.forEach(o => fs.appendFileSync(logPath, `- ${o.name} (${o.slug})\n`));

        const apple = orgs.find(o => o.name.toLowerCase().includes('apple'));

        if (apple) {
            fs.appendFileSync(logPath, `Targeting org: ${apple.name} (${apple.slug})\n`);

            // Toggle slug to avoid unique constraint if 'apple' is taken by itself (unlikely if we just found it)
            // But if 'apple' exists as another org, this will fail.
            // Check if 'apple' slug exists
            const conflict = orgs.find(o => o.slug === 'apple' && o.id !== apple.id);
            if (conflict) {
                fs.appendFileSync(logPath, `Conflict! 'apple' slug already taken by ${conflict.name}\n`);
                // Rename conflict
                await prisma.organization.update({
                    where: { id: conflict.id },
                    data: { slug: `apple-conflict-${Date.now()}` }
                });
                fs.appendFileSync(logPath, `Renamed conflict to avoid collision.\n`);
            }

            if (apple.slug !== 'apple') {
                await prisma.organization.update({
                    where: { id: apple.id },
                    data: { slug: 'apple' }
                });
                fs.appendFileSync(logPath, `SUCCESS: Updated slug to 'apple'\n`);
            } else {
                fs.appendFileSync(logPath, `Slug is already 'apple'. No change needed.\n`);
            }
        } else {
            fs.appendFileSync(logPath, `ERROR: Organization with name 'apple' not found.\n`);
        }
    } catch (e) {
        fs.appendFileSync(logPath, `CRITICAL ERROR: ${e.message}\n${e.stack}\n`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
