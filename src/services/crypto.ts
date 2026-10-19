export const CLIENT_SALT = 'wuylii_motivation_salt_v1';
// Hash for '00000000' + CLIENT_SALT
export const DEFAULT_PASSWORD_HASH = '3a29729acfbdbc0729ec0087ccc3d16a1748cb5fb73d23a186548b3faf2c2800';

export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
