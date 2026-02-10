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
		const heroHeight = Math.round(startHero - (startHero - minHeroPx) * progress);
		const bannerHeight = Math.round(startBanner - (startBanner - minBannerPx) * progress);

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
});

// Select face elements for lagging motion
const leftEye = document.getElementById("left-eye-container");
const rightEye = document.getElementById("right-eye-container");
const mouth = document.querySelector(".mouth");

document.addEventListener("mousemove", (e) => {
	// Normalize mouse position (x, y) for the viewport
	const { clientX, clientY } = e;
	const { innerWidth, innerHeight } = window;

	const xRatio = (clientX / innerWidth - 0.5) * 2; // x movement (-1 to 1)
	const yRatio = (clientY / innerHeight - 0.5) * 2; // y movement (-1 to 1)

	// Base movement amount
	const baseMove = 20; // pixels
	const moveX = xRatio * baseMove;
	const moveY = yRatio * baseMove;

	// Calculate speed multipliers based on mouse position
	// The eye opposite to the mouse direction moves slower horizontally
	const leftEyeSpeed = xRatio > 0 ? 0.6 : 1; // Slower when mouse is right
	const rightEyeSpeed = xRatio < 0 ? 0.6 : 1; // Slower when mouse is left
	const mouthSpeed = 0.5; // Always slower

	// Apply transforms with different speeds (only X varies, Y stays same for alignment)
	leftEye.style.transform = `translate(${moveX * leftEyeSpeed}px, ${moveY}px)`;
	rightEye.style.transform = `translate(${moveX * rightEyeSpeed}px, ${moveY}px)`;
	mouth.style.transform = `translate(${moveX * mouthSpeed}px, ${moveY * mouthSpeed}px)`;
});
