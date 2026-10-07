import { Injectable, Logger } from '@nestjs/common';
import {
  SendEmailOptions,
  SendEmailResult,
  InvitationEmailPayload,
  WelcomeEmailPayload,
  PasswordResetEmailPayload,
} from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | undefined;
  private readonly fromAddress: string;

  constructor() {
    this.apiKey = process.env['RESEND_API_KEY'];
    this.fromAddress =
      process.env['EMAIL_FROM'] || 'WhitraWorks Platform <onboarding@resend.dev>';

    if (!this.apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not configured. Transactional emails will run in local simulation/log mode.'
      );
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Core email transport via Resend REST API
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Dry-run simulation when no API key is provided (local dev / automated tests)
    if (!this.isConfigured || process.env['NODE_ENV'] === 'test') {
      this.logger.log(
        `[MailService DRY-RUN] To: ${recipients.join(', ')} | Subject: "${options.subject}"`
      );
      return {
        success: true,
        dryRun: true,
        messageId: `dry_run_${Date.now()}`,
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      });

      const data = (await response.json()) as { id?: string; message?: string; name?: string };

      if (!response.ok) {
        const errorMsg = data.message || `Resend HTTP error ${response.status}`;
        this.logger.error(`Failed to send email to ${recipients.join(', ')}: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }

      this.logger.log(`Email successfully dispatched via Resend to ${recipients.join(', ')} (ID: ${data.id})`);
      return {
        success: true,
        messageId: data.id,
      };
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.logger.error(`Error communicating with Resend API: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Member Workspace Invitation Email
   */
  async sendInvitationEmail(payload: InvitationEmailPayload): Promise<SendEmailResult> {
    const inviter = payload.inviterName || 'A workspace administrator';
    const expiration = new Date(payload.expiresAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; padding: 32px; }
    .header { margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 6px; color: #52525b; margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #09090b; }
    p { font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 16px; }
    .btn { display: inline-block; background-color: #18181b; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f4f4f5; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">WhitraWorks Workspace Invitation</div>
      <h1>Join ${payload.workspaceName}</h1>
      <p>Hello,</p>
      <p><strong>${inviter}</strong> has invited you to join the <strong>${payload.workspaceName}</strong> workspace on WhitraWorks as a <strong>${payload.roleName}</strong>.</p>
      <p>Click below to complete your account and set your password. This invitation will expire on ${expiration}.</p>
      <a href="${payload.inviteUrl}" class="btn">Accept Invitation & Get Started</a>
      <p style="font-size: 12px; color: #71717a; margin-top: 16px;">Or copy and paste this link in your browser:<br/><a href="${payload.inviteUrl}" style="color: #2563eb;">${payload.inviteUrl}</a></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} WhitraWorks Platform. If you were not expecting this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send({
      to: payload.to,
      subject: `Invitation to join ${payload.workspaceName} on WhitraWorks`,
      html,
      text: `${inviter} has invited you to join ${payload.workspaceName} as a ${payload.roleName}. Visit ${payload.inviteUrl} to accept before ${expiration}.`,
    });
  }

  /**
   * New Tenant Workspace Welcome Email
   */
  async sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<SendEmailResult> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #09090b; }
    p { font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 16px; }
    .btn { display: inline-block; background-color: #18181b; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f4f4f5; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to WhitraWorks, ${payload.userName}!</h1>
    <p>Your new workspace for <strong>${payload.businessName}</strong> has been provisioned successfully.</p>
    <p>You can access your dedicated operations dashboard anytime at:</p>
    <a href="${payload.workspaceUrl}" class="btn">Open ${payload.businessName} Workspace</a>
    <p style="font-size: 12px; color: #71717a;">Workspace URL: <a href="${payload.workspaceUrl}" style="color: #2563eb;">${payload.workspaceUrl}</a></p>
    <div class="footer">
      <p>© ${new Date().getFullYear()} WhitraWorks Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send({
      to: payload.to,
      subject: `Welcome to WhitraWorks — ${payload.businessName} is ready!`,
      html,
      text: `Welcome ${payload.userName}! Your workspace for ${payload.businessName} is ready. Access it at ${payload.workspaceUrl}.`,
    });
  }

  /**
   * Password Reset Email
   */
  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<SendEmailResult> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #09090b; }
    p { font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 16px; }
    .btn { display: inline-block; background-color: #ef4444; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f4f4f5; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Password Reset Request</h1>
    <p>Hello ${payload.userName},</p>
    <p>A request was received to reset the password for your WhitraWorks account. Click the button below to choose a new password:</p>
    <a href="${payload.resetUrl}" class="btn">Reset Password</a>
    <p>If you did not make this request, you can safely ignore this email.</p>
    <div class="footer">
      <p>© ${new Date().getFullYear()} WhitraWorks Platform.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send({
      to: payload.to,
      subject: `Reset your WhitraWorks password`,
      html,
      text: `Hello ${payload.userName}. A password reset request was received for your account. Visit ${payload.resetUrl} to set a new password.`,
    });
  }
}
