#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const API_BASE = "https://cdn.hackclub.com/api/v4";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const LOCAL_GALLERY_ROOT = path.join(REPO_ROOT, "Local", "Gallery");
const MANIFEST_PATH = path.join(
	REPO_ROOT,
	"Assets",
	"Text",
	"gallery_collections.json",
);
const CACHE_PATH = path.join(
	REPO_ROOT,
	"Local",
	".cache",
	"cdn_upload_index.json",
);

const CATEGORY_DIRS = [
	{ id: "photos", label: "Photos", dirName: "Photos" },
	{ id: "artwork", label: "Artworks", dirName: "Artwork" },
];

const IMAGE_EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".heic",
	".heif",
	".webp",
	".gif",
	".avif",
	".bmp",
	".tif",
	".tiff",
]);

const VIDEO_EXTENSIONS = new Set([
	".mp4",
	".webm",
	".mov",
	".avi",
	".mkv",
	".flv",
	".m4v",
]);

const SUPPORTED_EXTENSIONS = new Set([
	...IMAGE_EXTENSIONS,
	...VIDEO_EXTENSIONS,
]);

const MIME_BY_EXT = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".heic": "image/heic",
	".heif": "image/heif",
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
	".flv": "video/x-flv",
	".m4v": "video/x-m4v",
};

const getMediaType = (filePath) => {
	const ext = path.extname(filePath).toLowerCase();
	if (IMAGE_EXTENSIONS.has(ext)) {
		return "image";
	}
	if (VIDEO_EXTENSIONS.has(ext)) {
		return "video";
	}
	return null;
};

const toPosixPath = (value) => value.split(path.sep).join("/");

const slugify = (value) =>
	String(value || "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "untitled";

const titleFromFileName = (filename) =>
	path
		.basename(filename, path.extname(filename))
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase()) || "Untitled";

const titleFromSlug = (slug) =>
	slug
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ") || "Untitled";

