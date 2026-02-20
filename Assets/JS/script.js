// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
	console.log("Website loaded successfully!");

	// Get the CTA button
	const ctaButton = document.getElementById("cta-button");

	// Smooth scroll for navigation links
	const navLinks = document.querySelectorAll('nav a[href^="#"]');

	navLinks.forEach((link) => {
		link.addEventListener("click", function (e) {
			e.preventDefault();

			const targetId = this.getAttribute("href");
			const targetSection = document.querySelector(targetId);

			if (targetSection) {
				targetSection.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}
		});
	});

	// Example: Log when sections come into view
	const observerOptions = {
		threshold: 0.5,
	};

	const observer = new IntersectionObserver(function (entries) {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				console.log(`Section ${entry.target.id} is now visible`);
			}
		});
	}, observerOptions);

	// Observe all sections
	const sections = document.querySelectorAll("section");
	sections.forEach((section) => {
		observer.observe(section);
	});

	const header = document.querySelector("header");
	let headerHeight = 0;

	const updateHeaderHeight = () => {
		if (!header) {
			document.body.style.removeProperty("--header-height");
			document.body.style.setProperty("--reader-bar-top", "8px");
			headerHeight = 0;
			return;
		}

		if (header.classList.contains("nav-hidden")) {
			headerHeight = 0;
			document.body.style.setProperty("--header-height", "0px");
			document.body.style.setProperty("--reader-bar-top", "8px");
			return;
		}

		headerHeight = Math.max(0, Math.round(header.offsetHeight || 0));
		document.body.style.setProperty("--header-height", `${headerHeight}px`);
		document.body.style.setProperty(
			"--reader-bar-top",
			`${headerHeight + 8}px`,
		);
	};

	// Nav hide-on-scroll-down logic
	let lastScrollY = 0;
	const headerElement = document.querySelector("header");
	let scrollThreshold = 10; // Don't hide until user scrolls more than this

	const handleNavScroll = () => {
		if (!headerElement) return;

		const currentScrollY = window.scrollY;
		const scrollDelta = currentScrollY - lastScrollY;

		// Scrolling down (delta > threshold)
		if (scrollDelta > scrollThreshold && currentScrollY > 50) {
			headerElement.classList.add("nav-hidden");
		}
		// Scrolling up (delta < -threshold)
		else if (scrollDelta < -scrollThreshold) {
			headerElement.classList.remove("nav-hidden");
		}
		// Near top of page
		else if (currentScrollY < 50) {
			headerElement.classList.remove("nav-hidden");
		}

		requestAnimationFrame(updateHeaderHeight);

		lastScrollY = currentScrollY;
	};

	if (headerElement) {
		const headerObserver = new MutationObserver(() => {
			requestAnimationFrame(updateHeaderHeight);
		});
		headerObserver.observe(headerElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		headerElement.addEventListener("transitionend", updateHeaderHeight);
	}

	window.addEventListener("scroll", handleNavScroll, { passive: true });
	window.addEventListener("resize", updateHeaderHeight);
	updateHeaderHeight();
	loadMarkdown();
	loadJournalEntries();
	loadJournalViewer();
	updateCardHeight();
});

// Select face elements for lagging motion
const face = document.querySelector(".face");
const leftEye = document.getElementById("left-eye-container");
const rightEye = document.getElementById("right-eye-container");
const mouth = document.querySelector(".mouth");
const blushLeft = document.querySelector(".blush--left");
const blushRight = document.querySelector(".blush--right");
const banner = document.querySelector(".banner");
const heroArea = document.querySelector(".hero");
const currentPage = document.body?.getAttribute("data-page") || "";
const is404Page = currentPage === "404";

