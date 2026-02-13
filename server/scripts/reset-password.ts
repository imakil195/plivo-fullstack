
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('Usage: npx tsx scripts/reset-password.ts <email> <new_password>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });

        console.log(`Password for ${email} has been reset successfully.`);
    } catch (e) {
        console.error('Error resetting password:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
