
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    const email = 'test-invite@example.com';

    try {
        console.log('--- Testing Invite Flow ---');

        // 1. Find a team
        const team = await prisma.team.findFirst();
        if (!team) {
            console.error('No team found to invite to.');
            return;
        }

        // 2. Clear existing invite for this email
        await prisma.invite.deleteMany({ where: { email } });

        // 3. Create a fresh invite
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invite = await prisma.invite.create({
            data: {
                email,
                role: 'member',
                teamId: team.id,
                token,
                expiresAt,
            },
        });

        console.log(`✅ Created invite for ${email}`);
        console.log(`🔗 Invite Link: http://localhost:5173/accept-invite?token=${token}`);

        // 4. Verify we can find it
        const found = await prisma.invite.findUnique({ where: { token } });
        if (found) {
            console.log('✅ Invite verified in database.');
        } else {
            console.error('❌ Invite NOT found in database!');
        }

    } catch (e) {
        console.error('Error testing invite flow:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
