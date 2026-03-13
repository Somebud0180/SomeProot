const OVERLAY_PAGE_PATH = "/SomeProot/projects/3d-viewer/index.html";
const MODEL_BASE_PATH = "/SomeProot/Assets/3D/";
const MODEL_VIEWER_SCRIPT_SRC =
	"https://cdn.jsdelivr.net/npm/@google/model-viewer@4.2.0/dist/model-viewer.min.js";

let overlayElement = null;
let cardOverlayElement = null;
let escapeListenerAttached = false;
let activeProjectCardSource = null;
let isProjectCardOverlayAnimating = false;

function buildModelPath(modelSrc) {
	if (typeof modelSrc !== "string" || !modelSrc.trim()) {
		throw new Error("A model source is required.");
	}

	if (modelSrc.startsWith("/")) {
		return modelSrc;
	}

	return `${MODEL_BASE_PATH}${modelSrc.replace(/^\/+/, "")}`;
}

function close3DOverlay() {
	const modal = overlayElement || document.getElementById("project-3d-modal");
	if (!modal) {
		return;
	}

	modal.style.display = "none";
}

function closeProjectCardOverlay() {
	const modal =
		cardOverlayElement || document.getElementById("project-card-overlay");
	if (!modal) {
		return;
	}

	const overlayCard = modal.querySelector(".project-card--overlay");
	const sourceCard = activeProjectCardSource;

	if (!overlayCard || !sourceCard || isProjectCardOverlayAnimating) {
		modal.style.display = "none";
		modal.classList.remove("project-card-overlay--visible");
		modal.classList.remove("project-card-overlay--animating");
		if (activeProjectCardSource) {
			activeProjectCardSource.classList.remove("project-card--source-hidden");
		}
		activeProjectCardSource = null;
		const mount = modal.querySelector(".project-card-overlay__mount");
		if (mount) {
			mount.replaceChildren();
		}
		return;
	}

	isProjectCardOverlayAnimating = true;
	modal.classList.add("project-card-overlay--animating");

	const currentRect = overlayCard.getBoundingClientRect();
	const sourceRect = sourceCard.getBoundingClientRect();

	overlayCard.style.left = `${currentRect.left}px`;
	overlayCard.style.top = `${currentRect.top}px`;
	overlayCard.style.width = `${currentRect.width}px`;
	overlayCard.style.height = `${currentRect.height}px`;
	overlayCard.offsetWidth;

	requestAnimationFrame(() => {
		modal.classList.remove("project-card-overlay--visible");
		overlayCard.style.left = `${sourceRect.left}px`;
		overlayCard.style.top = `${sourceRect.top}px`;
		overlayCard.style.width = `${sourceRect.width}px`;
		overlayCard.style.height = `${sourceRect.height}px`;
	});

	const finishClose = () => {
		overlayCard.removeEventListener("transitionend", finishClose);
		modal.style.display = "none";
		modal.classList.remove("project-card-overlay--animating");
		if (activeProjectCardSource) {
			activeProjectCardSource.classList.remove("project-card--source-hidden");
		}
		activeProjectCardSource = null;
		isProjectCardOverlayAnimating = false;
		const mount = modal.querySelector(".project-card-overlay__mount");
		if (mount) {
			mount.replaceChildren();
		}
	};

	overlayCard.addEventListener("transitionend", finishClose, { once: true });

	const mount = modal.querySelector(".project-card-overlay__mount");
	if (mount) {
		void mount;
	}
}

function attachOverlayEvents(modal) {
	const closeButton = modal.querySelector(".project-3d-modal-exit");
	const closeOverlay = modal.querySelector("[data-close-3d-modal]");

	if (closeButton) {
		closeButton.addEventListener("click", close3DOverlay);
	}

	if (closeOverlay) {
		closeOverlay.addEventListener("click", close3DOverlay);
	}

	if (!escapeListenerAttached) {
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				close3DOverlay();
				closeProjectCardOverlay();
			}
		});
		escapeListenerAttached = true;
	}
}