const faceMotionConfig = {
	containerPadding: 12, // Keep face away from container edge
	faceEase: 0.045, // Easing factor for face movement (higher = snappier)
	eyeEase: 0.07, // Easing factor for eye movement (higher = snappier)
	mouthEase: 0.01, // Easing factor for mouth movement (higher = snappier)
	eyeParallax: 0.25, // Parallax factor for eye movement (higher = more movement)
	eyeParallaxY: 0.12, // Separate parallax factor for vertical eye movement
	mouthParallax: 0.25, // Parallax factor for mouth movement (higher = more movement)
	mouthParallaxY: 0.14, // Separate parallax factor for vertical mouth movement
	blushParallax: 0.18, // Parallax factor for blush horizontal movement
	blushEase: 0.06, // Easing factor for blush horizontal movement
	blushCenterOffsetX: 0, // Horizontal blush center correction
	cursorBiasX: 0, // Horizontal bias to offset cursor influence
	cursorBiasY: 0.05, // Vertical bias to offset cursor influence
	touchBiasY: 0.2, // Vertical bias for touch input
};

if (is404Page) {
	faceMotionConfig.cursorBiasY = -0.3;
	faceMotionConfig.touchBiasY = -0.4;
	faceMotionConfig.blushCenterOffsetX = -64;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const faceMotionState = {
	targetX: 0,
	targetY: 0,
	currentX: 0,
	currentY: 0,
	currentEyeX: 0,
	currentEyeY: 0,
	currentMouthX: 0,
	currentMouthY: 0,
	targetBlushX: 0,
	currentBlushX: 0,
	minMoveX: 0,
	maxMoveX: 0,
	maxMoveY: 0,
	centerOffsetX: 0,
};

const updateFaceBounds = () => {
	const container = banner || heroArea;
	if (!container || !face) {
		faceMotionState.minMoveX = 0;
		faceMotionState.maxMoveX = 0;
		faceMotionState.maxMoveY = 0;
		faceMotionState.centerOffsetX = 0;
		return;
	}

	updateBlushAlignment();

	const containerRect = container.getBoundingClientRect();
	const faceRect = face.getBoundingClientRect();
	const leftBlushRect = blushLeft?.getBoundingClientRect();
	const rightBlushRect = blushRight?.getBoundingClientRect();
	const margin = faceMotionConfig.containerPadding;

	const contentLeft = Math.min(
		faceRect.left,
		leftBlushRect?.left ?? faceRect.left,
	);
	const contentRight = Math.max(
		faceRect.right,
		rightBlushRect?.right ?? faceRect.right,
	);
	const contentCenterX = (contentLeft + contentRight) / 2;
	const containerCenterX = containerRect.left + containerRect.width / 2;
	const availableLeft = contentLeft - containerRect.left - margin;
	const availableRight = containerRect.right - contentRight - margin;

	faceMotionState.minMoveX = -Math.max(0, availableLeft);
	faceMotionState.maxMoveX = Math.max(0, availableRight);
	faceMotionState.centerOffsetX = contentCenterX - containerCenterX;

	const availableY =
		(containerRect.height - faceRect.height * 1.5) / 2 - margin;
	faceMotionState.maxMoveY = Math.max(0, availableY);
};

const updateFaceTargets = (clientX, clientY, isTouch = false) => {
	let boundsWidth = window.innerWidth;
	let boundsHeight = window.innerHeight;
	let originX = 0;
	let originY = 0;
	if (heroArea && !is404Page) {
		const rect = heroArea.getBoundingClientRect();
		boundsWidth = rect.width || boundsWidth;
		boundsHeight = rect.height || boundsHeight;
		originX = rect.left;
		originY = rect.top;
	}
	const rawXRatio = ((clientX - originX) / boundsWidth - 0.5) * 2;
	const rawYRatio = ((clientY - originY) / boundsHeight - 0.5) * 2;
	const xRatio = clamp(rawXRatio + faceMotionConfig.cursorBiasX, -1, 1);
	const yBias = isTouch
		? faceMotionConfig.touchBiasY
		: faceMotionConfig.cursorBiasY;
	const yRatio = clamp(rawYRatio + yBias, -1, 1);
	const baseMoveX = boundsWidth * 0.5;
	const baseMoveY = boundsHeight * 0.5;
	const yResponseScale = is404Page ? 0.65 : 1;
	const desiredMoveX = xRatio * baseMoveX - faceMotionState.centerOffsetX;
	const moveX = clamp(
		desiredMoveX,
		faceMotionState.minMoveX,
		faceMotionState.maxMoveX,
	);
	const moveY = clamp(
		yRatio * baseMoveY * yResponseScale,
		-faceMotionState.maxMoveY,
		faceMotionState.maxMoveY,
	);
	faceMotionState.targetX = moveX;
	faceMotionState.targetY = moveY;
	faceMotionState.targetBlushX = desiredMoveX * faceMotionConfig.blushParallax;
};

const updateBlushAlignment = () => {
	if (!face || !leftEye || !rightEye || !blushLeft || !blushRight) {
		return;
	}

	const faceRect = face.getBoundingClientRect();
	const leftEyeRect = leftEye.getBoundingClientRect();
	const rightEyeRect = rightEye.getBoundingClientRect();

	const leftEyeCenterX = leftEyeRect.left + leftEyeRect.width / 2;
	const rightEyeCenterX = rightEyeRect.left + rightEyeRect.width / 2;
	const horizontalCenter =
		faceRect.left + faceRect.width / 2 + faceMotionConfig.blushCenterOffsetX;
	const halfSpacing = Math.abs(rightEyeCenterX - leftEyeCenterX) / 2;

	const leftBlushX = horizontalCenter - halfSpacing - faceRect.left;
	const rightBlushX = horizontalCenter + halfSpacing - faceRect.left;

	blushLeft.style.left = `${leftBlushX}px`;
	blushRight.style.left = `${rightBlushX}px`;
	blushLeft.style.right = "auto";
	blushRight.style.right = "auto";
	blushLeft.style.transform = `translate(${faceMotionState.currentBlushX - 64}px, 64px)`;
	blushRight.style.transform = `translate(${faceMotionState.currentBlushX + 64}px, 64px)`;
};

const animateFaceMotion = () => {
	if (!face || !leftEye || !rightEye || !mouth) {
		return;
	}

	const dx = faceMotionState.targetX - faceMotionState.currentX;
	const dy = faceMotionState.targetY - faceMotionState.currentY;
	faceMotionState.currentX += dx * faceMotionConfig.faceEase;
	faceMotionState.currentY += dy * faceMotionConfig.faceEase;

	const eyeTargetX = faceMotionState.targetX * faceMotionConfig.eyeParallax;
	const eyeTargetY = faceMotionState.targetY * faceMotionConfig.eyeParallaxY;
	const mouthTargetX = faceMotionState.targetX * faceMotionConfig.mouthParallax;
	const mouthTargetY =
		faceMotionState.targetY * faceMotionConfig.mouthParallaxY;
	faceMotionState.currentEyeX +=
		(eyeTargetX - faceMotionState.currentEyeX) * faceMotionConfig.eyeEase;
	faceMotionState.currentEyeY +=
		(eyeTargetY - faceMotionState.currentEyeY) * faceMotionConfig.eyeEase;
	faceMotionState.currentMouthX +=
		(mouthTargetX - faceMotionState.currentMouthX) * faceMotionConfig.mouthEase;
	faceMotionState.currentMouthY +=
		(mouthTargetY - faceMotionState.currentMouthY) * faceMotionConfig.mouthEase;
	faceMotionState.currentBlushX +=
		(faceMotionState.targetBlushX - faceMotionState.currentBlushX) *
		faceMotionConfig.blushEase;

	face.style.transform = `translate(${faceMotionState.currentX}px, ${faceMotionState.currentY}px)`;
	leftEye.style.transform = `translate(${faceMotionState.currentEyeX}px, ${faceMotionState.currentEyeY}px)`;
	rightEye.style.transform = `translate(${faceMotionState.currentEyeX}px, ${faceMotionState.currentEyeY}px)`;
	mouth.style.transform = `translate(${faceMotionState.currentMouthX}px, ${faceMotionState.currentMouthY}px)`;
	updateBlushAlignment();

	requestAnimationFrame(animateFaceMotion);
};

updateFaceBounds();
requestAnimationFrame(animateFaceMotion);

const motionTarget = is404Page ? document : heroArea || document;
const getClientPoint = (event) => {
	const isTouch =
		event.type.startsWith("touch") || event.pointerType === "touch";
	if (event.touches && event.touches.length) {
		return {
			x: event.touches[0].clientX,
			y: event.touches[0].clientY,
			isTouch,
		};
	}
	return { x: event.clientX, y: event.clientY, isTouch };
};

const handlePointerMove = (event) => {
	const point = getClientPoint(event);
	if (!point) return;
	updateFaceTargets(point.x, point.y, point.isTouch);
};

motionTarget.addEventListener("mousemove", handlePointerMove);
motionTarget.addEventListener("pointermove", handlePointerMove);
motionTarget.addEventListener("touchmove", handlePointerMove, {
	passive: true,
});

motionTarget.addEventListener("mouseleave", () => {
	faceMotionState.targetX = 0;
	faceMotionState.targetY = 0;
	faceMotionState.targetBlushX = 0;
	// Hide blush on mouse leave
	if (blushLeft) blushLeft.classList.remove("visible");
	if (blushRight) blushRight.classList.remove("visible");
});

// Handle blush visibility on pointer down/up
const handlePointerDown = (e) => {
	if (!banner) return;
	const point = getClientPoint(e);
	if (!point) return;

	updateFaceTargets(point.x, point.y, point.isTouch);

	if (!face) return;

	const faceRect = face.getBoundingClientRect();
	const faceCenterX = faceRect.left + faceRect.width / 2;
	const faceCenterY = faceRect.top + faceRect.height / 2;

	// Calculate distance from pointer to face center
	const distX = point.x - faceCenterX;
	const distY = point.y - faceCenterY;
	const distance = Math.sqrt(distX * distX + distY * distY);

	const threshold = Math.max(
		140,
		Math.min(faceRect.width, faceRect.height) * 0.7,
	);
	if (distance < threshold) {
		if (blushLeft) blushLeft.classList.add("visible");
		if (blushRight) blushRight.classList.add("visible");
	}
};

const handlePointerUp = () => {
	if (blushLeft) blushLeft.classList.remove("visible");
	if (blushRight) blushRight.classList.remove("visible");
};

motionTarget.addEventListener("pointerdown", handlePointerDown, {
	passive: false,
});
motionTarget.addEventListener("mousedown", handlePointerDown, {
	passive: false,
});
motionTarget.addEventListener("touchstart", handlePointerDown, {
	passive: false,
});
motionTarget.addEventListener("pointerup", handlePointerUp);
motionTarget.addEventListener("mouseup", handlePointerUp);
motionTarget.addEventListener("touchend", handlePointerUp);
motionTarget.addEventListener("touchcancel", handlePointerUp);
motionTarget.addEventListener("pointerleave", handlePointerUp);

window.addEventListener("resize", () => {
	updateFaceBounds();
});

window.addEventListener("load", () => {
	updateFaceBounds();
});

class SocialSelect {
	constructor(originalSelectElement) {
		this.originalSelect = originalSelectElement;
		this.customSelect = document.createElement("div");
		this.customSelect.classList.add("social__content");
		this.activeBackground = document.createElement("div");
		this.activeBackground.classList.add("social__active-bg");
		this.currentSelectedItem = null;

		this.originalSelect.querySelectorAll("option").forEach((optionElement) => {
			const socialItem = document.createElement("div");
			socialItem.classList.add("social__item");
			socialItem.setAttribute("tabindex", "0");
			socialItem.setAttribute("role", "button");

			const socialName = this.toUpperCaseFirstLetter(optionElement.value);
			const socialImage = document.createElement("img");

			socialImage.src = "../Assets/Images/Socials/" + socialName + ".png";
			socialImage.alt = socialName;

			socialItem.addEventListener("click", () => {
				if (socialItem.classList.contains("social__item--selected")) {
					this._deselect(socialItem);
				} else {
					this._select(socialItem);
				}
			});

			socialItem.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") {
					return;
				}
				event.preventDefault();
				if (socialItem.classList.contains("social__item--selected")) {
					this._deselect(socialItem);
				} else {
					this._select(socialItem);
				}
			});

			socialItem.appendChild(socialImage);
			this.customSelect.appendChild(socialItem);
		});

		this.customSelect.appendChild(this.activeBackground);

		this.originalSelect.insertAdjacentElement("afterend", this.customSelect);
		this.updateSelectedOptions("sync");
		window.addEventListener("resize", () => {
			const selectedOption =
				this.originalSelect.querySelector("option:checked");
			if (!selectedOption) {
				return;
			}
			const selectedIndex = Array.from(
				this.originalSelect.querySelectorAll("option"),
			).indexOf(selectedOption);
			const selectedItem =
				this.customSelect.querySelectorAll(".social__item")[selectedIndex];
			if (selectedItem) {
				this.positionActiveBackground(selectedItem, false);
			}
		});
	}

	_select(itemElement) {
		this.customSelect.querySelectorAll(".social__item").forEach((item) => {
			if (item !== itemElement) {
				this._deselect(item, false);
			}
		});

		const index = Array.from(this.customSelect.children).indexOf(itemElement);
		this.originalSelect.querySelectorAll("option")[index].selected = true;

		this.updateSelectedOptions("select");
	}

	_deselect(itemElement, shouldUpdate = true) {
		const index = Array.from(this.customSelect.children).indexOf(itemElement);
		this.originalSelect.querySelectorAll("option")[index].selected = false;
		if (shouldUpdate) {
			this.updateSelectedOptions("deselect");
		}
	}

	positionActiveBackground(itemElement, animate = true) {
		const containerRect = this.customSelect.getBoundingClientRect();
		const itemRect = itemElement.getBoundingClientRect();
		const x = itemRect.left - containerRect.left;
		const y = itemRect.top - containerRect.top;
		const transformValue = `translate3d(${x}px, ${y}px, 0)`;

		if (!animate) {
			this.activeBackground.style.transition = "none";
		}

		this.activeBackground.style.width = `${itemRect.width}px`;
		this.activeBackground.style.height = `${itemRect.height}px`;
		this.activeBackground.style.transform = transformValue;
		this.activeBackground.style.setProperty(
			"--social-active-transform",
			transformValue,
		);

		if (!animate) {
			void this.activeBackground.offsetHeight;
			this.activeBackground.style.removeProperty("transition");
		}
	}

	hideActiveBackgroundWithAnimation() {
		this.activeBackground.classList.remove("social__active-bg--select-first");
		this.activeBackground.classList.add("social__active-bg--deselect");
		this.activeBackground.addEventListener(
			"animationend",
			() => {
				this.activeBackground.classList.remove(
					"social__active-bg--deselect",
					"social__active-bg--visible",
				);
			},
			{ once: true },
		);
	}

	updateSelectedOptions(action = "sync") {
		const previousSelectedItem = this.currentSelectedItem;
		this.customSelect
			.querySelectorAll(".social__item")
			.forEach((item, index) => {
				const option = this.originalSelect.querySelectorAll("option")[index];
				if (option.selected) {
					item.classList.add("social__item--selected");
				} else {
					item.classList.remove("social__item--selected");
				}
			});

		const details = document.querySelector(".social__details");
		const selectedOption = this.originalSelect.querySelector("option:checked");
		let selectedItem = null;
		if (selectedOption) {
			const selectedIndex = Array.from(
				this.originalSelect.querySelectorAll("option"),
			).indexOf(selectedOption);
			selectedItem =
				this.customSelect.querySelectorAll(".social__item")[selectedIndex];

			details.setAttribute(
				"section",
				this.toUpperCaseFirstLetter(selectedOption.value),
			);
			if (selectedItem) {
				this.positionActiveBackground(selectedItem);
				this.activeBackground.classList.remove("social__active-bg--deselect");
				this.activeBackground.classList.add("social__active-bg--visible");
				if (action === "select" && !previousSelectedItem) {
					this.activeBackground.classList.remove(
						"social__active-bg--select-first",
					);
					void this.activeBackground.offsetHeight;
					this.activeBackground.classList.add(
						"social__active-bg--select-first",
					);
				} else {
					this.activeBackground.classList.remove(
						"social__active-bg--select-first",
					);
				}
			}
		} else {
			details.setAttribute("section", "None");
			if (action === "deselect" && previousSelectedItem) {
				this.hideActiveBackgroundWithAnimation();
			}
		}

		this.currentSelectedItem = selectedItem;

		loadMarkdown();
	}

	toUpperCaseFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
}

