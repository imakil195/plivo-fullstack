import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateUniqueSlug } from '../utils/helpers';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { name, email, password, organizationName } = req.body;

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

        const passwordHash = await bcrypt.hash(password, 10);

        // Create user, org, team, and team member in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { name, email, passwordHash },
            });

            const slug = generateUniqueSlug(organizationName);
            const organization = await tx.organization.create({
                data: { name: organizationName, slug },
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
        console.error('Signup error:', error);
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
        console.error('Login error:', error);
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
