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

export const sendVerificationEmail = async (to: string, code: string) => {
    const mailOptions = {
        from: `"Sherk Academy Command" <${process.env.SMTP_USER || 'noreply@sherkacademy.com'}>`,
        to,
        subject: 'SECURITY CLEARANCE: Verification Code',
        html: `
            <div style="font-family: monospace; background-color: #050505; color: #e5e7eb; padding: 40px; border: 1px solid #22d3ee; border-radius: 12px; max-width: 600px; margin: 0 auto; text-align: center;">
                <h1 style="color: #22d3ee; letter-spacing: 2px;">SHERK ACADEMY</h1>
                <p style="font-size: 16px; margin: 20px 0;">Identity verification required. Enter the following 6-digit clearance code to initialize your terminal:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 12px; margin: 30px 0; color: #a855f7; background-color: #0f172a; padding: 20px; border-radius: 8px; border: 1px dashed #4b5563;">
                    ${code}
                </div>
                <p style="font-size: 12px; color: #4b5563; margin-top: 30px;">If this initialization was unauthorized, disregard this transmission.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent: %s', info.messageId);

        // For development debugging without actual SMTP credentials:
        console.log(`\n=============================================================`);
        console.log(`[DEBUG] EMAIL VERIFICATION CODE FOR ${to}:`);
        console.log(`[ ${code} ]`);
        console.log(`=============================================================\n`);
    } catch (error) {
        console.error('Error sending verification email:', error);
        // For MVP, we still log the link so the user can test locally without real SMTP
        console.log(`\n[FALLBACK DEBUG] EMAIL VERIFICATION CODE FOR ${to}: ${code}\n`);
    }
};