document.querySelectorAll(".social-select").forEach((selectElement) => {
	new SocialSelect(selectElement);
});

function updateCardHeight() {
	const card = document.getElementById("socialCard");
	const details = document.querySelector(".social__details");
	const ghost = card ? card.querySelector(".social__ghost") : null;
	if (card && details) {
		const styles = window.getComputedStyle(card);
		const paddingTop = parseFloat(styles.paddingTop) || 0;
		const paddingBottom = parseFloat(styles.paddingBottom) || 0;
		const targetHeight = details.scrollHeight + paddingTop + paddingBottom;
		const previousHeight =
			Number(card.dataset.prevHeight) || card.getBoundingClientRect().height;

		if (ghost) {
			const delta = Math.max(0, previousHeight - targetHeight);
			ghost.style.height = `${delta}px`;
		}

		card.style.height = `${previousHeight}px`;
		void card.offsetHeight;

		if (ghost && previousHeight > targetHeight) {
			ghost.style.height = "0px";
		}

		card.style.height = `${targetHeight}px`;
		card.dataset.prevHeight = String(targetHeight);
	}
}

async function loadMarkdown() {
	try {
		const sectionElements = document.querySelectorAll("[section]");
		if (!sectionElements.length) {
			return;
		}

		// Get page name from body data attribute
		const pageName = document.body.getAttribute("data-page") || "Home";
		const response = await fetch(`../Assets/Text/${pageName}.md`);
		if (!response.ok) {
			throw new Error(`Failed to load markdown: ${response.status}`);
		}
		const markdown = await response.text();

		// Parse sections from markdown based on section comments
		// Looking for <!-- Section: SectionName --> patterns
		const sectionPattern = /<!--\s*Section:\s*([^\r\n]+?)\s*-->/g;
		const matches = [...markdown.matchAll(sectionPattern)];
		const sectionsMap = {};

		matches.forEach((match, index) => {
			const sectionName = match[1];
			const startIndex = match.index + match[0].length;

			// Find the next section comment or end of file
			let endIndex = markdown.length;
			if (index < matches.length - 1) {
				endIndex = matches[index + 1].index;
			}

			const sectionContent = markdown.substring(startIndex, endIndex).trim();
			const sectionHtml = marked.parse(sectionContent);
			sectionsMap[sectionName] = sectionHtml;
		});

		if (matches.length === 0) {
			console.warn("No section markers found in markdown.");
		}

		// Insert content into elements with section attribute
		sectionElements.forEach((element) => {
			const sectionName = element.getAttribute("section");
			if (sectionsMap[sectionName]) {
				element.innerHTML = sectionsMap[sectionName];
			}
		});

		updateAgePlaceholders();

		// Update card height with animation
		updateCardHeight();
	} catch (error) {
		console.error("Error loading markdown:", error);
	}
}

