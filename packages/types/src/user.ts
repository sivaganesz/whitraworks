// WhitraWorks User & Identity Contracts

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isPlatformSuperadmin: boolean;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isPlatformSuperadmin: boolean;
  activeTenantId?: string;
  activeRole?: string;
}

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isPlatformSuperadmin: boolean;
  status: UserStatus;
}
