import type { SessionRow, UserRow } from "../db/schema.js";

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRow["role"];
  emailVerified: boolean;
  totpEnabled: boolean;
  createdAt: Date;
}

export interface AuthContext {
  user: UserRow;
  session: SessionRow;
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    totpEnabled: user.totpEnabledAt !== null,
    createdAt: user.createdAt,
  };
}
