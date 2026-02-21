(function () {
	const PAGE_NAME = document.body?.getAttribute("data-page") || "";
	if (PAGE_NAME !== "Gallery") {
		return;
	}

	const CATEGORY_SELECT_ID = "gallery-category-select";
	const COLLECTION_SELECT_ID = "gallery-collection-select";
	const COLLECTION_DESCRIPTION_ID = "gallery-collection-description";
	const GRID_SELECTOR = ".gallery-grid";
	const MANIFEST_PATH = "/SomeProot/Assets/Text/gallery_collections.json";

	let manifestData = null;
	const heicObjectUrlCache = new Map();

	const getElements = () => ({
		categorySelect: document.getElementById(CATEGORY_SELECT_ID),
		collectionSelect: document.getElementById(COLLECTION_SELECT_ID),
		collectionDescription: document.getElementById(COLLECTION_DESCRIPTION_ID),
		grid: document.querySelector(GRID_SELECTOR),
	});

	const clearNode = (node) => {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	};

	const createOption = (value, label) => {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = label;
		return option;
	};

	const safeCollectionItems = (collection) => {
		if (!collection || !Array.isArray(collection.items)) {
			return [];
		}
		return collection.items.filter((item) => Boolean(item?.url));
	};

	const isHeicItem = (item) => {
		const mimeType = String(item?.mimeType || "").toLowerCase();
		if (mimeType.includes("image/heic") || mimeType.includes("image/heif")) {
			return true;
		}

		const url = String(item?.url || "");
		return /\.hei[cf](?:$|[?#])/i.test(url);
	};

	const convertHeicToObjectUrl = async (sourceUrl) => {
		if (!sourceUrl) {
			throw new Error("Missing HEIC source URL.");
		}

		if (heicObjectUrlCache.has(sourceUrl)) {
			return heicObjectUrlCache.get(sourceUrl);
		}

		if (typeof window.heic2any !== "function") {
			throw new Error("heic2any is not available.");
		}

		const response = await fetch(sourceUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch HEIC image (${response.status}).`);
		}

		const heicBlob = await response.blob();
		const converted = await window.heic2any({
			blob: heicBlob,
			toType: "image/jpeg",
			quality: 0.9,
		});

		const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
		if (!(convertedBlob instanceof Blob)) {
			throw new Error("HEIC conversion failed.");
		}

		const objectUrl = URL.createObjectURL(convertedBlob);
		heicObjectUrlCache.set(sourceUrl, objectUrl);
		return objectUrl;
	};

	const attachHeicFallback = (img, item) => {
		if (!isHeicItem(item)) {
			return;
		}

		let attempted = false;
		const runConversion = async () => {
			if (attempted) {
				return;
			}
			attempted = true;

			try {
				const fallbackUrl = await convertHeicToObjectUrl(item.url);
				img.src = fallbackUrl;
			} catch (error) {
				console.warn("HEIC fallback failed:", error);
			}
		};

		img.addEventListener("error", () => {
			runConversion();
		});

		runConversion();
	};

	const createMediaElement = (item) => {
		const itemType = item?.type || "image";

		if (itemType === "video") {
			const video = document.createElement("video");
			video.className = "gallery-media gallery-video";
			video.controls = true;
			video.preload = "metadata";

			const source = document.createElement("source");
			source.src = item.url;
			source.type = item.mimeType || "video/mp4";

			video.appendChild(source);
			const fallbackText = document.createTextNode(
				"Your browser does not support the video tag.",
			);
			video.appendChild(fallbackText);

			return video;
		}

		// Default to image
		const img = document.createElement("img");
		img.className = "gallery-media gallery-image";
		img.src = item.url;
		img.alt = item.alt || item.title || "Gallery media";
		img.loading = "lazy";
		img.decoding = "async";
		attachHeicFallback(img, item);

		return img;
	};

	const renderGrid = (collection, grid, descriptionNode) => {
		clearNode(grid);
		const items = safeCollectionItems(collection);

		descriptionNode.textContent = collection?.description || "";

		if (!items.length) {
			const emptyState = document.createElement("p");
			emptyState.className = "gallery-empty";
			emptyState.textContent = "No images in this collection yet.";
			grid.appendChild(emptyState);
			return;
		}

		items.forEach((item) => {
			const card = document.createElement("article");
			card.className = "gallery-item";
			if (item?.type === "video") {
				card.classList.add("gallery-item--video");
			}

			const mediaElement = createMediaElement(item);

			const captionWrap = document.createElement("div");
			captionWrap.className = "gallery-caption-wrap";

			const title = document.createElement("p");
			title.className = "gallery-title";
			title.textContent = item.title || "Untitled";

			const caption = document.createElement("p");
			caption.className = "caption";
			caption.textContent = item.caption || "";

			captionWrap.append(title, caption);
			card.append(mediaElement, captionWrap);
			grid.appendChild(card);
		});
	};

	const getCategoryList = () => {
		if (
			!manifestData?.categories ||
			typeof manifestData.categories !== "object"
		) {
			return [];
		}

		return Object.entries(manifestData.categories)
			.map(([id, category]) => ({
				id,
				label: category?.label || id,
				collections: Array.isArray(category?.collections)
					? category.collections
					: [],
			}))
			.filter((category) => category.collections.length > 0);
	};

	const fillCategorySelect = (categorySelect) => {
		clearNode(categorySelect);
		const categories = getCategoryList();
		categories.forEach((category) => {
			categorySelect.appendChild(createOption(category.id, category.label));
		});
	};

	const fillCollectionSelect = (collectionSelect, categoryId) => {
		clearNode(collectionSelect);
		const category = getCategoryList().find((entry) => entry.id === categoryId);
		const collections = category?.collections || [];
		collections.forEach((collection) => {
			collectionSelect.appendChild(
				createOption(collection.id, collection.name || collection.id),
			);
		});
	};

	const getSelectedCollection = (categoryId, collectionId) => {
		const category = getCategoryList().find((entry) => entry.id === categoryId);
		if (!category) {
			return null;
		}

		return (
			category.collections.find(
				(collection) => collection.id === collectionId,
			) ||
			category.collections[0] ||
			null
		);
	};

	const syncSelectorsToCustomPicker = (selectElement) => {
		if (!selectElement) {
			return;
		}
		const customPicker = selectElement.nextElementSibling;
		if (!customPicker || !customPicker.classList.contains("picker__content")) {
			return;
		}
		customPicker.remove();
		if (typeof window.CustomSelector === "function") {
			new window.CustomSelector(selectElement);
		}
	};

	const renderFromState = (elements) => {
		const categoryId = elements.categorySelect.value;
		const collectionId = elements.collectionSelect.value;
		const selectedCollection = getSelectedCollection(categoryId, collectionId);
		renderGrid(
			selectedCollection,
			elements.grid,
			elements.collectionDescription,
		);
	};

	const onCategoryChange = (elements) => {
		fillCollectionSelect(
			elements.collectionSelect,
			elements.categorySelect.value,
		);
		syncSelectorsToCustomPicker(elements.collectionSelect);
		renderFromState(elements);
	};

	const bindEvents = (elements) => {
		elements.categorySelect.addEventListener("change", () =>
			onCategoryChange(elements),
		);
		elements.collectionSelect.addEventListener("change", () =>
			renderFromState(elements),
		);
	};

	const renderError = (grid, message) => {
		clearNode(grid);
		const errorNode = document.createElement("p");
		errorNode.className = "gallery-empty";
		errorNode.textContent = message;
		grid.appendChild(errorNode);
	};

	const init = async () => {
		const elements = getElements();
		if (
			!elements.categorySelect ||
			!elements.collectionSelect ||
			!elements.collectionDescription ||
			!elements.grid
		) {
			return;
		}

		try {
			const response = await fetch(MANIFEST_PATH);
			if (!response.ok) {
				throw new Error(`Failed to load collections (${response.status})`);
			}
			manifestData = await response.json();
		} catch (error) {
			console.error(error);
			renderError(elements.grid, "Could not load gallery data.");
			return;
		}

		const categories = getCategoryList();
		if (!categories.length) {
			renderError(elements.grid, "No categories found in gallery data.");
			return;
		}

		fillCategorySelect(elements.categorySelect);
		fillCollectionSelect(elements.collectionSelect, categories[0].id);

		syncSelectorsToCustomPicker(elements.categorySelect);
		syncSelectorsToCustomPicker(elements.collectionSelect);

		bindEvents(elements);
		renderFromState(elements);
	};

	document.addEventListener("DOMContentLoaded", init);
})();
