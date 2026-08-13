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
