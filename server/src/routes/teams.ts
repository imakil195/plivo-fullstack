import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkOrgAccess, requireRole } from '../middleware/orgAccess';

const router = Router();

router.use(authenticate, checkOrgAccess);

// GET /api/teams/members
router.get('/members', async (req: AuthRequest, res: Response) => {
    try {
        const members = await prisma.teamMember.findMany({
            where: {
                team: { organizationId: req.user!.orgId },
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                team: { select: { id: true, name: true } },
            },
        });
        res.json(members);
    } catch (error) {
        console.error('List members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/teams/invite
router.post('/invite', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { email, name, password, role } = req.body;

        if (!email || !name || !password) {
            res.status(400).json({ error: 'Email, name, and password are required' });
            return;
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            const passwordHash = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
                data: { email, name, passwordHash },
            });
        }

        // Find the default team for this org
        const team = await prisma.team.findFirst({
            where: { organizationId: req.user!.orgId },
        });

        if (!team) {
            res.status(500).json({ error: 'No team found for organization' });
            return;
        }

        // Check if already a member
        const existingMember = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: user.id, teamId: team.id } },
        });

        if (existingMember) {
            res.status(400).json({ error: 'User is already a member' });
            return;
        }

        const member = await prisma.teamMember.create({
            data: {
                userId: user.id,
                teamId: team.id,
                role: role || 'member',
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(201).json(member);
    } catch (error) {
        console.error('Invite member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/teams/members/:id/role
router.patch('/members/:id/role', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { role } = req.body;

        if (!role || !['admin', 'member'].includes(role)) {
            res.status(400).json({ error: 'Valid role is required (admin or member)' });
            return;
        }

        const member = await prisma.teamMember.findFirst({
            where: { id, team: { organizationId: req.user!.orgId } },
        });

        if (!member) {
            res.status(404).json({ error: 'Member not found' });
            return;
        }

        const updated = await prisma.teamMember.update({
            where: { id },
            data: { role },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        res.json(updated);
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/teams/members/:id
router.delete('/members/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const member = await prisma.teamMember.findFirst({
            where: { id, team: { organizationId: req.user!.orgId } },
        });

        if (!member) {
            res.status(404).json({ error: 'Member not found' });
            return;
        }

        // Prevent removing yourself
        if (member.userId === req.user!.userId) {
            res.status(400).json({ error: 'Cannot remove yourself' });
            return;
        }

        await prisma.teamMember.delete({ where: { id } });

        res.json({ message: 'Member removed' });
    } catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
