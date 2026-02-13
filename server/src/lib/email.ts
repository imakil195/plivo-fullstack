import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export async function sendInviteEmail(email: string, inviteLink: string, teamName: string) {
    if (!process.env.RESEND_API_KEY) {
        console.log(`[EMAIL MOCK] To: ${email}, Link: ${inviteLink}, Team: ${teamName}`);
        return;
    }

    try {
        const response = await resend.emails.send({
            from: 'Plivo Status <onboarding@resend.dev>',
            to: email,
            subject: `Join ${teamName} on Plivo Status`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>You've been invited!</h2>
                    <p>You have been invited to join the <strong>${teamName}</strong> team on Plivo Status.</p>
                    <p>Click the button below to accept the invitation:</p>
                    <a href="${inviteLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Accept Invitation</a>
                    <p style="margin-top: 20px; color: #666; font-size: 14px;">Or copy this link: ${inviteLink}</p>
                </div>
            `
        });

        if (response.error) {
            console.error('Resend API Error:', response.error);
        } else {
            console.log(`Email sent successfully to ${email}. ID: ${response.data?.id}`);
        }
    } catch (error) {
        console.error('Failed to send email (Exception):', error);
        // Fallback log for dev
        console.log(`[EMAIL SEND FAILED] To: ${email}, Link: ${inviteLink}`);
    }
}
