(function () {
	const PAGE_NAME = document.body?.getAttribute("data-page") || "";
	if (PAGE_NAME !== "Gallery" && PAGE_NAME !== "GalleryViewer") {
		return;
	}

	const COLLECTION_GRID_ID = "gallery-collection-grid";
	const CATEGORY_SELECT_ID = "gallery-category-select";
	const COLLECTION_DESCRIPTION_ID = "gallery-collection-description";
	const GRID_SELECTOR = ".card-grid";
	const MANIFEST_PATH = "/SomeProot/Assets/Text/gallery_collections.json";
	const VIEWER_PATH = "/SomeProot/gallery-viewer/";
	const IMAGE_PRELOAD_ROOT_MARGIN = "1200px 0px";
	const EAGER_IMAGE_COUNT = 0;

	let manifestData = null;
	let mediaObserver = null;

	const getElements = () => ({
		categorySelect: document.getElementById(CATEGORY_SELECT_ID),
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

	const safeCollectionName = (collection) => {
		if (!collection) {
			return "Untitled Collection";
		}
		return collection.name || collection.id || "Untitled Collection";
	};

	const safeCollectionItems = (collection) => {
		if (!collection || !Array.isArray(collection.items)) {
			return [];
		}
		return collection.items.filter((item) => Boolean(item?.url));
	};

	const disconnectMediaObserver = () => {
		if (mediaObserver) {
			mediaObserver.disconnect();
			mediaObserver = null;
		}
	};

	const activateImageSource = (img) => {
		const src = img?.dataset?.src;
		if (!src) {
			return;
		}

		img.src = src;
		delete img.dataset.src;
	};

	const markImageLoaded = (img) => {
		img.classList.remove("gallery-image--pending");
		img.classList.add("gallery-image--loaded");
		img.closest(".gallery-item")?.classList.remove("gallery-item--pending");
	};

	const setupProgressiveImageLoading = (grid) => {
		disconnectMediaObserver();

		const pendingImages = Array.from(
			grid.querySelectorAll("img.gallery-image[data-src]"),
		);

		if (!pendingImages.length) {
			return;
		}

		if (!("IntersectionObserver" in window)) {
			pendingImages.forEach((img) => activateImageSource(img));
			return;
		}

		mediaObserver = new IntersectionObserver(
			(entries, observer) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) {
						return;
					}
					const img = entry.target;
					activateImageSource(img);
					observer.unobserve(img);
				});
			},
			{
				root: null,
				rootMargin: IMAGE_PRELOAD_ROOT_MARGIN,
				threshold: 0.01,
			},
		);

		pendingImages.forEach((img) => mediaObserver.observe(img));
	};

	const createMediaElement = (item, index) => {
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
		img.className = "gallery-media gallery-image gallery-image--pending";
		img.height = 256;
		img.alt = item.alt || item.title || "Gallery media";
		img.loading = index < EAGER_IMAGE_COUNT ? "eager" : "lazy";
		img.decoding = "async";
		img.addEventListener("load", () => markImageLoaded(img), { once: true });
		img.addEventListener("error", () => markImageLoaded(img), { once: true });

		if (index < EAGER_IMAGE_COUNT) {
			img.src = item.url;
		} else {
			img.dataset.src = item.url;
		}

		return img;
	};

	const renderGrid = (collection, grid, descriptionNode = null) => {
		disconnectMediaObserver();
		clearNode(grid);
		const items = safeCollectionItems(collection);

		if (descriptionNode) {
			descriptionNode.textContent = collection?.description || "";
		}

		if (!items.length) {
			const emptyState = document.createElement("p");
			emptyState.className = "gallery-empty";
			emptyState.textContent = "No images in this collection yet.";
			grid.appendChild(emptyState);
			return;
		}

		items.forEach((item, index) => {
			const card = document.createElement("article");
			card.className = "gallery-item";
			if (item?.type === "video") {
				card.classList.add("gallery-item--video");
			} else {
				card.classList.add("gallery-item--pending");
			}

			const mediaElement = createMediaElement(item, index);

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

		setupProgressiveImageLoading(grid);
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

	const getCollectionPreviewImage = (collection) => {
		const previewItem = safeCollectionItems(collection).find(
			(item) => (item?.type || "image") !== "video",
		);
		return previewItem?.url || "";
	};

	const createCollectionCard = (categoryId, collection) => {
		const card = document.createElement("article");
		card.className = "card";

		const previewUrl = getCollectionPreviewImage(collection);
		if (previewUrl) {
			const image = document.createElement("img");
			image.className = "card__image";
			image.src = previewUrl;
			image.alt = safeCollectionName(collection);
			image.loading = "lazy";
			image.decoding = "async";
			card.appendChild(image);
		}

		const content = document.createElement("div");
		content.className = "card__content";

		const name = document.createElement("h2");
		name.className = "card__name";
		name.textContent = safeCollectionName(collection);

		const description = document.createElement("p");
		description.className = "card__description";
		const itemCount = safeCollectionItems(collection).length;
		const itemCountText = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
		description.textContent = collection?.description
			? `${collection.description} • ${itemCountText}`
			: itemCountText;

		const button = document.createElement("a");
		button.className = "card__button";
		button.textContent = "Open Collection";
		const params = new URLSearchParams({
			category: categoryId,
			collection: collection?.id || "",
		});
		button.href = `${VIEWER_PATH}?${params.toString()}`;

		content.append(name, description, button);
		card.appendChild(content);

		return card;
	};

	const renderCollectionGrid = (gridNode, categoryId = "") => {
		clearNode(gridNode);
		const categories = getCategoryList();

		if (!categories.length) {
			renderError(gridNode, "No categories found in gallery data.");
			return;
		}

		const selectedCategory = categories.find(
			(category) => category.id === categoryId,
		);
		const visibleCategories = selectedCategory
			? [selectedCategory]
			: categories;

		visibleCategories.forEach((category) => {
			category.collections.forEach((collection) => {
				gridNode.appendChild(createCollectionCard(category.id, collection));
			});
		});
	};

	const fillCategorySelect = (categorySelect) => {
		clearNode(categorySelect);
		const categories = getCategoryList();
		categories.forEach((category) => {
			categorySelect.appendChild(createOption(category.id, category.label));
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

	const getQuerySelection = (categories) => {
		const params = new URLSearchParams(window.location.search);
		const categoryFromQuery = params.get("category") || "";
		const collectionFromQuery = params.get("collection") || "";

		const selectedCategory = categories.find(
			(category) => category.id === categoryFromQuery,
		);
		const categoryId = selectedCategory?.id || categories[0].id;

		return {
			categoryId,
			collectionId: collectionFromQuery,
		};
	};

	const setViewerHeader = (collection) => {
		const pageTitle = document.querySelector(".page .title");
		const pageDescription = document.querySelector(".page .description");
		if (pageTitle) {
			pageTitle.textContent = `Collection: ${safeCollectionName(collection)}`;
		}
		if (pageDescription) {
			pageDescription.textContent = collection?.description || "";
		}
	};

	const renderError = (grid, message) => {
		clearNode(grid);
		const errorNode = document.createElement("p");
		errorNode.className = "gallery-empty";
		errorNode.textContent = message;
		grid.appendChild(errorNode);
	};

	const loadManifest = async () => {
		try {
			const response = await fetch(MANIFEST_PATH);
			if (!response.ok) {
				throw new Error(`Failed to load collections (${response.status})`);
			}
			manifestData = await response.json();
		} catch (error) {
			throw error;
		}
	};

	const initCollectionPage = async () => {
		const collectionGrid = document.getElementById(COLLECTION_GRID_ID);
		const categorySelect = document.getElementById(CATEGORY_SELECT_ID);
		if (!collectionGrid || !categorySelect) {
			return;
		}

		try {
			await loadManifest();
		} catch (error) {
			console.error(error);
			renderError(collectionGrid, "Could not load gallery data.");
			return;
		}

		const categories = getCategoryList();
		if (!categories.length) {
			renderError(collectionGrid, "No categories found in gallery data.");
			return;
		}

		fillCategorySelect(categorySelect);
		syncSelectorsToCustomPicker(categorySelect);
		renderCollectionGrid(collectionGrid, categorySelect.value);

		categorySelect.addEventListener("change", () => {
			renderCollectionGrid(collectionGrid, categorySelect.value);
		});
	};

	const initViewerPage = async () => {
		const collectionDescription = document.getElementById(
			COLLECTION_DESCRIPTION_ID,
		);
		const grid = document.querySelector(GRID_SELECTOR);
		if (!grid) {
			return;
		}

		try {
			await loadManifest();
		} catch (error) {
			console.error(error);
			renderError(grid, "Could not load gallery data.");
			return;
		}

		const categories = getCategoryList();
		if (!categories.length) {
			renderError(grid, "No categories found in gallery data.");
			return;
		}

		const { categoryId, collectionId } = getQuerySelection(categories);
		const selectedCollection = getSelectedCollection(categoryId, collectionId);

		if (!selectedCollection) {
			renderError(grid, "Collection not found.");
			if (collectionDescription) {
				collectionDescription.textContent = "";
			}
			return;
		}

		setViewerHeader(selectedCollection);
		if (collectionDescription) {
			collectionDescription.textContent = "";
		}
		renderGrid(selectedCollection, grid);
	};

	const init = () => {
		if (PAGE_NAME === "Gallery") {
			initCollectionPage();
			return;
		}

		initViewerPage();
	};

	document.addEventListener("DOMContentLoaded", init);
})();
