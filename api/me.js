// GET /api/me — returns the signed-in user's account details from the Neon database.
// Runs on Vercel's servers, so DATABASE_URL stays secret and never reaches the browser.
import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUTH_URL = 'https://ep-snowy-glitter-bec8wytu.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth';
const JWKS = createRemoteJWKSet(new URL(`${AUTH_URL}/.well-known/jwks.json`));

// Checks the "Authorization: Bearer <token>" header and returns the user's id, or null.
export async function getUserId(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    // Signature is checked against Neon Auth's public keys; expired tokens are rejected.
    const { payload } = await jwtVerify(token, JWKS);
    return payload.sub || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL is not set in Vercel' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT id, name, email, "createdAt" AS created_at
      FROM neon_auth."user"
      WHERE id = ${userId}`;
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error('api/me database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
