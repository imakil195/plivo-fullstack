
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function debugAuth() {
    console.log('--- Starting Auth Debug ---');

    const testEmail = 'debug_user@example.com';
    const testPassword = 'password123';

    try {
        // 1. Check if user exists
        console.log(`Checking for user: ${testEmail}`);
        const user = await prisma.user.findUnique({
            where: { email: testEmail },
        });

        if (user) {
            console.log('User found:', user.email);

            // 2. Check password hash
            console.log('Verifying password...');
            const isValid = await bcrypt.compare(testPassword, user.passwordHash);
            console.log(`Password valid: ${isValid}`);

            if (isValid) {
                // 3. Check organization membership
                console.log('Checking organization membership...');
                const teamMember = await prisma.teamMember.findFirst({
                    where: { userId: user.id },
                    include: { team: { include: { organization: true } } },
                });

                if (teamMember) {
                    console.log('User is member of team:', teamMember.team.name);
                    console.log('Organization:', teamMember.team.organization.name);
                } else {
                    console.error('ERROR: User found but not part of any organization/team!');
                }
            } else {
                console.error('ERROR: Password mismatch for existing user.');
            }

        } else {
            console.log('User not found. Attempting to create user and org...');
            // Simulate signup flow manually to see if it works
            const hashedPassword = await bcrypt.hash(testPassword, 10);

            try {
                const result = await prisma.$transaction(async (tx) => {
                    const newUser = await tx.user.create({
                        data: { name: 'Debug User', email: testEmail, passwordHash: hashedPassword },
                    });
                    const newOrg = await tx.organization.create({
                        data: { name: 'Debug Org', slug: 'debug-org-' + Date.now() },
                    });
                    const newTeam = await tx.team.create({
                        data: { name: 'Default', organizationId: newOrg.id },
                    });
                    await tx.teamMember.create({
                        data: { userId: newUser.id, teamId: newTeam.id, role: 'admin' },
                    });
                    return { newUser, newOrg };
                });
                console.log('Successfully created debug user and org:', result);
            } catch (createError) {
                console.error('Failed to create debug user/org:', createError);
            }
        }

    } catch (error) {
        console.error('Unexpected error during debug:', error);
    } finally {
        await prisma.$disconnect();
        console.log('--- specific debug complete ---');
        console.log('Now listing all users to see state:');

        const allUsers = await new PrismaClient().user.findMany({ take: 5 });
        console.log('First 5 users:', allUsers);
    }
}

debugAuth();
