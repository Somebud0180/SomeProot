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

	const hero = document.querySelector(".hero");
	const banner = document.querySelector(".banner");
	const header = document.querySelector("header");
	const tallScreenQuery = window.matchMedia("(max-aspect-ratio: 3/4)");
	let scrollScheduled = false;
	let headerHeight = 0;

	const updateHeaderHeight = () => {
		if (!header) {
			document.body.style.removeProperty("--header-height");
			headerHeight = 0;
			return;
		}

		const rect = header.getBoundingClientRect();
		headerHeight = Math.max(0, Math.round(rect.height || 0));
		document.body.style.setProperty("--header-height", `${headerHeight}px`);
	};

	const getViewportHeight = () => {
		if (window.visualViewport && window.visualViewport.height) {
			return window.visualViewport.height;
		}
		return window.innerHeight;
	};

	const updateTallScreenHeights = () => {
		if (!hero || !banner) {
			return;
		}

		if (!tallScreenQuery.matches) {
			hero.style.removeProperty("height");
			banner.style.removeProperty("height");
			banner.style.removeProperty("min-height");
			return;
		}

		const minHeroPx = 360;
		const minBannerPx = 320;
		const viewportHeight = getViewportHeight();
		const availableHeight = Math.max(0, viewportHeight - headerHeight);
		const startHero = Math.max(minHeroPx, availableHeight);
		const startBanner = Math.max(minBannerPx, availableHeight * 0.6);
		const maxScroll = Math.max(
			1,
			document.documentElement.scrollHeight - getViewportHeight(),
		);
		const shrinkFactor = 0.5;
		const progress = Math.min(window.scrollY / (maxScroll * shrinkFactor), 1);
		const heroHeight = Math.round(
			startHero - (startHero - minHeroPx) * progress,
		);
		const bannerHeight = Math.round(
			startBanner - (startBanner - minBannerPx) * progress,
		);

		hero.style.height = `${heroHeight}px`;
		banner.style.minHeight = `${bannerHeight}px`;
	};

	const scheduleUpdate = () => {
		if (scrollScheduled) {
			return;
		}
		scrollScheduled = true;
		requestAnimationFrame(() => {
			scrollScheduled = false;
			updateHeaderHeight();
			updateTallScreenHeights();
		});
	};

	window.addEventListener("scroll", scheduleUpdate, { passive: true });
	window.addEventListener("resize", scheduleUpdate);
	if (typeof tallScreenQuery.addEventListener === "function") {
		tallScreenQuery.addEventListener("change", scheduleUpdate);
	} else if (typeof tallScreenQuery.addListener === "function") {
		tallScreenQuery.addListener(scheduleUpdate);
	}
	if (window.visualViewport) {
		window.visualViewport.addEventListener("resize", scheduleUpdate);
		window.visualViewport.addEventListener("scroll", scheduleUpdate);
	}
	updateHeaderHeight();
	updateTallScreenHeights();
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
const banner = document.querySelector(".banner");
const heroArea = document.querySelector(".hero");

const faceMotionConfig = {
	maxMoveX: 160, // Max horizontal movement in pixels
	maxMoveXTall: 110, // Max horizontal movement for tall screens
	maxMoveY: 320, // Max vertical movement in pixels
	maxMoveYTall: 320, // Max vertical movement for tall screens
	faceEase: 0.045, // Easing factor for face movement (higher = snappier)
	eyeEase: 0.07, // Easing factor for eye movement (higher = snappier)
	mouthEase: 0.01, // Easing factor for mouth movement (higher = snappier)
	eyeParallax: 0.25, // Parallax factor for eye movement (higher = more movement)
	eyeParallaxY: 0.12, // Separate parallax factor for vertical eye movement
	mouthParallax: 0.25, // Parallax factor for mouth movement (higher = more movement)
	mouthParallaxY: 0.14, // Separate parallax factor for vertical mouth movement
	cursorBiasX: 0, // Horizontal bias to offset cursor influence
	cursorBiasY: -0.15, // Vertical bias to offset cursor influence
};

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
	maxMoveX: faceMotionConfig.maxMoveX,
	maxMoveY: faceMotionConfig.maxMoveY,
};

