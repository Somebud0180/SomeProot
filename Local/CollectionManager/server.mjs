#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const publicDir = path.join(__dirname, "public");
const localEnvPath = path.join(repoRoot, "Local", ".env");
const syncScriptPath = path.join(
	repoRoot,
	"Local",
	"Scripts",
	"sync_local_gallery_to_cdn.mjs",
);
const execFileAsync = promisify(execFile);
let syncInProgress = false;

const roots = {
	photos: path.join(repoRoot, "Local", "Gallery", "Photos"),
	artworks: path.join(repoRoot, "Local", "Gallery", "Artworks"),
};

const imageExtensions = new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".gif",
	".avif",
	".bmp",
	".tif",
	".tiff",
]);
const videoExtensions = new Set([
	".mp4",
	".webm",
	".mov",
	".avi",
	".mkv",
	".m4v",
]);
const supportedExtensions = new Set([...imageExtensions, ...videoExtensions]);

const contentTypeByExt = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
	".gif": "image/gif",
	".avif": "image/avif",
	".bmp": "image/bmp",
	".tif": "image/tiff",
	".tiff": "image/tiff",
	".mp4": "video/mp4",
	".webm": "video/webm",
	".mov": "video/quicktime",
	".avi": "video/x-msvideo",
	".mkv": "video/x-matroska",
	".m4v": "video/x-m4v",
};

const port = Number(process.env.COLLECTION_MANAGER_PORT || 4173);

function buildMediaUrl(rootId, collectionName, fileName) {
	return `/media/${encodeURIComponent(rootId)}/${encodeURIComponent(collectionName)}/${encodeURIComponent(fileName)}`;
}

async function readLocalEnv(filePath) {
	try {
		const raw = await fs.readFile(filePath, "utf8");
		const parsed = {};

		for (const line of raw.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) {
				continue;
			}
			const index = trimmed.indexOf("=");
			if (index < 1) {
				continue;
			}
			const key = trimmed.slice(0, index).trim();
			let value = trimmed.slice(index + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			parsed[key] = value;
		}

		return parsed;
	} catch {
		return {};
	}
}

async function runSyncScript() {
	if (syncInProgress) {
		throw new Error("Sync already in progress.");
	}

	syncInProgress = true;
	const startTime = Date.now();

	try {
		const localEnv = await readLocalEnv(localEnvPath);
		const apiKey = process.env.CDN_API_KEY || localEnv.CDN_API_KEY;
		if (!apiKey) {
			throw new Error(
				"Missing CDN_API_KEY. Add it to Local/.env or export it in your shell.",
			);
		}

		const { stdout, stderr } = await execFileAsync(
			process.execPath,
			[syncScriptPath],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					...localEnv,
					CDN_API_KEY: apiKey,
				},
				maxBuffer: 10 * 1024 * 1024,
			},
		);

		return {
			ok: true,
			stdout,
			stderr,
			durationMs: Date.now() - startTime,
		};
	} finally {
		syncInProgress = false;
	}
}

