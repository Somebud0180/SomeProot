const state = {
	roots: [],
	rootId: "photos",
	supportedExtensions: [],
	collections: [],
	selectedCollection: null,
	items: [],
	sortedFiles: [],
	dirty: false,
	syncing: false,
};

const rootSelect = document.getElementById("rootSelect");
const collectionList = document.getElementById("collectionList");
const itemList = document.getElementById("itemList");
const collectionTitle = document.getElementById("collectionTitle");
const saveButton = document.getElementById("saveButton");
const createCollectionButton = document.getElementById(
	"createCollectionButton",
);
const saveSyncButton = document.getElementById("saveSyncButton");
const newCollectionNameInput = document.getElementById("newCollectionName");
const syncButton = document.getElementById("syncButton");
const syncStatus = document.getElementById("syncStatus");
const mediaInput = document.getElementById("mediaInput");
const uploadSortDirection = document.getElementById("uploadSortDirection");
const uploadSortButton = document.getElementById("uploadSortButton");
const addMediaButton = document.getElementById("addMediaButton");
const uploadStatus = document.getElementById("uploadStatus");
const helpText = document.querySelector(".help-text");

function setUploadStatus(message) {
	if (uploadStatus) {
		uploadStatus.textContent = message || "";
		uploadStatus.hidden = !state.selectedCollection || !message;
	}
}

function updateUploadControls() {
	const hasSelection = Boolean(state.selectedCollection);
	const enabled = hasSelection && !state.syncing;
	if (mediaInput) {
		mediaInput.disabled = !enabled;
	}
	if (uploadSortDirection) {
		uploadSortDirection.disabled = !enabled;
	}
	if (uploadSortButton) {
		uploadSortButton.disabled = !enabled;
	}
	if (addMediaButton) {
		addMediaButton.disabled = !enabled;
		addMediaButton.hidden = !hasSelection;
	}
	if (helpText) {
		helpText.hidden = !hasSelection;
	}

	if (!hasSelection) {
		setUploadStatus("");
	}
}

function setSyncing(value, message) {
	state.syncing = value;
	if (syncButton) {
		syncButton.disabled = value;
	}
	if (syncStatus && message) {
		syncStatus.textContent = message;
	}
	updateUploadControls();
}

function setDirty(value) {
	state.dirty = value;
	saveButton.disabled = !value || !state.selectedCollection;
	if (saveSyncButton) {
		saveSyncButton.disabled =
			!state.selectedCollection || (!value && !state.dirty);
	}
}
// Save and sync only the current collection
async function saveAndSyncCurrentCollection() {
	if (!state.selectedCollection || !state.items.length) {
		return;
	}
	setSyncing(true, "Syncing collection...");
	try {
		const payload = await fetchJson("/api/sync-collection", {
			method: "POST",
			body: JSON.stringify({
				rootId: state.rootId,
				collectionName: state.selectedCollection,
				items: state.items.map((item) => ({
					originalFileName: item.originalFileName,
					title: sanitizeTitle(item.title),
					altText: sanitizeAltText(item.altText),
				})),
			}),
		});
		const seconds = (payload.durationMs / 1000).toFixed(1);
		setSyncing(false, `Collection synced in ${seconds}s.`);
		setDirty(false);
		await loadCollections();
		if (state.selectedCollection) {
			await openCollection(state.selectedCollection);
		}
	} catch (error) {
		setSyncing(false, `Sync failed: ${error.message}`);
	}
}

