import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkOrgAccess, requireRole } from '../middleware/orgAccess';
import { emitToOrg } from '../socket';

const router = Router();

router.use(authenticate, checkOrgAccess);

// GET /api/incidents
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.query as { status?: string };

        const incidents = await prisma.incident.findMany({
            where: {
                service: { organizationId: req.user!.orgId },
                ...(status ? { status: status as string } : {}),
            },
            include: {
                service: { select: { id: true, name: true, status: true } },
                updates: { orderBy: { createdAt: 'desc' } },
                _count: { select: { updates: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(incidents);
    } catch (error) {
        console.error('List incidents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/incidents
router.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, serviceId, status } = req.body;

        if (!title || !serviceId) {
            res.status(400).json({ error: 'Title and serviceId are required' });
            return;
        }

        // Verify service belongs to org
        const service = await prisma.service.findFirst({
            where: { id: serviceId, organizationId: req.user!.orgId },
        });

        if (!service) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        const incident = await prisma.incident.create({
            data: {
                title,
                description: description || null,
                status: status || 'investigating',
                serviceId,
            },
            include: {
                service: { select: { id: true, name: true } },
                updates: true,
            },
        });

        // Create initial update
        await prisma.incidentUpdate.create({
            data: {
                message: description || `Incident "${title}" created`,
                status: incident.status,
                incidentId: incident.id,
            },
        });

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'incident:created', incident);

        res.status(201).json(incident);
    } catch (error) {
        console.error('Create incident error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/incidents/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const incident = await prisma.incident.findFirst({
            where: {
                id,
                service: { organizationId: req.user!.orgId },
            },
            include: {
                service: { select: { id: true, name: true, status: true } },
                updates: { orderBy: { createdAt: 'asc' } },
            },
        });

        if (!incident) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }

        res.json(incident);
    } catch (error) {
        console.error('Get incident error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/incidents/:id
router.patch('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { title, description, status } = req.body;

        const existing = await prisma.incident.findFirst({
            where: { id, service: { organizationId: req.user!.orgId } },
        });

        if (!existing) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }

        const validStatuses = ['investigating', 'identified', 'monitoring', 'resolved'];
        if (status && !validStatuses.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }

        const incident = await prisma.incident.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(status !== undefined && { status }),
                ...(status === 'resolved' && { resolvedAt: new Date() }),
            },
            include: {
                service: { select: { id: true, name: true } },
                updates: { orderBy: { createdAt: 'desc' } },
            },
        });

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'incident:updated', incident);

        res.json(incident);
    } catch (error) {
        console.error('Update incident error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/incidents/:id/updates
router.post('/:id/updates', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { message, status } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const incident = await prisma.incident.findFirst({
            where: { id, service: { organizationId: req.user!.orgId } },
        });

        if (!incident) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }

        const newStatus = status || incident.status;

        // Create the update and optionally change incident status
        const [update, updatedIncident] = await prisma.$transaction([
            prisma.incidentUpdate.create({
                data: {
                    message,
                    status: newStatus,
                    incidentId: id,
                },
            }),
            prisma.incident.update({
                where: { id },
                data: {
                    status: newStatus,
                    ...(newStatus === 'resolved' && { resolvedAt: new Date() }),
                },
                include: {
                    service: { select: { id: true, name: true } },
                    updates: { orderBy: { createdAt: 'desc' } },
                },
            }),
        ]);

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'incident:updated', updatedIncident);

        if (newStatus === 'resolved') {
            emitToOrg(io, req.user!.orgId, 'incident:resolved', updatedIncident);
        }

        res.status(201).json({ update, incident: updatedIncident });
    } catch (error) {
        console.error('Add incident update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/incidents/:id/resolve
router.patch('/:id/resolve', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { message } = req.body;

        const existing = await prisma.incident.findFirst({
            where: { id, service: { organizationId: req.user!.orgId } },
        });

        if (!existing) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }

        // Create resolved update and update incident
        const [update, incident] = await prisma.$transaction([
            prisma.incidentUpdate.create({
                data: {
                    message: message || 'This incident has been resolved.',
                    status: 'resolved',
                    incidentId: id,
                },
            }),
            prisma.incident.update({
                where: { id },
                data: {
                    status: 'resolved',
                    resolvedAt: new Date(),
                },
                include: {
                    service: { select: { id: true, name: true } },
                    updates: { orderBy: { createdAt: 'desc' } },
                },
            }),
        ]);

        const io = req.app.get('io');
        emitToOrg(io, req.user!.orgId, 'incident:resolved', incident);

        res.json({ update, incident });
    } catch (error) {
        console.error('Resolve incident error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
