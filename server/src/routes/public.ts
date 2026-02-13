import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/public/:slug/status
router.get('/:slug/status', async (req: Request, res: Response) => {
    try {
        const { slug } = req.params as { slug: string };

        const org = await prisma.organization.findUnique({
            where: { slug },
            select: { id: true, name: true, slug: true },
        });

        if (!org) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const services = await prisma.service.findMany({
            where: { organizationId: org.id },
            select: {
                id: true,
                name: true,
                description: true,
                status: true,
                updatedAt: true,
            },
            orderBy: { name: 'asc' },
        });

        // Determine overall status
        const statuses = services.map((s) => s.status);
        let overallStatus = 'operational';
        if (statuses.includes('major_outage')) {
            overallStatus = 'major_outage';
        } else if (statuses.includes('partial_outage')) {
            overallStatus = 'partial_outage';
        } else if (statuses.includes('degraded')) {
            overallStatus = 'degraded';
        }

        res.json({
            organization: org,
            overallStatus,
            services,
        });
    } catch (error) {
        console.error('Public status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/public/:slug/incidents
router.get('/:slug/incidents', async (req: Request, res: Response) => {
    try {
        const { slug } = req.params as { slug: string };

        const org = await prisma.organization.findUnique({
            where: { slug },
        });

        if (!org) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        // Active incidents
        const activeIncidents = await prisma.incident.findMany({
            where: {
                service: { organizationId: org.id },
                status: { not: 'resolved' },
            },
            include: {
                service: { select: { id: true, name: true } },
                updates: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Recent resolved incidents (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentIncidents = await prisma.incident.findMany({
            where: {
                service: { organizationId: org.id },
                status: 'resolved',
                resolvedAt: { gte: sevenDaysAgo },
            },
            include: {
                service: { select: { id: true, name: true } },
                updates: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { resolvedAt: 'desc' },
            take: 20,
        });

        res.json({
            active: activeIncidents,
            recent: recentIncidents,
        });
    } catch (error) {
        console.error('Public incidents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/public/:slug/maintenance
router.get('/:slug/maintenance', async (req: Request, res: Response) => {
    try {
        const { slug } = req.params as { slug: string };

        const org = await prisma.organization.findUnique({
            where: { slug },
        });

        if (!org) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const now = new Date();

        const maintenance = await prisma.maintenance.findMany({
            where: {
                service: { organizationId: org.id },
                status: { not: 'completed' },
                scheduledEnd: { gte: now },
            },
            include: {
                service: { select: { id: true, name: true } },
            },
            orderBy: { scheduledStart: 'asc' },
        });

        res.json(maintenance);
    } catch (error) {
        console.error('Public maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
