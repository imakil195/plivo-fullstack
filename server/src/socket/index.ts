import { Server } from 'socket.io';
import prisma from '../lib/prisma';

export function setupSocket(io: Server) {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Join an organization room (for real-time updates)
        socket.on('join:org', async (data: { orgSlug?: string; orgId?: string }) => {
            try {
                let orgId = data.orgId;

                if (!orgId && data.orgSlug) {
                    const org = await prisma.organization.findUnique({
                        where: { slug: data.orgSlug },
                    });
                    if (org) orgId = org.id;
                }

                if (orgId) {
                    socket.join(`org:${orgId}`);
                    console.log(`Socket ${socket.id} joined org:${orgId}`);
                }
            } catch (err) {
                console.error('Error joining org room:', err);
            }
        });

        socket.on('leave:org', (data: { orgId: string }) => {
            socket.leave(`org:${data.orgId}`);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
}

// Helper to emit events to an org room
export function emitToOrg(io: Server, orgId: string, event: string, data: any) {
    io.to(`org:${orgId}`).emit(event, data);
}