function buildCardOverlayCard(sourceCard) {
	const clonedCard = sourceCard.cloneNode(true);
	clonedCard.classList.add("project-card--overlay");

	const expandControl = clonedCard.querySelector(".project-card__expand");
	if (expandControl) {
		const closeButton = document.createElement("button");
		closeButton.type = "button";
		closeButton.className = "project-card__expand project-card__expand--close";
		closeButton.setAttribute("aria-label", "Close expanded project card");
		closeButton.textContent = "×";
		closeButton.addEventListener("click", closeProjectCardOverlay);
		expandControl.replaceWith(closeButton);
	} else {
		const closeButton = document.createElement("button");
		closeButton.type = "button";
		closeButton.className = "project-card__expand project-card__expand--close";
		closeButton.setAttribute("aria-label", "Close expanded project card");
		closeButton.textContent = "×";
		closeButton.addEventListener("click", closeProjectCardOverlay);
		clonedCard.prepend(closeButton);
	}

	return clonedCard;
}

function ensureProjectCardOverlay() {
	if (cardOverlayElement && document.body.contains(cardOverlayElement)) {
		return cardOverlayElement;
	}

	const existing = document.getElementById("project-card-overlay");
	if (existing) {
		cardOverlayElement = existing;
		return cardOverlayElement;
	}

	const modal = document.createElement("div");
	modal.id = "project-card-overlay";
	modal.className = "project-card-overlay";
	modal.style.display = "none";
	modal.innerHTML = `
		<div class="project-card-overlay__backdrop" data-close-project-card-overlay></div>
		<div class="project-card-overlay__viewport">
			<div class="project-card-overlay__mount"></div>
		</div>
	`;

	const backdrop = modal.querySelector("[data-close-project-card-overlay]");
	const viewport = modal.querySelector(".project-card-overlay__viewport");

	backdrop?.addEventListener("click", closeProjectCardOverlay);
	viewport?.addEventListener("click", (event) => {
		if (event.target === viewport) {
			closeProjectCardOverlay();
		}
	});

	document.body.appendChild(modal);
	cardOverlayElement = modal;
	return cardOverlayElement;
}

function openProjectCardOverlay(cardOrTrigger) {
	const sourceCard = cardOrTrigger?.classList?.contains("project-card")
		? cardOrTrigger
		: cardOrTrigger?.closest?.(".project-card");

	if (!sourceCard || isProjectCardOverlayAnimating) {
		return;
	}

	const modal = ensureProjectCardOverlay();
	const mount = modal.querySelector(".project-card-overlay__mount");
	if (!mount) {
		return;
	}

	if (activeProjectCardSource && activeProjectCardSource !== sourceCard) {
		closeProjectCardOverlay();
	}

	activeProjectCardSource = sourceCard;
	const sourceRect = sourceCard.getBoundingClientRect();
	const overlayCard = buildCardOverlayCard(sourceCard);
	mount.replaceChildren(overlayCard);
	modal.style.display = "block";
	modal.classList.add("project-card-overlay--animating");

	const targetRect = overlayCard.getBoundingClientRect();
	sourceCard.classList.add("project-card--source-hidden");

	overlayCard.style.left = `${sourceRect.left}px`;
	overlayCard.style.top = `${sourceRect.top}px`;
	overlayCard.style.width = `${sourceRect.width}px`;
	overlayCard.style.height = `${sourceRect.height}px`;
	isProjectCardOverlayAnimating = true;
	overlayCard.offsetWidth;

	requestAnimationFrame(() => {
		modal.classList.add("project-card-overlay--visible");
		overlayCard.style.left = `${targetRect.left}px`;
		overlayCard.style.top = `${targetRect.top}px`;
		overlayCard.style.width = `${targetRect.width}px`;
		overlayCard.style.height = `${targetRect.height}px`;
	});

	const finishOpen = () => {
		overlayCard.removeEventListener("transitionend", finishOpen);
		overlayCard.style.removeProperty("left");
		overlayCard.style.removeProperty("top");
		overlayCard.style.removeProperty("width");
		overlayCard.style.removeProperty("height");
		modal.classList.remove("project-card-overlay--animating");
		isProjectCardOverlayAnimating = false;
	};

	overlayCard.addEventListener("transitionend", finishOpen, { once: true });
}

