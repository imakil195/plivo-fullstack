import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkOrgAccess, requireRole } from '../middleware/orgAccess';
import { emitToOrg } from '../socket';

const router = Router();

// All routes require authentication and org access
router.use(authenticate, checkOrgAccess);

// GET /api/services
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const services = await prisma.service.findMany({
            where: { organizationId: req.user!.orgId },
            include: {
                _count: { select: { incidents: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(services);
    } catch (error) {
        console.error('List services error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/services
router.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Service name is required' });
            return;
        }

        const service = await prisma.service.create({
            data: {
                name,
                description: description || null,
                organizationId: req.user!.orgId,
            },
        });

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'service:created', service);

        res.status(201).json(service);
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/services/:id
router.patch('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { name, description, status } = req.body;

        // Verify service belongs to the org
        const existing = await prisma.service.findFirst({
            where: { id, organizationId: req.user!.orgId },
        });

        if (!existing) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        const validStatuses = ['operational', 'degraded', 'partial_outage', 'major_outage'];
        if (status && !validStatuses.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }

        const service = await prisma.service.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(status !== undefined && { status }),
            },
        });

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'service:updated', service);

        if (status && status !== existing.status) {
            emitToOrg(io, req.user!.orgId, 'service:status_changed', {
                serviceId: service.id,
                serviceName: service.name,
                oldStatus: existing.status,
                newStatus: status,
            });
        }

        res.json(service);
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/services/:id
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const existing = await prisma.service.findFirst({
            where: { id, organizationId: req.user!.orgId },
        });

        if (!existing) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        await prisma.service.delete({ where: { id } });

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'service:deleted', { serviceId: id });

        res.json({ message: 'Service deleted' });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