const updateFaceBounds = () => {
	const { innerWidth, innerHeight } = window;
	const aspectRatio = innerWidth / innerHeight;
	faceMotionState.maxMoveX =
		aspectRatio < 0.8
			? faceMotionConfig.maxMoveXTall
			: faceMotionConfig.maxMoveX;
	const aspectMaxMoveY =
		aspectRatio < 0.8
			? faceMotionConfig.maxMoveYTall
			: faceMotionConfig.maxMoveY;
	let containerMaxMoveY = aspectMaxMoveY;
	if (banner && face) {
		const bannerHeight =
			banner.clientHeight || banner.getBoundingClientRect().height;
		const faceHeight = face.offsetHeight || face.getBoundingClientRect().height;
		const margin = 12;
		const available = (bannerHeight - faceHeight) / 2 - margin;
		containerMaxMoveY = Math.max(0, available);
	}
	faceMotionState.maxMoveY = Math.min(aspectMaxMoveY, containerMaxMoveY);
};

const updateFaceTargets = (clientX, clientY) => {
	let boundsWidth = window.innerWidth;
	let boundsHeight = window.innerHeight;
	let originX = 0;
	let originY = 0;
	if (heroArea) {
		const rect = heroArea.getBoundingClientRect();
		boundsWidth = rect.width || boundsWidth;
		boundsHeight = rect.height || boundsHeight;
		originX = rect.left;
		originY = rect.top;
	}
	const rawXRatio = ((clientX - originX) / boundsWidth - 0.5) * 2;
	const rawYRatio = ((clientY - originY) / boundsHeight - 0.5) * 2;
	const xRatio = clamp(rawXRatio + faceMotionConfig.cursorBiasX, -1, 1);
	const yRatio = clamp(rawYRatio + faceMotionConfig.cursorBiasY, -1, 1);
	const baseMoveX = boundsWidth * 0.5;
	const baseMoveY = boundsHeight * 0.5;
	const moveX = clamp(
		xRatio * baseMoveX,
		-faceMotionState.maxMoveX,
		faceMotionState.maxMoveX,
	);
	const moveY = clamp(
		yRatio * baseMoveY,
		-faceMotionState.maxMoveY,
		faceMotionState.maxMoveY,
	);
	faceMotionState.targetX = moveX;
	faceMotionState.targetY = moveY;
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

	face.style.transform = `translate(${faceMotionState.currentX}px, ${faceMotionState.currentY}px)`;
	leftEye.style.transform = `translate(${faceMotionState.currentEyeX}px, ${faceMotionState.currentEyeY}px)`;
	rightEye.style.transform = `translate(${faceMotionState.currentEyeX}px, ${faceMotionState.currentEyeY}px)`;
	mouth.style.transform = `translate(${faceMotionState.currentMouthX}px, ${faceMotionState.currentMouthY}px)`;

	requestAnimationFrame(animateFaceMotion);
};

updateFaceBounds();
requestAnimationFrame(animateFaceMotion);

const motionTarget = heroArea || document;
motionTarget.addEventListener("mousemove", (e) => {
	updateFaceTargets(e.clientX, e.clientY);
});

motionTarget.addEventListener("mouseleave", () => {
	faceMotionState.targetX = 0;
	faceMotionState.targetY = 0;
});

window.addEventListener("resize", () => {
	updateFaceBounds();
	updateHeaderHeight();
	updateTallScreenHeights();
});

window.addEventListener("load", () => {
	updateFaceBounds();
	updateHeaderHeight();
	updateTallScreenHeights();
});

class SocialSelect {
	constructor(originalSelectElement) {
		this.originalSelect = originalSelectElement;
		this.customSelect = document.createElement("div");
		this.customSelect.classList.add("social__content");

		this.originalSelect
			.querySelectorAll("option")
			.forEach((optionElement, index) => {
				const socialItem = document.createElement("div");
				socialItem.classList.add("social__item");

				const socialName = this.toUpperCaseFirstLetter(optionElement.value);
				const socialImage = document.createElement("img");
				const line = document.createElement("div");

				socialImage.src = "/Assets/Texture/Socials/" + socialName + ".png";
				socialImage.alt = socialName;

				line.classList.add("social__line");

				socialImage.addEventListener("click", () => {
					if (line.classList.contains("social__line--selected")) {
						this._deselect(socialItem);
					} else {
						this._select(socialItem);
					}
				});

				socialItem.appendChild(socialImage);
				socialItem.appendChild(line);
				this.customSelect.appendChild(socialItem);
			});

		this.originalSelect.insertAdjacentElement("afterend", this.customSelect);
	}

	_select(itemElement) {
		this.customSelect.querySelectorAll(".social__item").forEach((item) => {
			if (item !== itemElement) {
				this._deselect(item);
			}
		});

		const index = Array.from(this.customSelect.children).indexOf(itemElement);
		this.originalSelect.querySelectorAll("option")[index].selected = true;

		this.updateSelectedOptions();
	}

