import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        displayName: string;
        isDevAccount: boolean;
        canManagePermissions: boolean;
        permissions: string[];
      };
    }
  }
}

export {};
