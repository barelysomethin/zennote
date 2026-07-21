/**
 * SHA-256 Cryptographic utility using Web Crypto API
 */
export async function hashPassword(password) {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  const hash = await hashPassword(inputPassword);
  return hash === storedHash;
}
