const JOURNAL_MANIFEST_PATH = "/SomeProot/Assets/Text/Journals/index.json";

const getMarked = () => globalThis.marked;

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
	const markedLib = getMarked();
	if (subtitle && markedLib?.parse) {
		subtitleElement.innerHTML = markedLib.parse(subtitle);
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
			const entryPath = `/SomeProot/Assets/Text/Journals/${entryFile}`;
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

		entryMetadataList.sort((a, b) => {
			const dateA = a.date ? new Date(a.date) : new Date(0);
			const dateB = b.date ? new Date(b.date) : new Date(0);
			return dateB - dateA;
		});

		for (const metadata of entryMetadataList) {
			const entryElement = buildJournalEntryElement(metadata);
			entriesTarget.appendChild(entryElement);
		}
	} catch (error) {
		console.error("Error loading journal entries:", error);
		entriesTarget.innerHTML = "<p>Unable to load journal entries.</p>";
	}
}

function generateHeadingIds(container) {
	const headings = container.querySelectorAll("h2, h3, h4, h5, h6");
	headings.forEach((heading) => {
		if (!heading.id) {
			let slug = heading.textContent.toLowerCase();
			const hasTrailingColon = slug.endsWith(":");
			if (hasTrailingColon) {
				slug = slug.slice(0, -1);
			}
			slug = slug
				.replace(/[^\w\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.trim();
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
		const entryPath = `/SomeProot/Assets/Text/Journals/${entrySlug}.md`;
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
		const markedLib = getMarked();
		if (!markedLib?.parse) {
			throw new Error("Markdown parser is unavailable.");
		}

		if (titleElement) {
			titleElement.textContent = title || formatFallbackTitle(entrySlug);
		}
		if (readerTitle) {
			readerTitle.textContent = title || formatFallbackTitle(entrySlug);
		}
		if (subtitleElement) {
			let subtitleContent = "";
			if (subtitle) {
				subtitleContent += markedLib.parse(subtitle);
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

		journalBody.innerHTML = markedLib.parse(bodyMarkdown || markdown);
		generateHeadingIds(journalBody);
		setupReaderBar();
	} catch (error) {
		console.error("Error loading journal entry:", error);
		journalBody.innerHTML = "<p>Unable to load this journal entry.</p>";
	}
}

export function initJournal() {
	loadJournalEntries();
	loadJournalViewer();
}
