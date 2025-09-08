import jwt from "jsonwebtoken";

export function readTokenFrom(req) {
  const cookie = req.cookies?.get?.("auth")?.value;
  const bearer = req.headers
    ?.get?.("authorization")
    ?.replace(/^Bearer\s+/i, "");
  return cookie || bearer || null;
}

export function verifyJwt(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return jwt.verify(token, secret); // -> { sub, email, role, ... }
}
