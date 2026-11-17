// Shared sign-in helpers for BuildQuote AI.
// Accounts and passwords are handled by Neon Auth: passwords are hashed and
// stored in the Neon database (neon_auth schema), never in this site's code.
import { createAuthClient } from './vendor/neon-auth.js';

// Public endpoint for Neon Auth on the "production" branch. This URL is not a secret.
export const NEON_AUTH_URL =
  'https://ep-snowy-glitter-bec8wytu.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth';

export const auth = createAuthClient(NEON_AUTH_URL);

export async function currentUser() {
  try {
    const { data } = await auth.getSession();
    return data?.user ?? null;
  } catch {
    return null;
  }
}

// Swap the nav link between "Sign in" and "My account".
export async function updateNav() {
  const link = document.querySelector('[data-auth-link]');
  if (!link) return;
  const user = await currentUser();
  if (user) {
    link.textContent = 'My account';
    link.href = 'account.html';
  }
}