const BIRTH_DATE = new Date(2008, 6, 18);

const calculateYearsSince = (date) => {
	const now = new Date();
	let years = now.getFullYear() - date.getFullYear();
	const hasHadBirthday =
		now.getMonth() > date.getMonth() ||
		(now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
	if (!hasHadBirthday) {
		years -= 1;
	}
	return Math.max(0, years);
};

const updateAgePlaceholders = () => {
	const ageTargets = document.querySelectorAll("#Age");
	if (!ageTargets.length) {
		return;
	}
	const years = calculateYearsSince(BIRTH_DATE);
	ageTargets.forEach((target) => {
		target.textContent = String(years);
	});
};

const JOURNAL_MANIFEST_PATH = "../Assets/Text/Journals/index.json";

const parseJournalMetadata = (markdown) => {
	const lines = markdown.split(/\r?\n/);
	let index = 0;
	while (index < lines.length && lines[index].trim() === "") {
		index += 1;
	}
	let title = "";
	let subtitle = "";
	let date = "";
	if (lines[index] && lines[index].startsWith("# ")) {
		title = lines[index].replace(/^#\s+/, "").trim();
		index += 1;
	}
	while (index < lines.length && lines[index].trim() === "") {
		index += 1;
	}
	if (lines[index] && lines[index].startsWith("## ")) {
		subtitle = lines[index].replace(/^##\s+/, "").trim();
		index += 1;
	}
	while (index < lines.length && lines[index].trim() === "") {
		index += 1;
	}
	// Extract date from italicized line (e.g., _February 14, 2026_)
	if (lines[index] && /^_.*_$/.test(lines[index].trim())) {
		date = lines[index].replace(/^_|_$/g, "").trim();
		index += 1;
	}
	const bodyMarkdown = lines.slice(index).join("\n").trim();
	return { title, subtitle, date, bodyMarkdown };
};

const formatFallbackTitle = (slug) => slug.replace(/[_-]+/g, " ").trim();

const buildJournalEntryElement = ({ slug, title, subtitle, date }) => {
	const entry = document.createElement("a");
	entry.classList.add("journal-entry");
	entry.href = `/SomeProot/journal-viewer/?entry=${encodeURIComponent(slug)}`;

	const titleElement = document.createElement("div");
	titleElement.classList.add("journal-entry__title");
	titleElement.textContent = title || formatFallbackTitle(slug);

	const subtitleElement = document.createElement("div");
	subtitleElement.classList.add("journal-entry__subtitle");
	if (subtitle) {
		subtitleElement.innerHTML = marked.parse(subtitle);
	} else {
		subtitleElement.textContent = "";
	}

	const dateElement = document.createElement("div");
	dateElement.classList.add("journal-entry__date");
	dateElement.textContent = date || "";

	entry.appendChild(titleElement);
	entry.appendChild(subtitleElement);
	if (date) {
		entry.appendChild(dateElement);
	}
	return entry;
};

async function loadJournalEntries() {
	const entriesTarget = document.getElementById("journalEntries");
	if (!entriesTarget) {
		return;
	}

	try {
		const response = await fetch(JOURNAL_MANIFEST_PATH);
		if (!response.ok) {
			throw new Error(`Failed to load journal index: ${response.status}`);
		}
		const manifest = await response.json();
		const entries = Array.isArray(manifest) ? manifest : manifest.entries;
		if (!entries || entries.length === 0) {
			entriesTarget.innerHTML = "<p>No journal entries yet.</p>";
			return;
		}

		entriesTarget.innerHTML = "";
		const entryMetadataList = [];
		for (const entryFile of entries) {
			const entryPath = `../Assets/Text/Journals/${entryFile}`;
			const entryResponse = await fetch(entryPath);
			if (!entryResponse.ok) {
				console.warn(`Missing journal entry: ${entryPath}`);
				continue;
			}
			const markdown = await entryResponse.text();
			const metadata = parseJournalMetadata(markdown);
			const slug = entryFile.replace(/\.md$/i, "");
			entryMetadataList.push({
				slug,
				title: metadata.title,
				subtitle: metadata.subtitle,
				date: metadata.date,
			});
		}

		// Sort entries by date (newest first)
		entryMetadataList.sort((a, b) => {
			const dateA = a.date ? new Date(a.date) : new Date(0);
			const dateB = b.date ? new Date(b.date) : new Date(0);
			return dateB - dateA;
		});

		// Render sorted entries
		for (const metadata of entryMetadataList) {
			const entryElement = buildJournalEntryElement(metadata);
			entriesTarget.appendChild(entryElement);
		}
	} catch (error) {
		console.error("Error loading journal entries:", error);
		entriesTarget.innerHTML = "<p>Unable to load journal entries.</p>";
	}
}

async function loadJournalViewer() {
	const journalBody = document.getElementById("journalBody");
	if (!journalBody) {
		return;
	}

	const params = new URLSearchParams(window.location.search);
	const entrySlug = params.get("entry");
	if (!entrySlug) {
		journalBody.innerHTML = "<p>Select a journal entry to read.</p>";
		return;
	}

	try {
		const entryPath = `../Assets/Text/Journals/${entrySlug}.md`;
		const response = await fetch(entryPath);
		if (!response.ok) {
			throw new Error(`Failed to load journal entry: ${response.status}`);
		}
		const markdown = await response.text();
		const { title, subtitle, date, bodyMarkdown } =
			parseJournalMetadata(markdown);
		const titleElement = document.getElementById("journalTitle");
		const subtitleElement = document.getElementById("journalSubtitle");
		const readerTitle = document.getElementById("readerBarTitle");

		if (titleElement) {
			titleElement.textContent = title || formatFallbackTitle(entrySlug);
		}
		if (readerTitle) {
			readerTitle.textContent = title || formatFallbackTitle(entrySlug);
		}
		if (subtitleElement) {
			let subtitleContent = "";
			if (subtitle) {
				subtitleContent += marked.parse(subtitle);
			}
			if (date) {
				subtitleContent += `<p class="journal-date">${date}</p>`;
			}
			if (subtitleContent) {
				subtitleElement.innerHTML = subtitleContent;
				subtitleElement.removeAttribute("hidden");
			} else {
				subtitleElement.textContent = "";
				subtitleElement.setAttribute("hidden", "true");
			}
		}

		journalBody.innerHTML = marked.parse(bodyMarkdown || markdown);
		generateHeadingIds(journalBody);
		setupReaderBar();
	} catch (error) {
		console.error("Error loading journal entry:", error);
		journalBody.innerHTML = "<p>Unable to load this journal entry.</p>";
	}
}

function generateHeadingIds(container) {
	const headings = container.querySelectorAll("h2, h3, h4, h5, h6");
	headings.forEach((heading) => {
		if (!heading.id) {
			// Convert heading text to a slug format, preserving some special chars
			let slug = heading.textContent.toLowerCase();
			// Keep trailing colon if present, remove it temporarily
			const hasTrailingColon = slug.endsWith(":");
			if (hasTrailingColon) {
				slug = slug.slice(0, -1);
			}
			// Convert to URL-safe format
			slug = slug
				.replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
				.replace(/\s+/g, "-") // Replace spaces with hyphens
				.replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
				.trim();
			// Add back trailing colon if original had one
			if (hasTrailingColon) {
				slug += ":";
			}
			heading.id = slug;
		}
	});
}

function setupReaderBar() {
	const readerBar = document.getElementById("readerBar");
	const header = document.getElementById("journalHeader");
	const backToTopBtn = document.getElementById("backToTopBtn");
	if (!readerBar || !header) {
		return;
	}

	const updateReaderBar = () => {
		const headerBottom = header.getBoundingClientRect().bottom;
		const barHeight = readerBar.getBoundingClientRect().height;
		const isPastHeader = headerBottom - barHeight <= 0;
		readerBar.classList.toggle("reader-bar--solid", isPastHeader);
	};

	const updateBackToTopVisibility = () => {
		if (backToTopBtn) {
			if (window.scrollY > 300) {
				backToTopBtn.classList.add("visible");
			} else {
				backToTopBtn.classList.remove("visible");
			}
		}
	};

	if (backToTopBtn) {
		backToTopBtn.addEventListener("click", () => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	}

	updateReaderBar();
	updateBackToTopVisibility();
	window.addEventListener("scroll", updateReaderBar, { passive: true });
	window.addEventListener("scroll", updateBackToTopVisibility, {
		passive: true,
	});
}
