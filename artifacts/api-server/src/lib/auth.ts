import { type Request, type Response, type NextFunction } from "express";

export interface SessionUser {
  userId: number;
  role: string;
  fullName: string;
  username: string;
}

const COOKIE_NAME = "kwunman_auth";

export function getSession(req: Request): SessionUser | null {
  const raw = req.signedCookies[COOKIE_NAME] as string | undefined;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(res: Response, user: SessionUser): void {
  res.cookie(COOKIE_NAME, JSON.stringify(user), {
    signed: true,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "未登入" });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ error: "未登入" });
      return;
    }
    if (!roles.includes(session.role)) {
      res.status(403).json({ error: "權限不足" });
      return;
    }
    next();
  };
}