function sanitizeTitle(value) {
	return String(value || "")
		.replace(/[\\/]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function sanitizeAltText(value) {
	return String(value || "").trim();
}

function extensionFromName(fileName) {
	const dotIndex = fileName.lastIndexOf(".");
	if (dotIndex < 0) {
		return "";
	}
	return fileName.slice(dotIndex).toLowerCase();
}

function hasSupportedExtension(fileName) {
	return state.supportedExtensions.includes(extensionFromName(fileName));
}

function buildMediaUrl(rootId, collectionName, fileName) {
	return `/media/${encodeURIComponent(rootId)}/${encodeURIComponent(collectionName)}/${encodeURIComponent(fileName)}`;
}

async function sortAndDisplayFiles() {
	if (!state.selectedCollection || !state.items.length) {
		alert("No media in collection to sort.");
		return;
	}

	setUploadStatus("Extracting dates & sorting...");
	try {
		const exifr =
			await import("https://cdn.jsdelivr.net/npm/exifr@latest/dist/full.esm.js");
		const parseExif = exifr.parse || (exifr.default && exifr.default.parse);

		console.log("Starting sort with", state.items.length, "items");
		console.log(
			"Parse EXIF function:",
			parseExif ? "available" : "not available",
		);

		// Fetch and parse each file to get its creation date
		const itemsWithDates = await Promise.all(
			state.items.map(async (item) => {
				let date = 0;
				try {
					const mediaUrl = buildMediaUrl(
						state.rootId,
						state.selectedCollection,
						item.originalFileName,
					);
					console.log("Fetching:", mediaUrl);
					const response = await fetch(mediaUrl);
					if (response.ok) {
						const blob = await response.blob();
						console.log(`Blob type for ${item.originalFileName}:`, blob.type);
						if (blob.type.startsWith("image/") && parseExif) {
							const exifData = await parseExif(blob, {
								pick: ["DateTimeOriginal"],
							});
							console.log(`EXIF data for ${item.originalFileName}:`, exifData);
							if (exifData && exifData.DateTimeOriginal) {
								date = new Date(exifData.DateTimeOriginal).getTime();
								console.log(
									`Extracted date for ${item.originalFileName}:`,
									new Date(date),
									"timestamp:",
									date,
								);
							} else {
								console.log(
									`No DateTimeOriginal in EXIF for ${item.originalFileName}`,
								);
							}
						} else {
							console.log(
								`Skipping EXIF parse for ${item.originalFileName} - not an image or parseExif unavailable`,
							);
						}
					} else {
						console.log(
							`Failed to fetch ${item.originalFileName}: ${response.status}`,
						);
					}
				} catch (err) {
					console.warn(
						`Failed to parse EXIF for ${item.originalFileName}`,
						err,
					);
				}
				return { item, date };
			}),
		);

		console.log("Items with dates:", itemsWithDates);

		// Sort by date
		const descending =
			uploadSortDirection && uploadSortDirection.value === "newest";
		console.log(
			"Sorting",
			descending ? "descending (newest first)" : "ascending (oldest first)",
		);
		itemsWithDates.sort((a, b) =>
			descending ? b.date - a.date : a.date - b.date,
		);

		console.log("After sort:", itemsWithDates);

		// Keep original items sorted, preserving actual filenames
		// saveCurrentCollection() will handle re-indexing when user saves
		const sortedItems = itemsWithDates.map((entry) => entry.item);

		state.items = sortedItems;
		state.sortedFiles = [];
		setDirty(true);
		setUploadStatus(`Sorted ${sortedItems.length} file(s).`);
		renderItems();
	} catch (err) {
		console.warn("Failed to sort files by EXIF date", err);
		setUploadStatus(`Sort failed: ${err.message}`);
		throw err;
	}
}

async function addSelectedMedia() {
	if (!state.selectedCollection || !mediaInput) {
		return;
	}

	const files = Array.from(mediaInput.files || []);
	if (!files.length) {
		alert("Choose at least one media file.");
		return;
	}

	const unsupported = files.filter((file) => !hasSupportedExtension(file.name));
	if (unsupported.length) {
		const names = unsupported.map((file) => file.name).join(", ");
		throw new Error(`Unsupported file extension: ${names}`);
	}

	const formData = new FormData();
	formData.append("rootId", state.rootId);
	formData.append("collectionName", state.selectedCollection);
	for (const file of files) {
		formData.append("files", file, file.name);
	}

	setUploadStatus("Uploading media...");
	const response = await fetch("/api/media", {
		method: "POST",
		body: formData,
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(payload?.error || `Upload failed: ${response.status}`);
	}

	state.items = payload.items || [];
	state.sortedFiles = [];
	setDirty(false);
	mediaInput.value = "";
	setUploadStatus(`Added ${payload.addedCount || files.length} file(s).`);
	await loadCollections();
	renderItems();
}

async function fetchJson(url, options = {}) {
	const response = await fetch(url, {
		headers: { "Content-Type": "application/json" },
		...options,
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(payload?.error || `Request failed: ${response.status}`);
	}
	return payload;
}

function renderRoots() {
	rootSelect.innerHTML = "";
	for (const root of state.roots) {
		const option = document.createElement("option");
		option.value = root.id;
		option.textContent = root.label;
		option.selected = root.id === state.rootId;
		rootSelect.append(option);
	}
}

function renderCollections() {
	collectionList.innerHTML = "";

	if (!state.collections.length) {
		const empty = document.createElement("li");
		empty.className = "empty-state";
		empty.textContent = "No collections yet.";
		collectionList.append(empty);
		return;
	}

	for (const collection of state.collections) {
		const li = document.createElement("li");
		li.className = `collection-card${state.selectedCollection === collection.name ? " active" : ""}`;
		li.dataset.collection = collection.name;

		const title = document.createElement("div");
		title.textContent = `${collection.name} (${collection.itemCount})`;
		li.append(title);

		const previewRow = document.createElement("div");
		previewRow.className = "preview-row";
		for (const src of collection.previews) {
			const img = document.createElement("img");
			img.src = src;
			img.alt = collection.name;
			previewRow.append(img);
		}
		li.append(previewRow);

		li.addEventListener("click", () => {
			openCollection(collection.name).catch((error) => {
				alert(error.message);
			});
		});

		collectionList.append(li);
	}
}

function moveItem(index, delta) {
	const nextIndex = index + delta;
	if (nextIndex < 0 || nextIndex >= state.items.length) {
		return;
	}

	const previousPositions = captureItemPositions();
	const swapped = [...state.items];
	[swapped[index], swapped[nextIndex]] = [swapped[nextIndex], swapped[index]];
	state.items = swapped;
	setDirty(true);
	renderItems(previousPositions);
}

function captureItemPositions() {
	const positions = new Map();
	itemList.querySelectorAll(".item-card").forEach((node) => {
		const key = node.getAttribute("data-key");
		if (!key) {
			return;
		}
		positions.set(key, node.getBoundingClientRect());
	});
	return positions;
}

function animateItemReorder(previousPositions) {
	if (!previousPositions || !previousPositions.size) {
		return;
	}

	requestAnimationFrame(() => {
		itemList.querySelectorAll(".item-card").forEach((node) => {
			const key = node.getAttribute("data-key");
			if (!key) {
				return;
			}

			const previous = previousPositions.get(key);
			if (!previous) {
				return;
			}

			const current = node.getBoundingClientRect();
			const deltaX = previous.left - current.left;
			const deltaY = previous.top - current.top;
			if (!deltaX && !deltaY) {
				return;
			}

			node.animate(
				[
					{ transform: `translate(${deltaX}px, ${deltaY}px)` },
					{ transform: "translate(0, 0)" },
				],
				{
					duration: 260,
					easing: "cubic-bezier(0.22, 1, 0.36, 1)",
				},
			);
		});
	});
}

function renderItems(previousPositions) {
	itemList.innerHTML = "";

	if (!state.selectedCollection) {
		collectionTitle.textContent = "Select a collection";
		const empty = document.createElement("li");
		empty.className = "empty-state";
		empty.textContent = "Choose a collection from the left.";
		itemList.append(empty);
		setDirty(false);
		updateUploadControls();
		return;
	}

	collectionTitle.textContent = state.selectedCollection;

	if (!state.items.length) {
		const empty = document.createElement("li");
		empty.className = "empty-state";
		empty.textContent = "This collection has no media files yet.";
		itemList.append(empty);
		setDirty(false);
		updateUploadControls();
		return;
	}

	state.items.forEach((item, index) => {
		const li = document.createElement("li");
		li.className = "item-card";
		li.setAttribute("data-key", item.originalFileName);

		const preview =
			item.mediaType === "video"
				? document.createElement("video")
				: document.createElement("img");
		preview.className = item.mediaType === "video" ? "thumb-video" : "thumb";
		preview.src = item.previewUrl || item.url;
		if (item.mediaType === "video") {
			preview.controls = true;
			preview.muted = true;
			preview.preload = "metadata";
		} else {
			preview.alt = item.title;
		}

		const main = document.createElement("div");
		main.className = "item-main";

		const indexLabel = document.createElement("label");
		indexLabel.textContent = "Order: ";
		const indexInput = document.createElement("input");
		indexInput.type = "number";
		indexInput.min = "1";
		indexInput.max = state.items.length.toString();
		indexInput.value = (index + 1).toString();
		indexInput.style.width = "4rem";
		indexInput.addEventListener("change", (event) => {
			let newIndex = parseInt(event.target.value, 10) - 1;
			if (isNaN(newIndex)) return;
			if (newIndex < 0) newIndex = 0;
			if (newIndex >= state.items.length) newIndex = state.items.length - 1;
			if (newIndex !== index) {
				const previousPositions = captureItemPositions();
				const movedItem = state.items.splice(index, 1)[0];
				state.items.splice(newIndex, 0, movedItem);
				setDirty(true);
				renderItems(previousPositions);
			} else {
				event.target.value = (index + 1).toString();
			}
		});
		indexLabel.append(indexInput);
		main.append(indexLabel);

		const input = document.createElement("input");
		input.type = "text";
		input.value = item.title;
		input.addEventListener("input", (event) => {
			state.items[index].title = sanitizeTitle(event.target.value);
			setDirty(true);
		});
		main.append(input);

		const altLabel = document.createElement("label");
		altLabel.textContent = "Alt text";
		main.append(altLabel);

		const altInput = document.createElement("input");
		altInput.type = "text";
		altInput.value = item.altText || "";
		altInput.placeholder = "Describe the media for accessibility";
		altInput.className = "alt-input";
		altInput.addEventListener("input", (event) => {
			state.items[index].altText = event.target.value;
			setDirty(true);
		});
		main.append(altInput);

		const subLabel = document.createElement("label");
		subLabel.textContent = `Source: ${item.originalFileName}`;
		main.append(subLabel);

		const controls = document.createElement("div");
		controls.className = "order-controls";

		const upButton = document.createElement("button");
		upButton.type = "button";
		upButton.textContent = "↑";
		upButton.disabled = index === 0;
		upButton.addEventListener("click", () => moveItem(index, -1));

		const downButton = document.createElement("button");
		downButton.type = "button";
		downButton.textContent = "↓";
		downButton.disabled = index === state.items.length - 1;
		downButton.addEventListener("click", () => moveItem(index, 1));

		controls.append(upButton, downButton);
		li.append(preview, main, controls);
		itemList.append(li);
	});

	animateItemReorder(previousPositions);
	updateUploadControls();
}

async function loadCollections() {
	const payload = await fetchJson(
		`/api/collections?rootId=${encodeURIComponent(state.rootId)}`,
	);
	state.collections = payload.collections;
	if (
		!state.collections.some(
			(collection) => collection.name === state.selectedCollection,
		)
	) {
		state.selectedCollection = null;
		state.items = [];
	}
	renderCollections();
	renderItems();
}

async function openCollection(collectionName) {
	if (state.dirty) {
		const shouldDiscard = window.confirm(
			"You have unsaved changes. Discard and continue?",
		);
		if (!shouldDiscard) {
			return;
		}
	}

	const payload = await fetchJson(
		`/api/collection?rootId=${encodeURIComponent(state.rootId)}&collection=${encodeURIComponent(collectionName)}`,
	);
	state.selectedCollection = collectionName;
	state.items = payload.items;
	setDirty(false);
	renderCollections();
	renderItems();
}

async function createCollection() {
	const collectionName = sanitizeTitle(newCollectionNameInput.value);
	if (!collectionName) {
		alert("Enter a collection name.");
		return;
	}

	await fetchJson("/api/collection", {
		method: "POST",
		body: JSON.stringify({
			rootId: state.rootId,
			collectionName,
		}),
	});

	newCollectionNameInput.value = "";
	await loadCollections();
	await openCollection(collectionName);
}

async function saveCurrentCollection() {
	if (!state.selectedCollection || !state.items.length) {
		return;
	}

	const payload = await fetchJson("/api/save", {
		method: "POST",
		body: JSON.stringify({
			rootId: state.rootId,
			collectionName: state.selectedCollection,
			items: state.items.map((item) => ({
				originalFileName: item.originalFileName,
				title: sanitizeTitle(item.title),
				altText: sanitizeAltText(item.altText),
			})),
		}),
	});

	state.items = payload.items;
	setDirty(false);
	await loadCollections();
	renderItems();
}

async function syncOnlineCollections() {
	setSyncing(true, "Sync in progress...");
	try {
		const payload = await fetchJson("/api/sync", {
			method: "POST",
			body: JSON.stringify({}),
		});
		const seconds = (payload.durationMs / 1000).toFixed(1);
		setSyncing(false, `Sync complete in ${seconds}s.`);
		await loadCollections();
		if (state.selectedCollection) {
			await openCollection(state.selectedCollection);
		}
	} catch (error) {
		setSyncing(false, `Sync failed: ${error.message}`);
	}
}

rootSelect.addEventListener("change", async (event) => {
	if (state.dirty) {
		const shouldDiscard = window.confirm(
			"You have unsaved changes. Discard and switch category?",
		);
		if (!shouldDiscard) {
			rootSelect.value = state.rootId;
			return;
		}
	}

	state.rootId = event.target.value;
	state.selectedCollection = null;
	state.items = [];
	setDirty(false);
	await loadCollections();
});

saveButton.addEventListener("click", () => {
	saveCurrentCollection().catch((error) => {
		alert(error.message);
	});
});

uploadSortButton.addEventListener("click", () => {
	sortAndDisplayFiles().catch((error) => {
		alert(error.message);
	});
});

createCollectionButton.addEventListener("click", () => {
	createCollection().catch((error) => {
		alert(error.message);
	});
});

newCollectionNameInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		createCollection().catch((error) => {
			alert(error.message);
		});
	}
});

if (syncButton) {
	syncButton.addEventListener("click", () => {
		syncOnlineCollections().catch((error) => {
			setSyncing(false, `Sync failed: ${error.message}`);
		});
	});
}

if (saveSyncButton) {
	saveSyncButton.addEventListener("click", () => {
		saveAndSyncCurrentCollection().catch((error) => {
			setSyncing(false, `Sync failed: ${error.message}`);
		});
	});
}

if (addMediaButton) {
	addMediaButton.addEventListener("click", () => {
		if (!mediaInput || mediaInput.disabled) {
			return;
		}
		mediaInput.value = "";
		mediaInput.click();
	});
}

if (mediaInput) {
	mediaInput.addEventListener("change", () => {
		addSelectedMedia().catch((error) => {
			setUploadStatus(`Upload failed: ${error.message}`);
			alert(error.message);
		});
	});
}

async function init() {
	const config = await fetchJson("/api/config");
	state.roots = config.roots;
	state.supportedExtensions = Array.isArray(config.supportedExtensions)
		? config.supportedExtensions.map((value) => String(value).toLowerCase())
		: [];
	if (mediaInput && state.supportedExtensions.length) {
		mediaInput.setAttribute("accept", state.supportedExtensions.join(","));
	}
	if (!state.roots.some((root) => root.id === state.rootId)) {
		state.rootId = state.roots[0]?.id || "photos";
	}

	renderRoots();
	updateUploadControls();
	await loadCollections();
}

init().catch((error) => {
	alert(error.message);
});
