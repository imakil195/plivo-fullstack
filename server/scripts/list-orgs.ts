import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to Prisma...');
        const orgs = await prisma.organization.findMany();
        console.log(`Found ${orgs.length} orgs.`);
        fs.writeFileSync('/Users/akilsaran/Desktop/plivo-fullstack/server/orgs.json', JSON.stringify(orgs, null, 2));
        console.log('Wrote to orgs.json');
    } catch (e) {
        console.error(e);
        fs.writeFileSync('/Users/akilsaran/Desktop/plivo-fullstack/server/error.log', String(e));
    } finally {
        await prisma.$disconnect();
    }
}

main();
