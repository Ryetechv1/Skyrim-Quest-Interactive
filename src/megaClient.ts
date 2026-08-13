import { Storage } from "megajs";
import type { MegaAccountInfo, MegaNode } from "./types";

type MegaMutableFile = {
  nodeId?: string;
  name: string | null;
  directory: boolean;
  size?: number;
  createdAt?: number;
  children?: MegaMutableFile[];
  parent?: MegaMutableFile;
  mkdir: (name: string) => Promise<MegaMutableFile>;
  upload: (options: { name: string; size: number }, source: Uint8Array) => { complete: Promise<MegaMutableFile> };
  downloadBuffer: (options?: { forceHttps?: boolean }) => Promise<Uint8Array>;
  link: (options?: boolean | { noKey?: boolean }) => Promise<string>;
  shareFolder?: (options?: { noKey?: boolean }) => Promise<string>;
  rename: (name: string) => Promise<void>;
  delete: (permanent?: boolean) => Promise<void>;
};

export type MegaSession = {
  storage: Storage;
  nodes: Map<string, MegaMutableFile>;
};

export type MegaLoginCredentials = {
  email: string;
  password: string;
  secondFactorCode?: string;
};

function nodeName(file: MegaMutableFile) {
  return file.name || (file.directory ? "Untitled Folder" : "Untitled File");
}

function walkNode(file: MegaMutableFile, path: string, nodes: Map<string, MegaMutableFile>): MegaNode {
  const id = file.nodeId || path || "root";
  const currentPath = path ? `${path}/${nodeName(file)}` : nodeName(file);
  nodes.set(id, file);

  return {
    id,
    name: nodeName(file),
    path: currentPath,
    directory: file.directory,
    size: file.size ?? 0,
    createdAt: file.createdAt,
    children: (file.children ?? [])
      .map((child) => walkNode(child, currentPath, nodes))
      .sort((left, right) => Number(right.directory) - Number(left.directory) || left.name.localeCompare(right.name)),
  };
}

export async function loginMega(credentials: MegaLoginCredentials): Promise<MegaSession> {
  const storage = new Storage({
    email: credentials.email.trim(),
    password: credentials.password,
    secondFactorCode: credentials.secondFactorCode?.trim() || undefined,
    autoload: true,
    autologin: true,
    keepalive: false,
  });

  await storage.ready;
  const nodes = new Map<string, MegaMutableFile>();
  walkNode(storage.root as unknown as MegaMutableFile, "", nodes);
  return { storage, nodes };
}

export async function closeMega(session: MegaSession | null) {
  await session?.storage.close();
}

export async function refreshMega(session: MegaSession) {
  await session.storage.reload(true);
  const nodes = new Map<string, MegaMutableFile>();
  const root = walkNode(session.storage.root as unknown as MegaMutableFile, "", nodes);
  return { root, nodes };
}

export async function getMegaAccountInfo(session: MegaSession): Promise<MegaAccountInfo> {
  const info = await session.storage.getAccountInfo();
  return {
    type: info.type,
    spaceUsed: info.spaceUsed,
    spaceTotal: info.spaceTotal,
    downloadBandwidthUsed: info.downloadBandwidthUsed,
    downloadBandwidthTotal: info.downloadBandwidthTotal,
  };
}

export function getMegaNode(session: MegaSession, nodeId: string) {
  return session.nodes.get(nodeId) ?? null;
}

export async function createMegaFolder(session: MegaSession, parentId: string, name: string) {
  const parent = getMegaNode(session, parentId);
  if (!parent || !parent.directory) {
    throw new Error("Select a MEGA folder before creating a folder.");
  }
  await parent.mkdir(name.trim());
}

export async function uploadMegaFile(session: MegaSession, parentId: string, file: File) {
  const parent = getMegaNode(session, parentId);
  if (!parent || !parent.directory) {
    throw new Error("Select a MEGA folder before uploading.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  await parent.upload({ name: file.name, size: bytes.length }, bytes).complete;
}

export async function downloadMegaFile(session: MegaSession, nodeId: string) {
  const node = getMegaNode(session, nodeId);
  if (!node || node.directory) {
    throw new Error("Select a MEGA file before downloading.");
  }

  const buffer = await node.downloadBuffer({ forceHttps: true });
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const blobBytes = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBytes).set(bytes);
  const blob = new Blob([blobBytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = nodeName(node);
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareMegaNode(session: MegaSession, nodeId: string) {
  const node = getMegaNode(session, nodeId);
  if (!node) {
    throw new Error("Select a MEGA node before creating a link.");
  }

  if (node.directory && node.shareFolder) {
    return node.shareFolder({});
  }

  return node.link(false);
}

export async function renameMegaNode(session: MegaSession, nodeId: string, name: string) {
  const node = getMegaNode(session, nodeId);
  if (!node) {
    throw new Error("Select a MEGA node before renaming.");
  }
  await node.rename(name.trim());
}

export async function deleteMegaNode(session: MegaSession, nodeId: string) {
  const node = getMegaNode(session, nodeId);
  if (!node) {
    throw new Error("Select a MEGA node before deleting.");
  }
  await node.delete(false);
}
