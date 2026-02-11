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
		const progress = Math.min(window.scrollY / maxScroll, 1);
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

async function loadMarkdown() {
	try {
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
		const sectionElements = document.querySelectorAll("[section]");
		sectionElements.forEach((element) => {
			const sectionName = element.getAttribute("section");
			if (sectionsMap[sectionName]) {
				element.innerHTML = sectionsMap[sectionName];
			}
		});
	} catch (error) {
		console.error("Error loading markdown:", error);
	}
}
