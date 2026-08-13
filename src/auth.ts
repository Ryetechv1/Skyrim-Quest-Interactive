import type { ArchivistCredential, AuthSession } from "./types";

function generatedArchivistPassword(seed: string) {
  let hash = 0x811c9dc5;
  const phrase = `${seed}:MASK_OF_DESPAIR:DA_VINCI_RELIQUARY`;

  for (const character of phrase) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }

  const partA = (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 5);
  const partB = (Math.imul(hash ^ 0x9e3779b9, 0x85ebca6b) >>> 0)
    .toString(36)
    .toUpperCase()
    .padStart(7, "0")
    .slice(0, 5);
  const suffix = seed.charAt(seed.length - 1) || "X";

  return `${suffix}-${partA}-${partB}`;
}

export const ARCHIVIST_CREDENTIALS: ArchivistCredential[] = [
  {
    username: "Archivist_Z",
    password: "ADMIN",
    role: "admin",
    title: "ADMIN",
  },
  {
    username: "Archivist_Y",
    password: generatedArchivistPassword("Archivist_Y"),
    role: "moderator",
    title: "MODERATOR 1",
  },
  {
    username: "Archivist_X",
    password: generatedArchivistPassword("Archivist_X"),
    role: "moderator",
    title: "MODERATOR 2",
  },
];

export function authenticateArchivist(username: string, password: string): AuthSession | null {
  const normalizedUser = username.trim();
  const match = ARCHIVIST_CREDENTIALS.find(
    (credential) => credential.username === normalizedUser && credential.password === password,
  );

  if (!match) {
    return null;
  }

  return {
    id: `${match.username}-${Date.now()}`,
    username: match.username,
    role: match.role,
    title: match.title,
    startedAt: new Date().toISOString(),
  };
}

export function createGuestSession(): AuthSession {
  return {
    id: `guest-${Date.now()}`,
    username: "GUEST VIEW",
    role: "guest",
    title: "Guest View",
    startedAt: new Date().toISOString(),
  };
}

export function roleLabel(role: AuthSession["role"]) {
  if (role === "admin") {
    return "ADMIN";
  }
  if (role === "moderator") {
    return "MODERATOR";
  }
  return "GUEST VIEW";
}
