const BIRTH_DATE = new Date(2008, 6, 18);
let onMarkdownRendered = null;

const getMarked = () => globalThis.marked;

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

export async function loadMarkdown() {
	try {
		const sectionElements = document.querySelectorAll("[section]");
		if (!sectionElements.length) {
			return;
		}

		const pageName = document.body.getAttribute("data-page") || "Home";
		const response = await fetch(`/SomeProot/Assets/Text/${pageName}.md`);
		if (!response.ok) {
			throw new Error(`Failed to load markdown: ${response.status}`);
		}
		const markdown = await response.text();

		const sectionPattern = /<!--\s*Section:\s*([^\r\n]+?)\s*-->/g;
		const matches = [...markdown.matchAll(sectionPattern)];
		const sectionsMap = {};
		const markedLib = getMarked();
		if (!markedLib?.parse) {
			throw new Error("Markdown parser is unavailable.");
		}

		matches.forEach((match, index) => {
			const sectionName = match[1];
			const startIndex = match.index + match[0].length;

			let endIndex = markdown.length;
			if (index < matches.length - 1) {
				endIndex = matches[index + 1].index;
			}

			const sectionContent = markdown.substring(startIndex, endIndex).trim();
			const sectionHtml = markedLib.parse(sectionContent);
			sectionsMap[sectionName] = sectionHtml;
		});

		if (matches.length === 0) {
			console.warn("No section markers found in markdown.");
		}

		sectionElements.forEach((element) => {
			const sectionName = element.getAttribute("section");
			if (sectionsMap[sectionName]) {
				element.innerHTML = sectionsMap[sectionName];
			}
		});

		updateAgePlaceholders();
		onMarkdownRendered?.();
	} catch (error) {
		console.error("Error loading markdown:", error);
	}
}

export function initContent({ onAfterRender } = {}) {
	onMarkdownRendered = onAfterRender || null;
	loadMarkdown();
}
