import SibApiV3Sdk from 'sib-api-v3-sdk';
import { config } from '../config.js';

function brevoClient() {
  if (!config.brevoApiKey) return null;
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications['api-key'].apiKey = config.brevoApiKey;
  return new SibApiV3Sdk.TransactionalEmailsApi();
}

async function sendEmail({ to, subject, html }) {
  const client = brevoClient();
  if (!client) {
    console.info(`[email:dev] ${subject} -> ${to.email}`);
    return { dev: true };
  }
  return client.sendTransacEmail({
    sender: { email: config.brevoSenderEmail, name: config.brevoSenderName },
    to: [to],
    subject,
    htmlContent: html
  });
}

export async function sendPasswordResetEmail(user, otp) {
  return sendEmail({
    to: { email: user.email, name: user.name },
    subject: 'Your Aurora Market password reset code',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827">
        <h2>Password reset code</h2>
        <p>Hi ${user.name}, use this code to reset your password. It expires in 10 minutes.</p>
        <div style="font-size:28px;font-weight:800;letter-spacing:6px;padding:16px 20px;background:#f3f4f6;border-radius:10px;display:inline-block">${otp}</div>
        <p>If you did not request this, you can ignore this email.</p>
      </div>`
  });
}

export async function sendOrderConfirmationEmail(user, order, items) {
  const rows = items.map((item) => `
    <tr>
      <td style="padding:8px 0">${item.product_name}</td>
      <td style="padding:8px 0;text-align:center">${item.quantity}</td>
      <td style="padding:8px 0;text-align:right">Rs ${(item.total_cents / 100).toLocaleString('en-IN')}</td>
    </tr>`).join('');
  return sendEmail({
    to: { email: user.email, name: user.name },
    subject: `Order ${order.order_number} confirmed`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827">
        <h2>Thanks for your order, ${user.name}</h2>
        <p>Your order <strong>${order.order_number}</strong> is confirmed and payment is ${order.payment_status}.</p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
        <p style="font-size:18px"><strong>Total: Rs ${(order.total_cents / 100).toLocaleString('en-IN')}</strong></p>
      </div>`
  });
}
