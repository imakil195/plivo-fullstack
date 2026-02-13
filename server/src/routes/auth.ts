import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateUniqueSlug } from '../utils/helpers';
import { log } from '../utils/logger';

const router = Router();

// POST /api/auth/check-slug
router.post('/check-slug', async (req: Request, res: Response) => {
    try {
        const { slug } = req.body;
        if (!slug) {
            res.status(400).json({ error: 'Slug is required' });
            return;
        }

        const existingOrg = await prisma.organization.findUnique({ where: { slug } });
        res.json({ available: !existingOrg });
    } catch (error) {
        console.error('Check slug error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { name, email, password, organizationName, slug } = req.body;

        if (!name || !email || !password || !organizationName) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'Email already in use' });
            return;
        }

        // Validate slug if provided, otherwise generate one
        let orgSlug = slug;
        if (orgSlug) {
            const existingOrg = await prisma.organization.findUnique({ where: { slug: orgSlug } });
            if (existingOrg) {
                res.status(400).json({ error: 'Organization URL is already taken' });
                return;
            }
        } else {
            let baseSlug = generateUniqueSlug(organizationName);
            orgSlug = baseSlug;
            let counter = 1;
            while (await prisma.organization.findUnique({ where: { slug: orgSlug } })) {
                orgSlug = `${baseSlug}-${counter}`;
                counter++;
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Create user, org, team, and team member in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { name, email, passwordHash },
            });

            const organization = await tx.organization.create({
                data: { name: organizationName, slug: orgSlug },
            });

            const team = await tx.team.create({
                data: {
                    name: 'Default',
                    organizationId: organization.id,
                },
            });

            await tx.teamMember.create({
                data: {
                    userId: user.id,
                    teamId: team.id,
                    role: 'admin',
                },
            });

            return { user, organization };
        });

        const token = jwt.sign(
            { userId: result.user.id, orgId: result.organization.id },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
            },
            organization: {
                id: result.organization.id,
                name: result.organization.name,
                slug: result.organization.slug,
            },
        });
    } catch (error) {
        log('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Find the user's organization
        const teamMember = await prisma.teamMember.findFirst({
            where: { userId: user.id },
            include: { team: { include: { organization: true } } },
        });

        if (!teamMember) {
            res.status(400).json({ error: 'User is not part of any organization' });
            return;
        }

        const org = teamMember.team.organization;

        const token = jwt.sign(
            { userId: user.id, orgId: org.id },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
            organization: { id: org.id, name: org.name, slug: org.slug },
        });
    } catch (error) {
        log('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/invite/:token
router.get('/invite/:token', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const invite = await prisma.invite.findUnique({
            where: { token },
            include: { team: { select: { name: true, organization: { select: { name: true } } } } }
        });

        if (!invite) {
            res.status(404).json({ error: 'Invite not found' });
            return;
        }

        if (invite.expiresAt < new Date()) {
            res.status(410).json({ error: 'Invite expired' });
            return;
        }

        const userExists = await prisma.user.findUnique({ where: { email: invite.email } });

        res.json({
            email: invite.email,
            teamName: invite.team.name,
            orgName: invite.team.organization.name,
            userExists: !!userExists
        });
    } catch (error) {
        console.error('Get invite error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/accept-invite
router.post('/accept-invite', async (req: Request, res: Response) => {
    try {
        const { token, name, password } = req.body;

        const invite = await prisma.invite.findUnique({
            where: { token },
        });

        if (!invite) {
            res.status(404).json({ error: 'Invite not found' });
            return;
        }

        if (invite.expiresAt < new Date()) {
            res.status(410).json({ error: 'Invite expired' });
            return;
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({ where: { email: invite.email } });

        if (user) {
            // User exists, just link them
            // If they provided password, we ignore it or could verify it (but complicate things)
            // For now, if user exists, we assume they are logged in or will log in.
            // Actually, if they are hitting this endpoint, they might not be logged in. 
            // If they are existing user, they should probably just "accept" without password if they are logged in?
            // Simplified flow: If user exists, we just add them. If they aren't logged in, they will have to login separately? 
            // Better: If user exists, we add them to team and return token so they are logged in.

            // To be secure, if user exists, we should probably require them to login first to accept? 
            // OR: We trust the token from email. If they have the token, they own the email.
            // So we can log them in.
        } else {
            // New user
            if (!name || !password) {
                return res.status(400).json({ error: 'Name and password required for new account' });
            }
            const passwordHash = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
                data: {
                    email: invite.email,
                    name,
                    passwordHash,
                },
            });
        }

        // Add to team
        // Check if already in team
        const existingMember = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: user.id, teamId: invite.teamId } },
        });

        if (!existingMember) {
            await prisma.teamMember.create({
                data: {
                    userId: user.id,
                    teamId: invite.teamId,
                    role: invite.role,
                },
            });
        }

        // Delete invite
        await prisma.invite.delete({ where: { id: invite.id } });

        // Generate JWT
        // We need an org ID for the JWT. Use the invited team's org.
        const team = await prisma.team.findUnique({
            where: { id: invite.teamId },
            select: { organizationId: true, organization: true }
        });

        const tokenJWT = jwt.sign(
            { userId: user.id, orgId: team!.organizationId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({
            token: tokenJWT,
            user: { id: user.id, name: user.name, email: user.email },
            organization: {
                id: team!.organization.id,
                name: team!.organization.name,
                slug: team!.organization.slug
            },
        });

    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { id: true, name: true, email: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const org = await prisma.organization.findUnique({
            where: { id: req.user!.orgId },
            select: { id: true, name: true, slug: true },
        });

        const teamMember = await prisma.teamMember.findFirst({
            where: {
                userId: req.user!.userId,
                team: { organizationId: req.user!.orgId },
            },
        });

        res.json({
            user,
            organization: org,
            role: teamMember?.role || 'member',
        });
    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
