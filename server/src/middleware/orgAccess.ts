import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../lib/prisma';

export async function checkOrgAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    const teamMember = await prisma.teamMember.findFirst({
        where: {
            userId: req.user.userId,
            team: {
                organizationId: req.user.orgId,
            },
        },
    });

    if (!teamMember) {
        res.status(403).json({ error: 'Not a member of this organization' });
        return;
    }

    // Attach role to request for use in route handlers
    (req as any).userRole = teamMember.role;
    next();
}

export function requireRole(role: string) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if ((req as any).userRole !== role) {
            res.status(403).json({ error: `Requires ${role} role` });
            return;
        }
        next();
    };
}
