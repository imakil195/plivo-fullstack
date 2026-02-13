import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

import crypto from 'crypto';
import { sendInviteEmail } from '../lib/email';

// GET /api/teams/invites
router.get('/invites', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const invites = await prisma.invite.findMany({
            where: {
                team: { organizationId: req.user!.orgId },
            },
            orderBy: { createdAt: 'desc' },
        });

        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const invitesWithLinks = invites.map((invite: any) => ({
            ...invite,
            link: `${baseUrl}/accept-invite?token=${invite.token}`
        }));

        res.json(invitesWithLinks);
    } catch (error) {
        console.error('List invites error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/teams/quick-add (Direct Bypass for Demo)
router.post('/quick-add', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { email, name, role } = req.body;

        if (!email || !name) {
            return res.status(400).json({ error: 'Email and name are required' });
        }

        // Find the team
        const team = await prisma.team.findFirst({
            where: { organizationId: req.user!.orgId },
            include: { organization: true }
        });

        if (!team) {
            return res.status(500).json({ error: 'No team found' });
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Create user with a dummy password if they don't exist
            // This is just for demo purposes as requested
            const passwordHash = await require('bcryptjs').hash('demo123!', 10);
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    passwordHash
                }
            });
        }

        // Check if already in team
        const existingMember = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId: user.id,
                    teamId: team.id
                }
            }
        });

        if (existingMember) {
            return res.status(400).json({ error: 'User is already a member of this team' });
        }

        const member = await prisma.teamMember.create({
            data: {
                userId: user.id,
                teamId: team.id,
                role: role || 'member'
            },
            include: {
                user: true,
                team: { include: { organization: true } }
            }
        });

        // Generate JWT for the NEW user so the admin can switch
        const token = jwt.sign(
            { userId: user.id, orgId: team.organizationId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            member,
            token,
            organization: team.organization
        });
    } catch (error) {
        console.error('Quick add error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/teams/invites/:id
router.delete('/invites/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.invite.delete({
            where: { id },
        });
        res.json({ message: 'Invite revoked' });
    } catch (error) {
        console.error('Revoke invite error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/teams/invite
router.post('/invite', requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { email, role } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Find the team
        const team = await prisma.team.findFirst({
            where: { organizationId: req.user!.orgId },
            include: { organization: true }
        });

        if (!team) {
            res.status(500).json({ error: 'No team found' });
            return;
        }

        // Check if user is already a member
        const existingMember = await prisma.teamMember.findFirst({
            where: {
                teamId: team.id,
                user: { email },
            },
        });

        if (existingMember) {
            res.status(400).json({ error: 'User is already a member of this team' });
            return;
        }

        // Check if user exists but is not in team - if so, add them directly
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            const member = await prisma.teamMember.create({
                data: {
                    userId: existingUser.id,
                    teamId: team.id,
                    role: role || 'member'
                },
                include: { user: { select: { id: true, name: true, email: true } } }
            });
            return res.status(200).json({ directAdded: true, member });
        }

        // Check if invite already exists
        const existingInvite = await prisma.invite.findFirst({
            where: {
                teamId: team.id,
                email,
            },
        });

        if (existingInvite) {
            res.status(400).json({ error: 'Invite already sent to this email' });
            return;
        }

        // Create invite
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invite = await prisma.invite.create({
            data: {
                email,
                role: role || 'member',
                teamId: team.id,
                token,
                expiresAt,
            },
        });

        // Send email
        const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invite?token=${token}`;
        await sendInviteEmail(email, inviteLink, team.name);

        res.status(201).json(invite);
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
