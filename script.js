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
	const tallScreenQuery = window.matchMedia("(max-aspect-ratio: 3/4)");
	let scrollScheduled = false;

	const updateTallScreenHeights = () => {
		if (!hero || !banner) {
			return;
		}

		if (!tallScreenQuery.matches) {
			hero.style.removeProperty("height");
			banner.style.removeProperty("height");
			return;
		}

		const minHeroPx = 360;
		const minBannerPx = 320;
		const viewportHeight = window.innerHeight;
		const startHero = Math.max(minHeroPx, viewportHeight);
		const startBanner = Math.max(minBannerPx, viewportHeight * 0.6);
		const shrinkDistance = Math.max(1, viewportHeight * 1.5);
		const progress = Math.min(window.scrollY / shrinkDistance, 1);
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
			updateTallScreenHeights();
		});
	};

	window.addEventListener("scroll", scheduleUpdate, { passive: true });
	window.addEventListener("resize", scheduleUpdate);
	tallScreenQuery.addEventListener("change", scheduleUpdate);
	updateTallScreenHeights();
	loadMarkdown();
});

// Select face elements for lagging motion
const leftEye = document.getElementById("left-eye-container");
const rightEye = document.getElementById("right-eye-container");
const mouth = document.querySelector(".mouth");
let baseEyeMouthGap = null;
const faceMotionConfig = {
	minGap: 18,
	maxGapIncrease: 120,
	maxMoveX: 160,
	maxMoveXTall: 110,
	maxMoveY: 360,
	maxMoveYTall: 360,
	mouthSpeed: 0.4,
	leftEyeSlow: 0.5,
	rightEyeSlow: 0.5,
	maxEyeMoveXScale: 0.85,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateBaseEyeMouthGap = () => {
	if (!leftEye || !rightEye || !mouth) {
		baseEyeMouthGap = null;
		return;
	}

	const leftRect = leftEye.getBoundingClientRect();
	const rightRect = rightEye.getBoundingClientRect();
	const mouthRect = mouth.getBoundingClientRect();
	const eyeBottom = Math.max(leftRect.bottom, rightRect.bottom);
	baseEyeMouthGap = mouthRect.top - eyeBottom;
};

window.addEventListener("resize", updateBaseEyeMouthGap);
document.addEventListener("DOMContentLoaded", updateBaseEyeMouthGap);

document.addEventListener("mousemove", (e) => {
	// Normalize mouse position (x, y) for the viewport
	const { clientX, clientY } = e;
	const { innerWidth, innerHeight } = window;

	const xRatio = (clientX / innerWidth - 0.5) * 2; // x movement (-1 to 1)
	const yRatio = (clientY / innerHeight - 0.5) * 2; // y movement (-1 to 1)

	// Base movement amount
	const baseMoveX = innerWidth * 0.5;
	const baseMoveY = innerHeight * 0.5;
	const aspectRatio = innerWidth / innerHeight;
	const maxMoveX =
		aspectRatio < 0.8
			? faceMotionConfig.maxMoveXTall
			: faceMotionConfig.maxMoveX;
	const maxMoveY =
		aspectRatio < 0.8
			? faceMotionConfig.maxMoveYTall
			: faceMotionConfig.maxMoveY;
	let moveX = xRatio * baseMoveX;
	let moveY = yRatio * baseMoveY;
	moveX = clamp(moveX, -maxMoveX, maxMoveX);
	moveY = clamp(moveY, -maxMoveY, maxMoveY);

	// Calculate speed multipliers based on mouse position
	// The eye opposite to the mouse direction moves slower horizontally
	const leftEyeSpeed = xRatio > 0 ? faceMotionConfig.leftEyeSlow : 1; // Slower when mouse is right
	const rightEyeSpeed = xRatio < 0 ? faceMotionConfig.rightEyeSlow : 1; // Slower when mouse is left
	const mouthSpeed = faceMotionConfig.mouthSpeed; // Always slower

	if (baseEyeMouthGap !== null) {
		const minGap = faceMotionConfig.minGap;
		const maxGap = baseEyeMouthGap + faceMotionConfig.maxGapIncrease;
		const gapSlope = mouthSpeed - 1;
		if (gapSlope !== 0) {
			const maxMoveY = (minGap - baseEyeMouthGap) / gapSlope;
			const minMoveY = (maxGap - baseEyeMouthGap) / gapSlope;
			moveY = clamp(moveY, minMoveY, maxMoveY);
		}
	}

	// Apply transforms with different speeds (only X varies, Y stays same for alignment)
	const maxEyeMoveX = maxMoveX * faceMotionConfig.maxEyeMoveXScale;
	const leftEyeMoveX = clamp(moveX * leftEyeSpeed, -maxEyeMoveX, maxEyeMoveX);
	const rightEyeMoveX = clamp(moveX * rightEyeSpeed, -maxEyeMoveX, maxEyeMoveX);
	leftEye.style.transform = `translate(${leftEyeMoveX}px, ${moveY}px)`;
	rightEye.style.transform = `translate(${rightEyeMoveX}px, ${moveY}px)`;
	mouth.style.transform = `translate(${moveX * mouthSpeed}px, ${moveY * mouthSpeed}px)`;
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
