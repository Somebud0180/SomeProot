function getCardLayoutElements() {
	const card = document.getElementById("contentCard");
	if (!card) {
		return { card: null, details: null, ghost: null };
	}
	const details = card.querySelector(".card__details");
	const ghost = card.querySelector(".card__ghost");
	return { card, details, ghost };
}

export function updateCardHeight() {
	const { card, details, ghost } = getCardLayoutElements();
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

export function initLayout() {
	console.log("Website loaded successfully!");

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

	let lastScrollY = 0;
	const headerElement = document.querySelector("header");
	const scrollThreshold = 10;

	const handleNavScroll = () => {
		if (!headerElement) return;

		const currentScrollY = window.scrollY;
		const scrollDelta = currentScrollY - lastScrollY;

		if (scrollDelta > scrollThreshold && currentScrollY > 50) {
			headerElement.classList.add("nav-hidden");
		} else if (scrollDelta < -scrollThreshold) {
			headerElement.classList.remove("nav-hidden");
		} else if (currentScrollY < 50) {
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
}
