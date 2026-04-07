const DEV_HASH_SALT = "revo-devtools-v1";
const DEV_UNLOCK_HASH = "6065b5e8569ccbfa077377425f9984abf407de7caee65c8305e4f489fe976e62";
const DEV_UNLOCK_SESSION_KEY = "revo.devtools.unlocked";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashCode(raw: string): Promise<string> {
  const input = `${DEV_HASH_SALT}:${raw}`;
  const encoded = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

export function isDevToolsUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(DEV_UNLOCK_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevToolsUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) {
      window.sessionStorage.setItem(DEV_UNLOCK_SESSION_KEY, "1");
      return;
    }
    window.sessionStorage.removeItem(DEV_UNLOCK_SESSION_KEY);
  } catch {
    // Ignore sessionStorage restrictions.
  }
}

export async function verifyDevUnlockCode(code: string): Promise<boolean> {
  const normalized = code.trim();
  if (!normalized) {
    return false;
  }
  const hashed = await hashCode(normalized);
  return hashed === DEV_UNLOCK_HASH;
}
