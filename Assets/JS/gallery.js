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

			const img = document.createElement("img");
			img.src = item.url;
			img.alt = item.alt || item.title || "Gallery image";
			img.loading = "lazy";
			img.decoding = "async";

			const captionWrap = document.createElement("div");
			captionWrap.className = "gallery-caption-wrap";

			const title = document.createElement("p");
			title.className = "gallery-title";
			title.textContent = item.title || "Untitled";

			const caption = document.createElement("p");
			caption.className = "caption";
			caption.textContent = item.caption || "";

			captionWrap.append(title, caption);
			card.append(img, captionWrap);
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
