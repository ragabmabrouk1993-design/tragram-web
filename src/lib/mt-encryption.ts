export type MtPlainCredentials = {
  accountNumber: string;
  password: string;
  server: string;
  /**
   * Optional friendly server name (e.g., Exness-Real15)
   */
  serverName?: string;
  /**
   * Direct host/IP of the trading server (preferred over server name when present).
   */
  host?: string;
  /**
   * Port of the trading server (defaults to 443).
   */
  port?: number;
  accountType: "MT4" | "MT5";
};

/**
 * Encrypt MT credentials using a PEM RSA public key.
 * In the browser we use RSA-OAEP via WebCrypto.
 * In Node tests/SSR we use the native crypto module.
 */
export async function encryptMtCredentials(
  payload: MtPlainCredentials,
  publicKeyPem: string
): Promise<string> {
  const plaintext = JSON.stringify(payload);

  if (!publicKeyPem || publicKeyPem.trim().length === 0) {
    throw new Error("MT RSA public key is not configured.");
  }

  if (typeof window === "undefined") {
    const { publicEncrypt, constants, createPublicKey } = await import("crypto");
    const key = createPublicKey(publicKeyPem);
    const encrypted = publicEncrypt(
      {
        key,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(plaintext, "utf8")
    );
    return encrypted.toString("base64");
  }

  // Browser: use RSA-OAEP if available
  const keyData = pemToArrayBuffer(publicKeyPem);
  const cryptoKey = await window.crypto.subtle.importKey(
    "spki",
    keyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  );
  return bufferToBase64(encrypted);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\\s+/g, "");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    view[i] = raw.charCodeAt(i);
  }
  return buffer;
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}
