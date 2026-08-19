export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  lastLogin?: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}
