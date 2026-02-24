import nodemailer from 'nodemailer';

// Configure transport (this would typically use environment variables)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass',
    },
});

export const sendVerificationEmail = async (to: string, token: string) => {
    // Determine base URL (in production this would be the live Netlify domain)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    const mailOptions = {
        from: '"Sherk Academy Command" <noreply@sherkacademy.com>',
        to,
        subject: 'SECURITY CLEARANCE: Verify your Identity',
        html: `
            <div style="font-family: monospace; background-color: #050505; color: #e5e7eb; padding: 40px; border: 1px solid #22d3ee; border-radius: 12px; max-width: 600px; margin: 0 auto; text-align: center;">
                <h1 style="color: #22d3ee; letter-spacing: 2px;">SHERK ACADEMY</h1>
                <p style="font-size: 16px; margin: 20px 0;">Identity verification required. Please confirm your email to initialize your training protocols.</p>
                <a href="${verificationUrl}" style="display: inline-block; padding: 15px 30px; background-color: transparent; border: 2px solid #a855f7; color: #a855f7; text-decoration: none; border-radius: 8px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">VERIFY IDENTITY</a>
                <p style="font-size: 12px; color: #4b5563; margin-top: 30px;">If this initialization was unauthorized, disregard this transmission.</p>
                <p style="font-size: 10px; color: #374151;">Verification Token: ${token}</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent: %s', info.messageId);

        // For development debugging without actual SMTP credentials:
        console.log(`\n=============================================================`);
        console.log(`[DEBUG] EMAIL VERIFICATION LINK FOR ${to}:`);
        console.log(`${verificationUrl}`);
        console.log(`=============================================================\n`);
    } catch (error) {
        console.error('Error sending verification email:', error);
        // For MVP, we still log the link so the user can test locally without real SMTP
        console.log(`\n[FALLBACK DEBUG] EMAIL VERIFICATION LINK FOR ${to}: ${verificationUrl}\n`);
    }
};
