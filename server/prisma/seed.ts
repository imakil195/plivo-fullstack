import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Seeding database...');

    // Clean existing data
    await prisma.incidentUpdate.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.maintenance.deleteMany();
    await prisma.service.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    // Create admin user
    const passwordHash = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@acme.com',
            passwordHash,
        },
    });

    // Create organization
    const org = await prisma.organization.create({
        data: {
            name: 'Acme Corp',
            slug: 'acme',
        },
    });

    // Create team + member
    const team = await prisma.team.create({
        data: {
            name: 'Default',
            organizationId: org.id,
        },
    });

    await prisma.teamMember.create({
        data: {
            userId: admin.id,
            teamId: team.id,
            role: 'admin',
        },
    });

    // Create services
    const services = await Promise.all([
        prisma.service.create({
            data: { name: 'Website', description: 'Main marketing website and landing pages', status: 'operational', organizationId: org.id },
        }),
        prisma.service.create({
            data: { name: 'API', description: 'REST API and backend services', status: 'operational', organizationId: org.id },
        }),
        prisma.service.create({
            data: { name: 'Database', description: 'Primary PostgreSQL cluster', status: 'operational', organizationId: org.id },
        }),
        prisma.service.create({
            data: { name: 'CDN', description: 'Content delivery and static assets', status: 'degraded', organizationId: org.id },
        }),
        prisma.service.create({
            data: { name: 'Email Service', description: 'Transactional email delivery', status: 'operational', organizationId: org.id },
        }),
    ]);

    // Create an active incident
    const apiIncident = await prisma.incident.create({
        data: {
            title: 'Elevated API Latency',
            description: 'We are investigating reports of increased response times on the API.',
            status: 'identified',
            serviceId: services[1].id,
        },
    });

    await prisma.incidentUpdate.createMany({
        data: [
            {
                message: 'We are investigating reports of slow API responses affecting some users.',
                status: 'investigating',
                incidentId: apiIncident.id,
                createdAt: new Date(Date.now() - 3600000), // 1 hour ago
            },
            {
                message: 'Root cause identified — a downstream dependency is experiencing high load. We are implementing a workaround.',
                status: 'identified',
                incidentId: apiIncident.id,
                createdAt: new Date(Date.now() - 1800000), // 30 min ago
            },
        ],
    });

    // Create a resolved incident
    const resolvedIncident = await prisma.incident.create({
        data: {
            title: 'CDN Cache Invalidation Failure',
            description: 'Static assets were not being updated after deployment.',
            status: 'resolved',
            serviceId: services[3].id,
            resolvedAt: new Date(Date.now() - 86400000), // resolved 1 day ago
        },
    });

    await prisma.incidentUpdate.createMany({
        data: [
            {
                message: 'We detected that CDN cache invalidation is failing after deployments.',
                status: 'investigating',
                incidentId: resolvedIncident.id,
                createdAt: new Date(Date.now() - 172800000),
            },
            {
                message: 'A fix has been deployed. Cache invalidation is now working correctly.',
                status: 'resolved',
                incidentId: resolvedIncident.id,
                createdAt: new Date(Date.now() - 86400000),
            },
        ],
    });

    // Create a scheduled maintenance
    await prisma.maintenance.create({
        data: {
            title: 'Database Migration — Schema Update',
            description: 'Planned migration to add new indexes and optimize query performance. Expected downtime: 5-10 minutes.',
            status: 'scheduled',
            serviceId: services[2].id,
            scheduledStart: new Date(Date.now() + 86400000 * 2), // 2 days from now
            scheduledEnd: new Date(Date.now() + 86400000 * 2 + 3600000), // 2 days + 1 hour
        },
    });

    console.log('✅ Seeding complete!');
    console.log('');
    console.log('Demo credentials:');
    console.log('  Email: admin@acme.com');
    console.log('  Password: password123');
    console.log('');
    console.log(`Public status page: http://localhost:5173/status/acme`);
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
