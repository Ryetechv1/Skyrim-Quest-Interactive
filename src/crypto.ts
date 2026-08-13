import type { SealedFile, VaultFile } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function asArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    asArrayBuffer(encoder.encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asArrayBuffer(salt),
      iterations: 140000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealText(plainText: string, passphrase: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(encoder.encode(plainText)),
  );

  return {
    cipherText: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };
}

export async function openText(sealed: Pick<SealedFile, "cipherText" | "iv" | "salt">, passphrase: string) {
  const key = await deriveKey(passphrase, fromBase64(sealed.salt));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asArrayBuffer(fromBase64(sealed.iv)) },
    key,
    asArrayBuffer(fromBase64(sealed.cipherText)),
  );

  return decoder.decode(plainBuffer);
}

export async function sealVaultFiles(files: VaultFile[]) {
  return Promise.all(
    files.map(async (file) => {
      const sealed = await sealText(file.plainText, file.password);
      return {
        ...file,
        ...sealed,
      };
    }),
  );
}
