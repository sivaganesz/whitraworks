export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  dryRun?: boolean;
}

export interface InvitationEmailPayload {
  to: string;
  inviterName?: string;
  workspaceName: string;
  workspaceSlug: string;
  roleName: string;
  inviteUrl: string;
  expiresAt: string | Date;
}

export interface WelcomeEmailPayload {
  to: string;
  userName: string;
  businessName: string;
  workspaceSlug: string;
  workspaceUrl: string;
}

export interface PasswordResetEmailPayload {
  to: string;
  userName: string;
  resetUrl: string;
  expiresAt: string | Date;
}

