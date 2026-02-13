
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users.`);
        // users.forEach(u => console.log(`- User: ${u.email} (${u.id})`));

        const orgs = await prisma.organization.findMany();
        console.log(`Found ${orgs.length} organizations.`);
        // orgs.forEach(o => console.log(`- Org: ${o.name} (${o.id}) slug: ${o.slug}`));

        const teams = await prisma.team.findMany();
        console.log(`Found ${teams.length} teams.`);

        const members = await prisma.teamMember.findMany();
        console.log(`Found ${members.length} team members.`);

        // Check for Invite model
        if ('invite' in prisma) {
            // @ts-ignore
            const invites = await prisma.invite.findMany();
            console.log(`Found ${invites.length} invites.`);
        } else {
            console.log('Prisma Invite model NOT found in client!');
        }

    } catch (e) {
        console.error('Error connecting to database:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
