const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // false for port 587 (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Fix for self-signed cert in chain
    }
});

// Verify connection on startup
transporter.verify()
    .then(() => console.log('✅ Email service connected'))
    .catch(err => console.error('❌ Email service error:', err.message));

/**
 * Sends a workspace invitation email.
 * @param {string} to - Recipient email
 * @param {string} inviterName - Name of the person who invited them
 * @param {string} workspaceName - Name of the workspace
 * @param {string} token - The unique invite token
 */
exports.sendInviteEmail = async (to, inviterName, workspaceName, token) => {
    const inviteUrl = `${process.env.FRONTEND_URL}/invite/${token}`;

    const mailOptions = {
        from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
        to,
        subject: `You've been invited to join ${workspaceName} on TaskFlow`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb;">Workspace Invitation</h2>
                <p>Hello,</p>
                <p><strong>${inviterName}</strong> has invited you to collaborate on the <strong>${workspaceName}</strong> workspace in TaskFlow.</p>
                <div style="margin: 30px 0;">
                    <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Accept & Join Workspace
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">This invite will expire in 7 days. If you don't have a TaskFlow account yet, you'll be asked to create one.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 12px;">If you weren't expecting this email, you can safely ignore it.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};
