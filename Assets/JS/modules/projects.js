const OVERLAY_PAGE_PATH = "/SomeProot/projects/3d-viewer/index.html";
const MODEL_BASE_PATH = "/SomeProot/Assets/3D/";
const AFRAME_SCRIPT_SRC = "https://aframe.io/releases/1.7.1/aframe.min.js";

let overlayElement = null;
let escapeListenerAttached = false;
let rotationHandlersAttached = false;

const DEFAULT_MODEL_ROTATION = { x: 0, y: 0, z: 0 };

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

	setupModelRotationInteraction(modal);
}

function centerLoadedModel(modal) {
	const modelEntity = modal.querySelector("#active-project-model");
	const modelObject = modelEntity?.getObject3D("mesh");

	if (!modelEntity || !modelObject || !window.THREE) {
		return;
	}

	const box = new window.THREE.Box3().setFromObject(modelObject);
	if (box.isEmpty()) {
		modelEntity.setAttribute("position", "0 0 0");
		return;
	}

	const center = box.getCenter(new window.THREE.Vector3());

	modelObject.position.x -= center.x;
	modelObject.position.y -= center.y;
	modelObject.position.z -= center.z;
	modelEntity.setAttribute("position", "0 0 0");
}

function setupModelRotationInteraction(modal) {
	if (rotationHandlersAttached) {
		return;
	}

	const scene = modal.querySelector("a-scene.project-3d-scene");
	const modelEntity = modal.querySelector("#active-project-model");

	if (!scene || !modelEntity) {
		return;
	}

	let dragging = false;
	let lastX = 0;
	let lastY = 0;

	scene.addEventListener("pointerdown", (event) => {
		dragging = true;
		lastX = event.clientX;
		lastY = event.clientY;
	});

	window.addEventListener("pointerup", () => {
		dragging = false;
	});

	window.addEventListener("pointermove", (event) => {
		if (!dragging) {
			return;
		}

		const deltaX = event.clientX - lastX;
		const deltaY = event.clientY - lastY;

		const rotation = modelEntity.getAttribute("rotation") || {
			x: DEFAULT_MODEL_ROTATION.x,
			y: DEFAULT_MODEL_ROTATION.y,
			z: DEFAULT_MODEL_ROTATION.z,
		};

		const nextX = Math.max(-50, Math.min(50, rotation.x - deltaY * 0.2));
		const nextY = rotation.y + deltaX * 0.35;

		modelEntity.setAttribute("rotation", `${nextX} ${nextY} 0`);

		lastX = event.clientX;
		lastY = event.clientY;
	});

	modelEntity.addEventListener("model-loaded", () => {
		centerLoadedModel(modal);
	});

	rotationHandlersAttached = true;
}

function updateModelSource(modelSrc) {
	const modal = overlayElement || document.getElementById("project-3d-modal");
	if (!modal) {
		throw new Error("3D overlay is not available.");
	}

	const assetItem = modal.querySelector("#project-model");
	const modelEntity = modal.querySelector("#active-project-model");
	const resolvedPath = buildModelPath(modelSrc);

	if (!assetItem || !modelEntity) {
		throw new Error("Overlay model elements are missing.");
	}

	assetItem.setAttribute("src", resolvedPath);
	modelEntity.setAttribute("position", "0 0 0");
	modelEntity.setAttribute(
		"rotation",
		`${DEFAULT_MODEL_ROTATION.x} ${DEFAULT_MODEL_ROTATION.y} ${DEFAULT_MODEL_ROTATION.z}`,
	);
	modelEntity.removeAttribute("gltf-model");
	modelEntity.setAttribute("gltf-model", "#project-model");
}

function open3DOverlay() {
	const modal = overlayElement || document.getElementById("project-3d-modal");
	if (!modal) {
		return;
	}

	modal.style.display = "block";
}

async function ensureAFrameLoaded() {
	if (window.AFRAME) {
		return;
	}

	const existingScript = document.querySelector(
		`script[src="${AFRAME_SCRIPT_SRC}"]`,
	);

	if (existingScript) {
		await new Promise((resolve, reject) => {
			if (window.AFRAME) {
				resolve();
				return;
			}

			existingScript.addEventListener("load", () => resolve(), { once: true });
			existingScript.addEventListener(
				"error",
				() => reject(new Error("Failed to load A-Frame.")),
				{ once: true },
			);
		});
		return;
	}

	await new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = AFRAME_SCRIPT_SRC;
		script.addEventListener("load", () => resolve(), { once: true });
		script.addEventListener(
			"error",
			() => reject(new Error("Failed to load A-Frame.")),
			{ once: true },
		);
		document.head.appendChild(script);
	});
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
	await ensureAFrameLoaded();
	await ensureOverlayInjected();
	updateModelSource(modelSrc);
	open3DOverlay();
}

export function initProjects() {
	window.load3DOverlay = load3DOverlay;
	window.close3DOverlay = close3DOverlay;
}
