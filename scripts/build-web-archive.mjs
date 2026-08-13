import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(root, "dist");
const basePath = "/davinci-escape-room/";
const archiveRoute = "web-archive";
const pwaVersion = readPwaVersion();
const cacheVersion = `davinci-web-archive-${pwaVersion}`;

function readPwaVersion() {
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return `local-${Date.now()}`;
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : fullPath;
    }),
  );

  return files.flat();
}

function toPublicPath(filePath) {
  return `${basePath}${relative(distDir, filePath).split(sep).join("/")}`;
}

async function writeServiceWorker(files) {
  const cacheableFiles = files
    .filter((filePath) => !filePath.endsWith("sw.js"))
    .map(toPublicPath)
    .sort();

const serviceWorker = `const CACHE_NAME = ${JSON.stringify(cacheVersion)};
const ARCHIVE_URLS = ${JSON.stringify([...cacheableFiles, `${basePath}${archiveRoute}/`], null, 2)};
const BASE_PATH = ${JSON.stringify(basePath)};
const ARCHIVE_ROUTE = ${JSON.stringify(`${basePath}${archiveRoute}/`)};
const ARCHIVE_INDEX = ${JSON.stringify(`${basePath}${archiveRoute}/index.html`)};
const APP_INDEX = ${JSON.stringify(`${basePath}index.html`)};

async function matchCached(cache, request, requestUrl) {
  return (
    (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ||
    (await cache.match(requestUrl.pathname, { ignoreSearch: true, ignoreVary: true })) ||
    (await cache.match(new URL(requestUrl.pathname, self.location.origin).href, { ignoreSearch: true, ignoreVary: true }))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("davinci-web-archive-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || !requestUrl.pathname.startsWith(BASE_PATH)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      const cache = await caches.open(CACHE_NAME);
      const preciseCachedResponse = cachedResponse || (await matchCached(cache, event.request, requestUrl));
      const isNavigation =
        event.request.mode === "navigate" ||
        event.request.destination === "document" ||
        event.request.headers.get("accept")?.includes("text/html");
      const archiveFallback = isNavigation && requestUrl.pathname === ARCHIVE_ROUTE ? await cache.match(ARCHIVE_INDEX) : null;
      const appFallback = isNavigation ? await cache.match(APP_INDEX) : null;
      const networkResponse = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            const pathClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
              cache.put(new URL(requestUrl.pathname, self.location.origin).href, pathClone);
            });
          }
          return response;
        })
        .catch(() => preciseCachedResponse || archiveFallback || appFallback || Response.error());

      return preciseCachedResponse || archiveFallback || networkResponse;
    }),
  );
});
`;

  await writeFile(join(distDir, "sw.js"), serviceWorker);
}

async function writeArchiveRoute(indexHtml) {
  const archiveDir = join(distDir, archiveRoute);
  await mkdir(archiveDir, { recursive: true });
  await writeFile(join(archiveDir, "index.html"), indexHtml);
}

async function writePwaVersionFile() {
  await writeFile(
    join(distDir, "pwa-version.json"),
    `${JSON.stringify(
      {
        version: pwaVersion,
        cacheName: cacheVersion,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
}

async function writeArchiveBundle() {
  const bundleDir = join(distDir, "download");
  await mkdir(bundleDir, { recursive: true });

  const bundlePath = join(bundleDir, "davinci-web-archive.zip");
  const files = (await listFiles(distDir)).filter((filePath) => filePath !== bundlePath);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const filePath of files.sort()) {
    const fileStat = await stat(filePath);
    const archiveName = relative(distDir, filePath).split(sep).join("/");
    const data = await readFile(filePath);
    const nameBytes = Buffer.from(archiveName);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    const centralHeader = Buffer.alloc(46);
    const dosTime = toDosTime(fileStat.mtime);
    const dosDate = toDosDate(fileStat.mtime);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, nameBytes, data);
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + data.length;
  }

  const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralSize, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  await writeFile(bundlePath, Buffer.concat([...localParts, ...centralParts, endRecord]));

  return bundlePath;
}

function toDosTime(date) {
  return (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
}

function toDosDate(date) {
  return ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const indexPath = join(distDir, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
await writeArchiveRoute(indexHtml);
await writePwaVersionFile();
await writeServiceWorker(await listFiles(distDir));
const bundlePath = await writeArchiveBundle();

console.log(`PWA version ${pwaVersion}`);
console.log(`Web archive route generated at ${basePath}${archiveRoute}/`);
console.log(`Archive bundle generated at ${basePath}download/${basename(bundlePath)}`);
