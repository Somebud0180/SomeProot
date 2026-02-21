const state = {
	roots: [],
	rootId: "photos",
	collections: [],
	selectedCollection: null,
	items: [],
	dirty: false,
};

const rootSelect = document.getElementById("rootSelect");
const collectionList = document.getElementById("collectionList");
const itemList = document.getElementById("itemList");
const collectionTitle = document.getElementById("collectionTitle");
const saveButton = document.getElementById("saveButton");
const createCollectionButton = document.getElementById(
	"createCollectionButton",
);
const newCollectionNameInput = document.getElementById("newCollectionName");

function setDirty(value) {
	state.dirty = value;
	saveButton.disabled = !value || !state.selectedCollection;
}

function sanitizeTitle(value) {
	return String(value || "")
		.replace(/[\\/]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
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

	const swapped = [...state.items];
	[swapped[index], swapped[nextIndex]] = [swapped[nextIndex], swapped[index]];
	state.items = swapped;
	setDirty(true);
	renderItems();
}

function renderItems() {
	itemList.innerHTML = "";

	if (!state.selectedCollection) {
		collectionTitle.textContent = "Select a collection";
		const empty = document.createElement("li");
		empty.className = "empty-state";
		empty.textContent = "Choose a collection from the left.";
		itemList.append(empty);
		setDirty(false);
		return;
	}

	collectionTitle.textContent = state.selectedCollection;

	if (!state.items.length) {
		const empty = document.createElement("li");
		empty.className = "empty-state";
		empty.textContent = "This collection has no media files yet.";
		itemList.append(empty);
		setDirty(false);
		return;
	}

	state.items.forEach((item, index) => {
		const li = document.createElement("li");
		li.className = "item-card";

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
		indexLabel.textContent = `Order: ${index + 1}`;
		main.append(indexLabel);

		const input = document.createElement("input");
		input.type = "text";
		input.value = item.title;
		input.addEventListener("input", (event) => {
			state.items[index].title = sanitizeTitle(event.target.value);
			setDirty(true);
		});
		main.append(input);

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
			})),
		}),
	});

	state.items = payload.items;
	setDirty(false);
	await loadCollections();
	renderItems();
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

async function init() {
	const config = await fetchJson("/api/config");
	state.roots = config.roots;
	if (!state.roots.some((root) => root.id === state.rootId)) {
		state.rootId = state.roots[0]?.id || "photos";
	}

	renderRoots();
	await loadCollections();
}

init().catch((error) => {
	alert(error.message);
});
