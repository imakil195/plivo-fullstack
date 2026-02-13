import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Resetting database...');

    // Order matters for relational integrity if not using Cascade (though schema has them)
    // Using a transaction to ensure all or nothing
    await prisma.$transaction([
        prisma.incidentUpdate.deleteMany(),
        prisma.incident.deleteMany(),
        prisma.maintenance.deleteMany(),
        prisma.service.deleteMany(),
        prisma.invite.deleteMany(),
        prisma.teamMember.deleteMany(),
        prisma.team.deleteMany(),
        prisma.organization.deleteMany(),
        prisma.user.deleteMany(),
    ]);

    console.log('✅ Database reset successfully. All tables cleared.');
}

main()
    .catch((e) => {
        console.error('❌ Error resetting database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
