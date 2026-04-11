import nodemailer from 'nodemailer';

// Exportando o transponder caso seja necessário enviar anomalias de sistema para os admins no futuro
export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email', // preencher no .env
        pass: process.env.SMTP_PASS || 'etherealpassword', 
    },
});

/**
 * Envia o e-mail transacional de verificação de conta
 */
export const sendVerificationEmail = async (to: string, nome: string, token: string) => {
    // Configura a URL de confirmação com base na var de ambiente de frontend, caindo p/ localhost no fluxo local
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    const mailOptions = {
        from: `"Equipe SGO" <${process.env.SMTP_FROM || 'no-reply@sgo.com.br'}>`, // Remetente
        to, // Destinatário
        subject: 'Confirme seu endereço de e-mail - SGO',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #7C3AED; margin: 0;">Bem-vindo(a) ao SGO!</h2>
                </div>
                <p style="color: #334155; font-size: 16px; line-height: 1.5;">Olá, <strong>${nome}</strong>.</p>
                <p style="color: #334155; font-size: 16px; line-height: 1.5;">
                    Falta muito pouco para liberar o seu painel de gestão de clientes e orçamentos. Precisamos apenas que você confirme que este é o seu e-mail.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyUrl}" style="background-color: #7C3AED; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                        Confirmar Meu E-mail
                    </a>
                </div>
                <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
                    Se você não solicitou este cadastro, pode apenas ignorar este e-mail tranquilamente.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                    SGO - Sistema de Gestão de Orçamentos<br>
                    <a href="${baseUrl}" style="color: #7C3AED; text-decoration: none;">Acessar o sistema</a>
                </p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAILER] E-mail de verificação enviado para ${to}`);
        
        // Log para testes em desenvolvimento usando contas falsas da Ethereal
        if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
            console.log(`[MAILER TEST] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
        
        return true;
    } catch (error) {
        console.error('[MAILER] Detalhes do erro no envio do e-mail:', error);
        throw new Error('Falha ao enviar e-mail de verificação.');
    }
};
