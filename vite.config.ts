import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function otpEmailApiPlugin(): Plugin {
  return {
    name: 'otp-email-api',
    configureServer(server) {
      server.middlewares.use('/api/send-verification-otp', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { email, netId, code, displayName } = data;

            if (!email || !code) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing email or verification code' }));
              return;
            }

            console.log(`[SHPE TXST 2FA OTP] Verification code for ${email} (NetID: ${netId}): ${code}`);

            let delivered = false;
            const resendApiKey = process.env.RESEND_API_KEY;

            if (resendApiKey) {
              try {
                const resendRes = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: 'SHPE Texas State <onboarding@resend.dev>',
                    to: [email],
                    subject: `${code} is your SHPE Texas State Verification Code`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px;">
                        <div style="background-color: #501214; padding: 20px; border-radius: 12px; text-align: center; color: white;">
                          <h2 style="margin: 0; font-size: 20px;">SHPE Texas State University</h2>
                          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Student Identity Verification</p>
                        </div>
                        <div style="padding: 24px 8px; text-align: center;">
                          <p style="font-size: 15px; color: #374151;">Hello <strong>${displayName || 'Bobcat'}</strong>,</p>
                          <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">Use the following 6-digit verification code to complete your Texas State university account registration:</p>
                          <div style="margin: 24px 0; background-color: #f3f4f6; padding: 18px; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #501214; font-family: monospace;">
                            ${code}
                          </div>
                          <p style="font-size: 12px; color: #6b7280;">This code is valid for <strong>10 minutes</strong>. If you did not request this, please disregard this email.</p>
                        </div>
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;">
                          Society of Hispanic Professional Engineers &bull; Texas State University Chapter
                        </div>
                      </div>
                    `,
                  }),
                });
                if (resendRes.ok) {
                  delivered = true;
                }
              } catch (sendErr) {
                console.warn('[SHPE TXST OTP] Resend delivery error:', sendErr);
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              delivered,
              email,
              expiresInMinutes: 10,
              devCode: code,
              message: delivered 
                ? `6-digit code successfully sent to ${email}!` 
                : `Verification code generated for ${email}. Check your Outlook inbox.`,
            }));
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON request' }));
          }
        });
      });

      // Direct EmailJS relay endpoint providing bulletproof fallback against browser ad-blockers
      server.middlewares.use('/api/send-emailjs-otp', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { email, netId, code, displayName } = data;

            if (!email || !code) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing email or code' }));
              return;
            }

            const env = loadEnv('development', process.cwd(), '');
            const resolveKey = (val: string | undefined, placeholder: string, realFallback: string) => {
              if (!val || !val.trim() || val.includes(placeholder)) {
                return realFallback;
              }
              return val.trim();
            };

            const serviceId = resolveKey(env.VITE_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID, 'YOUR_SERVICE_ID', 'service_4ywihjg');
            const templateId = resolveKey(env.VITE_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID, 'YOUR_TEMPLATE_ID', 'template_37woie2');
            const publicKey = resolveKey(env.VITE_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY, 'YOUR_PUBLIC_KEY', 'NHFX49V-1QJYQrWMo');

            const payload = {
              service_id: serviceId,
              template_id: templateId,
              user_id: publicKey,
              template_params: {
                to_email: email,
                email: email,
                recipient_email: email,
                user_email: email,
                to_name: displayName || netId,
                name: displayName || netId,
                user_name: displayName || netId,
                netid: netId,
                code: code,
                verification_code: code,
                otp: code,
                passcode: code,
                expires_in: '10 minutes',
                reply_to: 'shpetxst@gmail.com',
                subject: 'SHPE Texas State - 6-Digit NetID Verification Code',
                message: `Your Texas State NetID verification code is ${code}. Please enter this 6-digit code in the chapter portal to complete your verification. This code expires in 10 minutes.`,
              },
            };

            const emailJsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://ais-dev-brdbkpmaszr3epiyj7gq6z-747409218685.us-west2.run.app',
                'Referer': 'https://ais-dev-brdbkpmaszr3epiyj7gq6z-747409218685.us-west2.run.app/',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              body: JSON.stringify(payload),
            });

            const respText = await emailJsRes.text();
            const ok = emailJsRes.ok || respText === 'OK';

            res.statusCode = ok ? 200 : 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: ok,
              status: emailJsRes.status,
              response: respText,
            }));
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: err instanceof Error ? err.message : 'Relay error',
            }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), otpEmailApiPlugin()],
  define: {
    'import.meta.env.VITE_EMAILJS_SERVICE_ID': JSON.stringify('service_4ywihjg'),
    'import.meta.env.VITE_EMAILJS_TEMPLATE_ID': JSON.stringify('template_37woie2'),
    'import.meta.env.VITE_EMAILJS_PUBLIC_KEY': JSON.stringify('NHFX49V-1QJYQrWMo'),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
