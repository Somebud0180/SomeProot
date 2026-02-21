#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://cdn.hackclub.com/api/v4";
const MANIFEST_PATH = path.resolve("Assets/Text/gallery_collections.json");

const args = process.argv.slice(2);
const usage = `
Usage:
  CDN_API_KEY=sk_cdn_... node scripts/cdn_add_to_collection.mjs \\
    --category photos \\
    --collection-id street-scenes \\
    --collection-name "Street Scenes" \\
    --collection-description "Everyday moments" \\
    --source-url "https://example.com/image.jpg" \\
    --title "Crosswalk Light" \\
    --caption "Afternoon light downtown" \\
    --alt "City crosswalk"

Required:
  --category               photos | artwork (or any category key)
  --collection-id          stable collection key
  --source-url             public image URL to import via CDN API

Optional:
  --collection-name
  --collection-description
  --title
  --caption
  --alt
`;

const getArg = (name, fallback = "") => {
	const index = args.indexOf(name);
	if (index === -1 || index + 1 >= args.length) {
		return fallback;
	}
	return args[index + 1];
};

const slugify = (value) =>
	String(value || "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "item";

const ensureArray = (value) => (Array.isArray(value) ? value : []);

async function uploadFromUrl(sourceUrl, apiKey) {
	const response = await fetch(`${API_BASE}/upload_from_url`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ url: sourceUrl }),
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const errorMessage = payload?.error || `HTTP ${response.status}`;
		throw new Error(`CDN upload failed: ${errorMessage}`);
	}

	if (!payload?.url) {
		throw new Error("CDN upload did not return an image URL.");
	}

	return payload;
}

async function readManifest() {
	const raw = await fs.readFile(MANIFEST_PATH, "utf8");
	return JSON.parse(raw);
}

async function writeManifest(data) {
	const text = `${JSON.stringify(data, null, 2)}\n`;
	await fs.writeFile(MANIFEST_PATH, text, "utf8");
}

async function main() {
	const apiKey = process.env.CDN_API_KEY;
	if (!apiKey) {
		console.error("Missing CDN_API_KEY environment variable.");
		console.error(usage);
		process.exit(1);
	}

	const categoryKey = getArg("--category");
	const collectionId = getArg("--collection-id");
	const sourceUrl = getArg("--source-url");

	if (!categoryKey || !collectionId || !sourceUrl) {
		console.error("Missing required flags.");
		console.error(usage);
		process.exit(1);
	}

	const categoryLabel =
		getArg("--category-label") ||
		categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
	const collectionName =
		getArg("--collection-name") ||
		collectionId
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	const collectionDescription = getArg("--collection-description");
	const title = getArg("--title") || "Untitled";
	const caption = getArg("--caption");
	const alt = getArg("--alt") || title;

	console.log("Uploading to Hack Club CDN API...");
	const uploadResult = await uploadFromUrl(sourceUrl, apiKey);

	const manifest = await readManifest();
	manifest.categories = manifest.categories || {};
	manifest.categories[categoryKey] = manifest.categories[categoryKey] || {
		label: categoryLabel,
		collections: [],
	};

	const category = manifest.categories[categoryKey];
	category.collections = ensureArray(category.collections);

	let collection = category.collections.find(
		(entry) => entry.id === collectionId,
	);
	if (!collection) {
		collection = {
			id: collectionId,
			name: collectionName,
			description: collectionDescription,
			items: [],
		};
		category.collections.push(collection);
	}

	collection.items = ensureArray(collection.items);

	const itemId = uploadResult.id || `${collectionId}-${slugify(title)}`;
	collection.items.push({
		id: itemId,
		title,
		caption,
		url: uploadResult.url,
		alt,
	});

	await writeManifest(manifest);

	console.log("Done.");
	console.log(`CDN URL: ${uploadResult.url}`);
	console.log(`Updated manifest: ${MANIFEST_PATH}`);
}

main().catch((error) => {
	console.error(error.message || String(error));
	process.exit(1);
});
