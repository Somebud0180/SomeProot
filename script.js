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
	cursorBiasY: 0.05, // Vertical bias to offset cursor influence
	touchBiasY: 0.2, // Vertical bias for touch input
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
	isTall: false,
};

const updateFaceBounds = () => {
	const { innerWidth, innerHeight } = window;
	const aspectRatio = innerWidth / innerHeight;
	faceMotionState.isTall = aspectRatio < 0.8;
	faceMotionState.maxMoveX = faceMotionState.isTall
		? faceMotionConfig.maxMoveXTall
		: faceMotionConfig.maxMoveX;
	const aspectMaxMoveY = faceMotionState.isTall
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

const updateFaceTargets = (clientX, clientY, isTouch = false) => {
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
	const yBias = isTouch
		? faceMotionConfig.touchBiasY
		: faceMotionConfig.cursorBiasY;
	const yRatio = clamp(rawYRatio + yBias, -1, 1);
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
	// Hide blush on mouse leave
	if (blushLeft) blushLeft.classList.remove("visible");
	if (blushRight) blushRight.classList.remove("visible");
});

// Handle blush visibility on pointer down/up
const handlePointerDown = (e) => {
	if (!banner) return;
	const point = getClientPoint(e);
	if (point) {
		updateFaceTargets(point.x, point.y, point.isTouch);
	}

	const bannerRect = banner.getBoundingClientRect();
	const bannerCenterX = bannerRect.left + bannerRect.width / 2;
	const bannerCenterY = bannerRect.top + bannerRect.height / 2;

	// Calculate distance from pointer to banner center
	const distX = e.clientX - bannerCenterX;
	const distY = e.clientY - bannerCenterY;
	const distance = Math.sqrt(distX * distX + distY * distY);

	// Show blush if pointer is within 200px of center (face center)
	const threshold = 200;
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

		this.originalSelect
			.querySelectorAll("option")
			.forEach((optionElement, index) => {
				const socialItem = document.createElement("div");
				socialItem.classList.add("social__item");

				const socialName = this.toUpperCaseFirstLetter(optionElement.value);
				const socialImage = document.createElement("img");
				const line = document.createElement("div");

				socialImage.src = "Assets/Texture/Socials/" + socialName + ".png";
			socialImage.alt = socialName;

			line.classList.add("social__line");

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

const JOURNAL_MANIFEST_PATH = "Assets/Text/Journals/index.json";

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
	entry.href = `journal_viewer.html?entry=${encodeURIComponent(slug)}`;

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
			const entryPath = `Assets/Text/Journals/${entryFile}`;
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
		const entryPath = `Assets/Text/Journals/${entrySlug}.md`;
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