function safeName(value) {
	return String(value || "")
		.replace(/[\\/]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function parsePrefixedName(fileName) {
	const ext = path.extname(fileName);
	const stem = path.basename(fileName, ext);
	const match = stem.match(/^(\d+)\s*-\s*(.+)$/);
	if (!match) {
		return {
			index: Number.POSITIVE_INFINITY,
			title: stem,
		};
	}

	return {
		index: Number.parseInt(match[1], 10),
		title: match[2].trim(),
	};
}

function sortFilesByIndexThenName(fileNames) {
	return [...fileNames].sort((left, right) => {
		const leftParsed = parsePrefixedName(left);
		const rightParsed = parsePrefixedName(right);
		if (leftParsed.index !== rightParsed.index) {
			return leftParsed.index - rightParsed.index;
		}
		return left.localeCompare(right, undefined, {
			numeric: true,
			sensitivity: "base",
		});
	});
}

function resolveRoot(rootId) {
	return roots[rootId] || null;
}

function requireSafeSegment(segment) {
	if (!segment || segment.includes("..") || segment.includes(path.sep)) {
		return null;
	}
	return segment;
}

async function listCollections(rootId) {
	const rootPath = resolveRoot(rootId);
	if (!rootPath) {
		return [];
	}

	await fs.mkdir(rootPath, { recursive: true });
	const entries = await fs.readdir(rootPath, { withFileTypes: true });
	const collections = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const collectionPath = path.join(rootPath, entry.name);
		const files = await fs.readdir(collectionPath, { withFileTypes: true });
		const mediaFiles = sortFilesByIndexThenName(
			files
				.filter((file) => file.isFile())
				.map((file) => file.name)
				.filter((name) =>
					supportedExtensions.has(path.extname(name).toLowerCase()),
				),
		);

		collections.push({
			name: entry.name,
			itemCount: mediaFiles.length,
			previews: mediaFiles
				.filter((fileName) =>
					imageExtensions.has(path.extname(fileName).toLowerCase()),
				)
				.slice(0, 3)
				.map((fileName) => buildMediaUrl(rootId, entry.name, fileName)),
		});
	}

	collections.sort((left, right) =>
		left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
	);
	return collections;
}

async function getCollectionItems(rootId, collectionName) {
	const rootPath = resolveRoot(rootId);
	const safeCollectionName = requireSafeSegment(collectionName);
	if (!rootPath || !safeCollectionName) {
		return [];
	}

	const collectionPath = path.join(rootPath, safeCollectionName);
	await fs.mkdir(collectionPath, { recursive: true });
	const entries = await fs.readdir(collectionPath, { withFileTypes: true });
	const mediaFiles = sortFilesByIndexThenName(
		entries
			.filter((entry) => entry.isFile())
			.map((entry) => entry.name)
			.filter((name) =>
				supportedExtensions.has(path.extname(name).toLowerCase()),
			),
	);

	return mediaFiles.map((fileName) => {
		const parsed = parsePrefixedName(fileName);
		const mediaType = imageExtensions.has(path.extname(fileName).toLowerCase())
			? "image"
			: "video";
		const mediaUrl = `/media/${encodeURIComponent(rootId)}/${encodeURIComponent(safeCollectionName)}/${encodeURIComponent(fileName)}`;
		const previewUrl =
			mediaType === "image"
				? buildMediaUrl(rootId, safeCollectionName, fileName)
				: mediaUrl;

		return {
			originalFileName: fileName,
			title: parsed.title,
			url: mediaUrl,
			previewUrl,
			mediaType,
		};
	});
}

function nextUniqueName(desiredName, takenNames) {
	if (!takenNames.has(desiredName)) {
		takenNames.add(desiredName);
		return desiredName;
	}

	const ext = path.extname(desiredName);
	const stem = path.basename(desiredName, ext);
	let suffix = 2;

	while (true) {
		const candidate = `${stem} (${suffix})${ext}`;
		if (!takenNames.has(candidate)) {
			takenNames.add(candidate);
			return candidate;
		}
		suffix += 1;
	}
}

async function saveCollection(rootId, collectionName, requestedItems) {
	const rootPath = resolveRoot(rootId);
	const safeCollectionName = requireSafeSegment(collectionName);
	if (!rootPath || !safeCollectionName) {
		throw new Error("Invalid root or collection.");
	}

	const collectionPath = path.join(rootPath, safeCollectionName);
	await fs.mkdir(collectionPath, { recursive: true });

	const existingEntries = await fs.readdir(collectionPath, {
		withFileTypes: true,
	});
	const existingFiles = new Set(
		existingEntries
			.filter((entry) => entry.isFile())
			.map((entry) => entry.name)
			.filter((name) =>
				supportedExtensions.has(path.extname(name).toLowerCase()),
			),
	);

	const desiredItems = Array.isArray(requestedItems) ? requestedItems : [];
	const seenOriginals = new Set();

	for (const item of desiredItems) {
		const originalFileName = requireSafeSegment(item?.originalFileName);
		if (!originalFileName || !existingFiles.has(originalFileName)) {
			throw new Error(
				`Missing source file: ${item?.originalFileName || "unknown"}`,
			);
		}
		if (seenOriginals.has(originalFileName)) {
			throw new Error(
				`Duplicate source file in save request: ${originalFileName}`,
			);
		}
		seenOriginals.add(originalFileName);
	}

	const takenNames = new Set();
	const renamePlan = desiredItems.map((item, index) => {
		const originalFileName = requireSafeSegment(item.originalFileName);
		const ext = path.extname(originalFileName);
		const fallbackTitle = parsePrefixedName(originalFileName).title;
		const cleanedTitle =
			safeName(item?.title || "") || fallbackTitle || "Untitled";
		const desired = `${index + 1} - ${cleanedTitle}${ext}`;
		const uniqueDesired = nextUniqueName(desired, takenNames);

		return {
			originalFileName,
			desiredFileName: uniqueDesired,
			tempFileName: `.__tmp__.${crypto.randomUUID()}${ext}`,
		};
	});

	for (const step of renamePlan) {
		await fs.rename(
			path.join(collectionPath, step.originalFileName),
			path.join(collectionPath, step.tempFileName),
		);
	}

	for (const step of renamePlan) {
		await fs.rename(
			path.join(collectionPath, step.tempFileName),
			path.join(collectionPath, step.desiredFileName),
		);
	}

	return getCollectionItems(rootId, safeCollectionName);
}

async function readBody(req) {
	const chunks = [];
	for await (const chunk of req) {
		chunks.push(chunk);
	}
	const text = Buffer.concat(chunks).toString("utf8");
	return text ? JSON.parse(text) : {};
}

function sendJson(res, statusCode, payload) {
	res.writeHead(statusCode, {
		"Content-Type": "application/json; charset=utf-8",
	});
	res.end(JSON.stringify(payload));
}

async function serveStaticFile(res, filePath) {
	const ext = path.extname(filePath).toLowerCase();
	const contentType = contentTypeByExt[ext] || "application/octet-stream";
	const content = await fs.readFile(filePath);
	res.writeHead(200, { "Content-Type": contentType });
	res.end(content);
}

const server = http.createServer(async (req, res) => {
	const url = new URL(
		req.url || "/",
		`http://${req.headers.host || `localhost:${port}`}`,
	);

	try {
		if (req.method === "GET" && url.pathname === "/favicon.ico") {
			res.writeHead(204);
			res.end();
			return;
		}

		if (req.method === "GET" && url.pathname === "/api/config") {
			return sendJson(res, 200, {
				roots: [
					{ id: "photos", label: "Photos" },
					{ id: "artworks", label: "Artworks" },
				],
			});
		}

		if (req.method === "GET" && url.pathname === "/api/collections") {
			const rootId = url.searchParams.get("rootId") || "photos";
			const collections = await listCollections(rootId);
			return sendJson(res, 200, { collections });
		}

		if (req.method === "GET" && url.pathname === "/api/collection") {
			const rootId = url.searchParams.get("rootId") || "photos";
			const collection = url.searchParams.get("collection") || "";
			const items = await getCollectionItems(rootId, collection);
			return sendJson(res, 200, { items });
		}

		if (req.method === "POST" && url.pathname === "/api/collection") {
			const body = await readBody(req);
			const rootId = body?.rootId || "photos";
			const collectionName = safeName(body?.collectionName || "");
			const safeCollectionName = requireSafeSegment(collectionName);

			if (!resolveRoot(rootId) || !safeCollectionName) {
				return sendJson(res, 400, { error: "Invalid collection details." });
			}

			const collectionPath = path.join(resolveRoot(rootId), safeCollectionName);
			await fs.mkdir(collectionPath, { recursive: true });
			return sendJson(res, 201, {
				ok: true,
				collectionName: safeCollectionName,
			});
		}

		if (req.method === "POST" && url.pathname === "/api/save") {
			const body = await readBody(req);
			const rootId = body?.rootId || "photos";
			const collectionName = body?.collectionName || "";
			const items = body?.items || [];
			const updatedItems = await saveCollection(rootId, collectionName, items);
			return sendJson(res, 200, { ok: true, items: updatedItems });
		}

		if (req.method === "POST" && url.pathname === "/api/sync") {
			if (syncInProgress) {
				return sendJson(res, 409, { error: "Sync already in progress." });
			}
			const result = await runSyncScript();
			return sendJson(res, 200, result);
		}

		if (req.method === "GET" && url.pathname.startsWith("/media/")) {
			const [, , rootIdRaw, collectionRaw, fileRaw] = url.pathname.split("/");
			const rootId = decodeURIComponent(rootIdRaw || "");
			const collection = requireSafeSegment(
				decodeURIComponent(collectionRaw || ""),
			);
			const fileName = requireSafeSegment(decodeURIComponent(fileRaw || ""));
			const rootPath = resolveRoot(rootId);

			if (!rootPath || !collection || !fileName) {
				return sendJson(res, 400, { error: "Invalid media path." });
			}

			const mediaPath = path.join(rootPath, collection, fileName);
			if (!mediaPath.startsWith(path.join(rootPath, collection))) {
				return sendJson(res, 403, { error: "Forbidden." });
			}

			return serveStaticFile(res, mediaPath);
		}

		if (req.method === "GET") {
			const requested = url.pathname === "/" ? "/index.html" : url.pathname;
			const targetPath = path.join(publicDir, requested);
			const normalized = path.normalize(targetPath);
			if (!normalized.startsWith(publicDir)) {
				return sendJson(res, 403, { error: "Forbidden." });
			}
			return serveStaticFile(res, normalized);
		}

		sendJson(res, 404, { error: "Not found." });
	} catch (error) {
		if (error?.code === "ENOENT" && req.method === "GET") {
			sendJson(res, 404, { error: "Not found." });
			return;
		}
		sendJson(res, 500, { error: error?.message || "Server error." });
	}
});

server.listen(port, () => {
	console.log(`Collection Manager running on http://localhost:${port}`);
	console.log(`Managing roots:`);
	console.log(`- photos: ${roots.photos}`);
	console.log(`- artworks: ${roots.artworks}`);
});