const ensureArray = (value) => (Array.isArray(value) ? value : []);

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function readJson(filePath, fallback) {
	if (!(await fileExists(filePath))) {
		return fallback;
	}
	const raw = await fs.readFile(filePath, "utf8");
	try {
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

async function writeJson(filePath, value) {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function sha256OfFile(filePath) {
	const buffer = await fs.readFile(filePath);
	const hash = crypto.createHash("sha256").update(buffer).digest("hex");
	return { hash, buffer };
}

async function listCollectionDirs(categoryDirPath) {
	if (!(await fileExists(categoryDirPath))) {
		return [];
	}
	const entries = await fs.readdir(categoryDirPath, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => ({
			name: entry.name,
			path: path.join(categoryDirPath, entry.name),
		}));
}

async function walkFilesRecursively(dirPath) {
	const output = [];
	const entries = await fs.readdir(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const absolutePath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			const nested = await walkFilesRecursively(absolutePath);
			output.push(...nested);
			continue;
		}
		if (!entry.isFile()) {
			continue;
		}
		const ext = path.extname(entry.name).toLowerCase();
		if (SUPPORTED_EXTENSIONS.has(ext)) {
			output.push(absolutePath);
		}
	}

	return output;
}

async function urlExists(url, memo) {
	if (!url) {
		return false;
	}
	if (memo.has(url)) {
		return memo.get(url);
	}

	try {
		const headRes = await fetch(url, { method: "HEAD" });
		if (headRes.ok) {
			memo.set(url, true);
			return true;
		}
		if (headRes.status === 405 || headRes.status === 403) {
			const getRes = await fetch(url, {
				method: "GET",
				headers: { Range: "bytes=0-0" },
			});
			const ok = getRes.ok || getRes.status === 206;
			memo.set(url, ok);
			return ok;
		}
	} catch {
		memo.set(url, false);
		return false;
	}

	memo.set(url, false);
	return false;
}

async function uploadFileToCdn({ apiKey, filePath, buffer }) {
	const ext = path.extname(filePath).toLowerCase();
	const mimeType = MIME_BY_EXT[ext] || "application/octet-stream";
	const blob = new Blob([buffer], { type: mimeType });
	const formData = new FormData();
	formData.append("file", blob, path.basename(filePath));

	const response = await fetch(`${API_BASE}/upload`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
		body: formData,
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const errorMessage = payload?.error || `HTTP ${response.status}`;
		throw new Error(`CDN upload failed for ${filePath}: ${errorMessage}`);
	}
	if (!payload?.url) {
		throw new Error(`CDN upload returned no URL for ${filePath}`);
	}
	return payload;
}

function ensureManifestShape(manifest) {
	const result = manifest && typeof manifest === "object" ? manifest : {};
	result.categories =
		result.categories && typeof result.categories === "object"
			? result.categories
			: {};
	return result;
}

function ensureCategory(manifest, categoryId, categoryLabel) {
	manifest.categories[categoryId] = manifest.categories[categoryId] || {
		label: categoryLabel,
		collections: [],
	};

	const category = manifest.categories[categoryId];
	category.label = category.label || categoryLabel;
	category.collections = ensureArray(category.collections);
	return category;
}

function ensureCollection(category, collectionFolderName) {
	const collectionId = slugify(collectionFolderName);
	let collection = category.collections.find(
		(entry) => entry.id === collectionId,
	);
	if (!collection) {
		collection = {
			id: collectionId,
			name: titleFromSlug(collectionId),
			description: "",
			items: [],
		};
		category.collections.push(collection);
	}
	collection.items = ensureArray(collection.items);
	return collection;
}

function findManifestItemByHash(manifest, hash) {
	const categories = manifest?.categories || {};
	for (const category of Object.values(categories)) {
		const collections = ensureArray(category?.collections);
		for (const collection of collections) {
			const items = ensureArray(collection?.items);
			for (const item of items) {
				if (item?.source?.sha256 === hash && item?.url) {
					return item;
				}
			}
		}
	}
	return null;
}

function findCollectionItemByLocalPath(collection, localPath) {
	return ensureArray(collection?.items).find(
		(item) => item?.source?.localPath === localPath,
	);
}

async function main() {
	const apiKey = process.env.CDN_API_KEY;
	if (!apiKey) {
		console.error("Missing CDN_API_KEY environment variable.");
		process.exit(1);
	}

	const manifest = ensureManifestShape(await readJson(MANIFEST_PATH, {}));
	const cache = await readJson(CACHE_PATH, { filesBySha256: {} });
	cache.filesBySha256 = cache.filesBySha256 || {};

	const urlCheckMemo = new Map();
	let uploadCount = 0;
	let reusedCount = 0;
	let updatedItems = 0;

	for (const categoryDef of CATEGORY_DIRS) {
		const categoryDirPath = path.join(LOCAL_GALLERY_ROOT, categoryDef.dirName);
		const collectionDirs = await listCollectionDirs(categoryDirPath);
		if (!collectionDirs.length) {
			continue;
		}

		const category = ensureCategory(
			manifest,
			categoryDef.id,
			categoryDef.label,
		);

		for (const collectionDir of collectionDirs) {
			const collection = ensureCollection(category, collectionDir.name);
			const imagePaths = await walkFilesRecursively(collectionDir.path);

			for (const imagePath of imagePaths) {
				const relativeFromRoot = toPosixPath(
					path.relative(REPO_ROOT, imagePath),
				);
				const mediaType = getMediaType(imagePath);
				if (!mediaType) {
					continue;
				}

				const { hash, buffer } = await sha256OfFile(imagePath);
				const existingInCollection = findCollectionItemByLocalPath(
					collection,
					relativeFromRoot,
				);

				let resolvedUpload = null;

				const cached = cache.filesBySha256[hash];
				if (cached?.url && (await urlExists(cached.url, urlCheckMemo))) {
					resolvedUpload = cached;
				}

				if (!resolvedUpload) {
					const manifestMatch = findManifestItemByHash(manifest, hash);
					if (
						manifestMatch?.url &&
						(await urlExists(manifestMatch.url, urlCheckMemo))
					) {
						resolvedUpload = {
							id: manifestMatch.id,
							url: manifestMatch.url,
							filename: path.basename(imagePath),
						};
					}
				}

				if (!resolvedUpload) {
					const uploadResult = await uploadFileToCdn({
						apiKey,
						filePath: imagePath,
						buffer,
					});
					resolvedUpload = uploadResult;
					uploadCount += 1;
				} else {
					reusedCount += 1;
				}

				cache.filesBySha256[hash] = {
					id: resolvedUpload.id,
					url: resolvedUpload.url,
					filename: resolvedUpload.filename || path.basename(imagePath),
					lastSeenLocalPath: relativeFromRoot,
					updatedAt: new Date().toISOString(),
				};

				const title = titleFromFileName(path.basename(imagePath));
				const itemPayload = {
					id:
						resolvedUpload.id ||
						`${collection.id}-${slugify(path.basename(imagePath))}`,
					title,
					caption: existingInCollection?.caption || "",
					url: resolvedUpload.url,
					alt: existingInCollection?.alt || title,
					type: mediaType,
					source: {
						localPath: relativeFromRoot,
						sha256: hash,
					},
				};

				if (existingInCollection) {
					Object.assign(existingInCollection, itemPayload);
				} else {
					collection.items.push(itemPayload);
				}
				updatedItems += 1;
			}
		}
	}

	await writeJson(MANIFEST_PATH, manifest);
	await writeJson(CACHE_PATH, cache);

	console.log("Local gallery sync complete.");
	console.log(`Uploaded: ${uploadCount}`);
	console.log(`Reused existing CDN files: ${reusedCount}`);
	console.log(`Manifest items touched: ${updatedItems}`);
	console.log(`Manifest: ${MANIFEST_PATH}`);
	console.log(`Cache: ${CACHE_PATH}`);
}

main().catch((error) => {
	console.error(error?.message || String(error));
	process.exit(1);
});
