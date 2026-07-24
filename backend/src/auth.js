import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import db from "./db.js";

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters.");
}

export async function register(email, password) {
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    const error = new Error("Use a valid email and a password of at least 8 characters.");
    error.status = 400;
    throw error;
  }
  const user = { id: randomUUID(), email: email.toLowerCase().trim() };
  try {
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)")
      .run(user.id, user.email, await bcrypt.hash(password, 12));
  } catch (cause) {
    if (String(cause).includes("UNIQUE")) {
      const error = new Error("An account already exists for that email.");
      error.status = 409;
      throw error;
    }
    throw cause;
  }
  return { user, token: sign(user) };
}

export async function login(email, password) {
  const user = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(email.toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error("Incorrect email or password.");
    error.status = 401;
    throw error;
  }
  return { user: { id: user.id, email: user.email }, token: sign(user) };
}

function sign(user) {
  return jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: "7d", issuer: "affili-detect" });
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = jwt.verify(token, secret, { issuer: "affili-detect" });
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}
