// Utility to create a placeholder for a broken image
export function createImgPlaceholder(img) {
	const placeholder = document.createElement("div");
	placeholder.className = "img-placeholder";
	placeholder.textContent = img.alt || "Image not found";
	if (img.hasAttribute("width"))
		placeholder.style.width = img.getAttribute("width") + "px";
	if (img.hasAttribute("height"))
		placeholder.style.height = img.getAttribute("height") + "px";
	img.parentNode.replaceChild(placeholder, img);
}

// Attach error handler to a single image if not already attached
export function attachImgErrorHandler(img) {
	if (!img._imgPlaceholderAttached) {
		img.addEventListener(
			"error",
			function handler() {
				createImgPlaceholder(img);
			},
			{ once: true },
		);
		img._imgPlaceholderAttached = true;
	}
}

// Attach error handler to all images in the document (auto mode)
export function autoAttachImgErrorHandlers() {
	const images = document.querySelectorAll("img");
	images.forEach(attachImgErrorHandler);
}
