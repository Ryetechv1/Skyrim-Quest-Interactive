import type { LucideIcon } from "lucide-react";

export type RingName = "outer" | "middle" | "inner";

export type RingOffsets = Record<RingName, number>;

export type InventoryItem = {
  id: string;
  name: string;
  detail: string;
  icon: LucideIcon;
  acquired: boolean;
};

export type DossierStep = {
  id: string;
  label: string;
  status: "open" | "active" | "locked" | "solved";
};

export type VaultFolder = {
  id: string;
  name: string;
  type: "folder";
  locked?: boolean;
  children: VaultNode[];
};

export type VaultFile = {
  id: string;
  name: string;
  type: "file";
  path: string;
  keyLabel: string;
  password: string;
  plainText: string;
  clue: string;
  size: string;
  locked: boolean;
};

export type VaultNode = VaultFolder | VaultFile;

export type SealedFile = VaultFile & {
  cipherText: string;
  iv: string;
  salt: string;
  decryptedText?: string;
};

export type EncryptedFolder = {
  id: string;
  path: string;
  createdBy: string;
  createdAt: string;
};

export type TerminalEvent = {
  id: string;
  kind: "ok" | "warn" | "error" | "info";
  text: string;
};

export type NoteDraft = {
  title: string;
  folder: string;
  passphrase: string;
  body: string;
};

export type MegaNode = {
  id: string;
  name: string;
  path: string;
  directory: boolean;
  size: number;
  createdAt?: number;
  children: MegaNode[];
};

export type MegaAccountInfo = {
  type: string;
  spaceUsed: number;
  spaceTotal: number;
  downloadBandwidthUsed: number;
  downloadBandwidthTotal: number;
};

export type MegaLog = {
  id: string;
  kind: TerminalEvent["kind"];
  text: string;
};

export type AccessRole = "guest" | "admin" | "moderator";

export type AuthSession = {
  id: string;
  username: string;
  role: AccessRole;
  title: string;
  startedAt: string;
};

export type ArchivistCredential = {
  username: "Archivist_Z" | "Archivist_Y" | "Archivist_X";
  password: string;
  role: Exclude<AccessRole, "guest">;
  title: string;
};

export type ChangeRequestPayload =
  | {
      type: "seal-note";
      draft: NoteDraft;
    }
  | {
      type: "mega-action";
      action: string;
      targetName?: string;
      details: string;
    }
  | {
      type: "manual";
    };

export type ChangeRequest = {
  id: string;
  title: string;
  summary: string;
  requester: string;
  requesterRole: AccessRole;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
  resolver?: string;
  payload: ChangeRequestPayload;
};

export type ChatMessage = {
  id: string;
  author: string;
  role: AccessRole | "system";
  body: string;
  createdAt: string;
};
