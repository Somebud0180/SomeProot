import { initLayout, updateCardHeight } from "./layout.js";
import { initFaceMotion } from "./face-motion.js";
import { initContent, loadMarkdown } from "./content.js";
import { initJournal } from "./journal.js";
import { CustomSelector, initCustomSelectors } from "./custom-selector.js";

function initializeApp() {
	initLayout();
	initContent({ onAfterRender: updateCardHeight });
	initJournal();
	initFaceMotion();
	initCustomSelectors({ onSelectionChanged: loadMarkdown });
	updateCardHeight();
	window.CustomSelector = CustomSelector;
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeApp);
} else {
	initializeApp();
}