function attachProjectCardExpandHandlers() {
	document.querySelectorAll(".project-card__expand").forEach((expandControl) => {
		if (expandControl.dataset.overlayBound === "true") {
			return;
		}

		expandControl.dataset.overlayBound = "true";
		expandControl.setAttribute("role", "button");
		expandControl.setAttribute("tabindex", "0");
		expandControl.setAttribute("aria-label", "Expand project card");

		expandControl.addEventListener("click", () => {
			openProjectCardOverlay(expandControl);
		});

		expandControl.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				openProjectCardOverlay(expandControl);
			}
		});
	});
}

function updateModelSource(modelSrc) {
	const modal = overlayElement || document.getElementById("project-3d-modal");
	if (!modal) {
		throw new Error("3D overlay is not available.");
	}

	const modelViewer = modal.querySelector("#active-project-model-viewer");
	const resolvedPath = buildModelPath(modelSrc);

	if (!modelViewer) {
		throw new Error("Overlay model elements are missing.");
	}

	modelViewer.setAttribute("src", resolvedPath);
	if (typeof modelViewer.resetTurntableRotation === "function") {
		modelViewer.resetTurntableRotation();
	}
}

function open3DOverlay() {
	const modal = overlayElement || document.getElementById("project-3d-modal");
	if (!modal) {
		return;
	}

	modal.style.display = "block";
}

async function ensureModelViewerLoaded() {
	if (customElements.get("model-viewer")) {
		return;
	}

	const existingScript = document.querySelector(
		`script[src="${MODEL_VIEWER_SCRIPT_SRC}"]`,
	);

	if (existingScript) {
		await new Promise((resolve, reject) => {
			if (customElements.get("model-viewer")) {
				resolve();
				return;
			}

			existingScript.addEventListener("load", () => resolve(), { once: true });
			existingScript.addEventListener(
				"error",
				() => reject(new Error("Failed to load model-viewer.")),
				{ once: true },
			);
		});
		await customElements.whenDefined("model-viewer");
		return;
	}

	await new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.type = "module";
		script.src = MODEL_VIEWER_SCRIPT_SRC;
		script.addEventListener("load", () => resolve(), { once: true });
		script.addEventListener(
			"error",
			() => reject(new Error("Failed to load model-viewer.")),
			{ once: true },
		);
		document.head.appendChild(script);
	});

	await customElements.whenDefined("model-viewer");
}

async function ensureOverlayInjected() {
	if (overlayElement && document.body.contains(overlayElement)) {
		return overlayElement;
	}

	const existing = document.getElementById("project-3d-modal");
	if (existing) {
		overlayElement = existing;
		return overlayElement;
	}

	const response = await fetch(OVERLAY_PAGE_PATH, {
		credentials: "same-origin",
	});

	if (!response.ok) {
		throw new Error("Failed to load 3D overlay markup.");
	}

	const html = await response.text();
	const parser = new DOMParser();
	const parsedDoc = parser.parseFromString(html, "text/html");
	const modal = parsedDoc.getElementById("project-3d-modal");

	if (!modal) {
		throw new Error("3D overlay markup is missing #project-3d-modal.");
	}

	document.body.appendChild(modal);
	overlayElement = modal;
	attachOverlayEvents(overlayElement);
	return overlayElement;
}

async function load3DOverlay(modelSrc) {
	await ensureModelViewerLoaded();
	await ensureOverlayInjected();
	updateModelSource(modelSrc);
	open3DOverlay();
}

export function initProjects() {
	attachProjectCardExpandHandlers();
	window.load3DOverlay = load3DOverlay;
	window.close3DOverlay = close3DOverlay;
	window.openProjectCardOverlay = openProjectCardOverlay;
	window.closeProjectCardOverlay = closeProjectCardOverlay;
}
