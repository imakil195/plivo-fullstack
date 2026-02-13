import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import serviceRoutes from './routes/services';
import incidentRoutes from './routes/incidents';
import maintenanceRoutes from './routes/maintenance';
import teamRoutes from './routes/teams';
import publicRoutes from './routes/public';
import { setupSocket } from './socket';
import prisma from './lib/prisma';
import { slugify } from './utils/helpers';
import { log } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io setup
setupSocket(io);




// Automatic slug fix on startup
async function fixSlugs() {
    try {
        console.log('Running automatic slug correction...');
        const orgs = await prisma.organization.findMany();
        let fixedCount = 0;

        for (const org of orgs) {
            const baseSlug = slugify(org.name);

            // If current slug is already clean, skip
            if (org.slug === baseSlug) continue;

            // Check if baseSlug is available
            const existing = await prisma.organization.findFirst({
                where: {
                    slug: baseSlug,
                    id: { not: org.id }
                }
            });

            if (!existing) {
                await prisma.organization.update({
                    where: { id: org.id },
                    data: { slug: baseSlug }
                });
                console.log(`✅ Fixed slug for '${org.name}': ${org.slug} -> ${baseSlug}`);
                fixedCount++;
            } else {
                console.log(`⚠️ Could not fix '${org.name}': '${baseSlug}' is already taken by another organization`);
            }
        }

        if (fixedCount > 0) {
            console.log(`Successfully fixed ${fixedCount} organization slugs.`);
        } else {
            console.log('No slug corrections needed.');
        }
    } catch (e: any) {
        console.error('Error in automatic slug correction:', e.message);
    }
}

// Run fix on startup
fixSlugs();

const PORT = process.env.PORT || 3001;

process.on('uncaughtException', (err) => {
    log('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    log('Unhandled Rejection:', { promise, reason });
});

httpServer.listen(PORT, () => {
    log(`🚀 Server running on http://localhost:${PORT}`);
});

export { io };
