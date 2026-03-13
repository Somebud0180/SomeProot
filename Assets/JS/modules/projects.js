const OVERLAY_PAGE_PATH = "/SomeProot/projects/3d-viewer/index.html";
const MODEL_BASE_PATH = "/SomeProot/Assets/3D/";
const MODEL_VIEWER_SCRIPT_SRC =
	"https://cdn.jsdelivr.net/npm/@google/model-viewer@4.2.0/dist/model-viewer.min.js";

let overlayElement = null;
let escapeListenerAttached = false;

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
			}
		});
		escapeListenerAttached = true;
	}
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
	window.load3DOverlay = load3DOverlay;
	window.close3DOverlay = close3DOverlay;
}
