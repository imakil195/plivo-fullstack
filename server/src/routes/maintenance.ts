import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkOrgAccess, requireRole } from '../middleware/orgAccess';
import { emitToOrg } from '../socket';

const router = Router();

router.use(authenticate, checkOrgAccess);

// GET /api/maintenance
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const maintenance = await prisma.maintenance.findMany({
            where: {
                service: { organizationId: req.user!.orgId },
            },
            include: {
                service: { select: { id: true, name: true } },
            },
            orderBy: { scheduledStart: 'asc' },
        });
        res.json(maintenance);
    } catch (error) {
        console.error('List maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/maintenance
router.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, serviceId, scheduledStart, scheduledEnd } = req.body;

        if (!title || !serviceId || !scheduledStart || !scheduledEnd) {
            res.status(400).json({ error: 'Title, serviceId, scheduledStart, and scheduledEnd are required' });
            return;
        }

        const service = await prisma.service.findFirst({
            where: { id: serviceId, organizationId: req.user!.orgId },
        });

        if (!service) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        const maintenance = await prisma.maintenance.create({
            data: {
                title,
                description: description || null,
                serviceId,
                scheduledStart: new Date(scheduledStart),
                scheduledEnd: new Date(scheduledEnd),
            },
            include: {
                service: { select: { id: true, name: true } },
            },
        });

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'maintenance:created', maintenance);

        res.status(201).json(maintenance);
    } catch (error) {
        console.error('Create maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/maintenance/:id
router.patch('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { title, description, status, scheduledStart, scheduledEnd } = req.body;

        const existing = await prisma.maintenance.findFirst({
            where: { id, service: { organizationId: req.user!.orgId } },
        });

        if (!existing) {
            res.status(404).json({ error: 'Maintenance not found' });
            return;
        }

        const validStatuses = ['scheduled', 'in_progress', 'completed'];
        if (status && !validStatuses.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }

        const maintenance = await prisma.maintenance.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(status !== undefined && { status }),
                ...(scheduledStart !== undefined && { scheduledStart: new Date(scheduledStart) }),
                ...(scheduledEnd !== undefined && { scheduledEnd: new Date(scheduledEnd) }),
            },
            include: {
                service: { select: { id: true, name: true } },
            },
        });

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'maintenance:updated', maintenance);

        res.json(maintenance);
    } catch (error) {
        console.error('Update maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/maintenance/:id
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const existing = await prisma.maintenance.findFirst({
            where: { id, service: { organizationId: req.user!.orgId } },
        });

        if (!existing) {
            res.status(404).json({ error: 'Maintenance not found' });
            return;
        }

        await prisma.maintenance.delete({ where: { id } });

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'maintenance:deleted', { maintenanceId: id });

        res.json({ message: 'Maintenance deleted' });
    } catch (error) {
        console.error('Delete maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
