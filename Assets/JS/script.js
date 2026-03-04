import { initLayout, updateCardHeight } from "./modules/layout.js";

async function initializeApp() {
	const pageName = document.body?.getAttribute("data-page") || "";
	const hasImgTargets = Boolean(document.querySelector("img"));
	const hasSectionTargets = Boolean(document.querySelector("[section]"));
	const hasFaceTargets = Boolean(
		document.querySelector(".face") &&
		document.getElementById("left-eye-container") &&
		document.getElementById("right-eye-container") &&
		document.querySelector(".mouth"),
	);
	const hasCustomSelectors = Boolean(
		document.querySelector(".custom-selector, .picker-select"),
	);
	const hasJournalTargets =
		pageName === "Journal" ||
		pageName === "JournalViewer" ||
		Boolean(document.getElementById("journalEntries")) ||
		Boolean(document.getElementById("journalBody"));

	const [
		contentModule,
		imgModule,
		journalModule,
		faceMotionModule,
		customSelectorModule,
	] = await Promise.all([
		hasSectionTargets ? import("./modules/content.js") : Promise.resolve(null),
		hasImgTargets ? import("./modules/img.js") : Promise.resolve(null),
		hasJournalTargets ? import("./modules/journal.js") : Promise.resolve(null),
		hasFaceTargets ? import("./modules/face-motion.js") : Promise.resolve(null),
		hasCustomSelectors
			? import("./modules/custom-selector.js")
			: Promise.resolve(null),
	]);

	console.log("Initializing app...");
	initLayout();

	if (imgModule && typeof imgModule.autoAttachImgErrorHandlers === "function") {
		imgModule.autoAttachImgErrorHandlers();
	}

	if (contentModule) {
		contentModule.initContent({ onAfterRender: updateCardHeight });
	}

	if (journalModule) {
		journalModule.initJournal();
	}

	if (faceMotionModule) {
		faceMotionModule.initFaceMotion();
	}

	if (customSelectorModule) {
		const onSelectionChanged = contentModule
			? contentModule.loadMarkdown
			: undefined;
		customSelectorModule.initCustomSelectors({ onSelectionChanged });
		window.CustomSelector = customSelectorModule.CustomSelector;
	}

	updateCardHeight();
}

function runAppInit() {
	initializeApp();
}

document.addEventListener("turbo:load", runAppInit);

if (document.readyState !== "loading") {
	runAppInit();
}