	_deselect(itemElement) {
		const index = Array.from(this.customSelect.children).indexOf(itemElement);
		this.originalSelect.querySelectorAll("option")[index].selected = false;
		this.updateSelectedOptions();
	}

	updateSelectedOptions() {
		this.customSelect
			.querySelectorAll(".social__item")
			.forEach((item, index) => {
				const option = this.originalSelect.querySelectorAll("option")[index];
				const line = item.querySelector(".social__line");
				if (option.selected) {
					line.classList.add("social__line--selected");
				} else {
					line.classList.remove("social__line--selected");
				}
			});

		const details = document.querySelector(".social__details");
		const selectedOption = this.originalSelect.querySelector("option:checked");
		if (selectedOption) {
			details.setAttribute(
				"section",
				this.toUpperCaseFirstLetter(selectedOption.value),
			);
		} else {
			details.setAttribute("section", "None");
		}

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
	if (card && details) {
		// Set current height as the starting point
		card.style.maxHeight = card.scrollHeight + "px";
		// Force a reflow to establish the "from" state
		void card.offsetHeight;
		// Now set the target height
		card.style.maxHeight = details.scrollHeight + "px";
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
		const response = await fetch(`Assets/Text/${pageName}.md`);
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

		// Update card height with animation
		updateCardHeight();
	} catch (error) {
		console.error("Error loading markdown:", error);
	}
}

const JOURNAL_MANIFEST_PATH = "Assets/Text/Journals/index.json";

const parseJournalMetadata = (markdown) => {
	const lines = markdown.split(/\r?\n/);
	let index = 0;
	while (index < lines.length && lines[index].trim() === "") {
		index += 1;
	}
	let title = "";
	let subtitle = "";
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
	const bodyMarkdown = lines.slice(index).join("\n").trim();
	return { title, subtitle, bodyMarkdown };
};

const formatFallbackTitle = (slug) => slug.replace(/[_-]+/g, " ").trim();

const buildJournalEntryElement = ({ slug, title, subtitle }) => {
	const entry = document.createElement("a");
	entry.classList.add("journal-entry");
	entry.href = `journal_viewer.html?entry=${encodeURIComponent(slug)}`;

	const titleElement = document.createElement("div");
	titleElement.classList.add("journal-entry__title");
	titleElement.textContent = title || formatFallbackTitle(slug);

	const subtitleElement = document.createElement("div");
	subtitleElement.classList.add("journal-entry__subtitle");
	subtitleElement.textContent = subtitle || "";

	entry.appendChild(titleElement);
	entry.appendChild(subtitleElement);
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
		for (const entryFile of entries) {
			const entryPath = `Assets/Text/Journals/${entryFile}`;
			const entryResponse = await fetch(entryPath);
			if (!entryResponse.ok) {
				console.warn(`Missing journal entry: ${entryPath}`);
				continue;
			}
			const markdown = await entryResponse.text();
			const metadata = parseJournalMetadata(markdown);
			const slug = entryFile.replace(/\.md$/i, "");
			const entryElement = buildJournalEntryElement({
				slug,
				title: metadata.title,
				subtitle: metadata.subtitle,
			});
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
		const entryPath = `Assets/Text/Journals/${entrySlug}.md`;
		const response = await fetch(entryPath);
		if (!response.ok) {
			throw new Error(`Failed to load journal entry: ${response.status}`);
		}
		const markdown = await response.text();
		const { title, subtitle, bodyMarkdown } = parseJournalMetadata(markdown);
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
			if (subtitle) {
				subtitleElement.textContent = subtitle;
				subtitleElement.removeAttribute("hidden");
			} else {
				subtitleElement.textContent = "";
				subtitleElement.setAttribute("hidden", "true");
			}
		}

		journalBody.innerHTML = marked.parse(bodyMarkdown || markdown);
		setupReaderBar();
	} catch (error) {
		console.error("Error loading journal entry:", error);
		journalBody.innerHTML = "<p>Unable to load this journal entry.</p>";
	}
}

function setupReaderBar() {
	const readerBar = document.getElementById("readerBar");
	const header = document.getElementById("journalHeader");
	if (!readerBar || !header) {
		return;
	}

	const updateReaderBar = () => {
		const headerBottom = header.getBoundingClientRect().bottom;
		const barHeight = readerBar.getBoundingClientRect().height;
		const isPastHeader = headerBottom - barHeight <= 0;
		readerBar.classList.toggle("reader-bar--solid", isPastHeader);
	};

	updateReaderBar();
	window.addEventListener("scroll", updateReaderBar, { passive: true });
}
