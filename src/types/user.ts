export enum UserRole {
  ADMIN = 'Admin',
  USER = 'User', 
  READ_ONLY = 'ReadOnly'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
  department?: string;
  title?: string;
}

export interface MicrosoftApiCredentials {
  clientId: string;
  tenantId: string;
  clientSecret?: string; 
}