
import { sendInviteEmail } from '../src/lib/email';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    const email = process.argv[2] || 'test-invite@example.com';
    const link = 'http://localhost:5173/accept-invite?token=test-token';
    const team = 'Test Team';

    console.log(`Attempting to send test email to: ${email}`);
    console.log(`Using API Key: ${process.env.RESEND_API_KEY ? 'Present' : 'MISSING'}`);

    try {
        await sendInviteEmail(email, link, team);
        console.log('Finished calling sendInviteEmail.');
    } catch (e) {
        console.error('Captured Exception in main:', e);
    }
}

main();
