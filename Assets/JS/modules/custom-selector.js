export class CustomSelector {
	constructor(originalSelectElement, options = {}) {
		this.originalSelect = originalSelectElement;
		this.allowDeselect = this.originalSelect.multiple;
		this.detailsSelector =
			this.originalSelect.dataset.detailsSelector || ".card__details";
		this.iconBasePath = this.originalSelect.dataset.iconBasePath || "";
		this.itemClassName = "picker__item";
		this.itemSelectedClassName = "picker__item--selected";
		this.activeBackgroundClassName = "picker__active-bg";
		this.activeBackgroundVisibleClassName = "picker__active-bg--visible";
		this.activeBackgroundSelectClassName = "picker__active-bg--select-first";
		this.activeBackgroundDeselectClassName = "picker__active-bg--deselect";
		this.onSelectionChanged = options.onSelectionChanged || (() => {});
		this.customSelect = document.createElement("div");
		this.customSelect.classList.add("picker__content");
		this.activeBackground = document.createElement("div");
		this.activeBackground.classList.add(this.activeBackgroundClassName);
		this.currentSelectedItem = null;

		this.originalSelect.querySelectorAll("option").forEach((optionElement) => {
			const item = document.createElement("div");
			item.classList.add(this.itemClassName);
			item.setAttribute("tabindex", "0");
			item.setAttribute("role", "button");

			const optionLabel =
				optionElement.textContent?.trim() || optionElement.value;
			const optionKey = this.toUpperCaseFirstLetter(optionElement.value);
			const normalizedBasePath = this.iconBasePath.replace(/\/$/, "");
			const iconSrc =
				optionElement.dataset.icon ||
				(normalizedBasePath ? `${normalizedBasePath}/${optionKey}.png` : "");

			if (iconSrc) {
				const icon = document.createElement("img");
				icon.src = iconSrc;
				icon.alt = optionLabel;
				item.appendChild(icon);
			} else {
				item.textContent = optionLabel;
			}

			item.addEventListener("click", () => {
				if (
					this.allowDeselect &&
					item.classList.contains(this.itemSelectedClassName)
				) {
					this._deselect(item);
				} else {
					this._select(item);
				}
			});

			item.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") {
					return;
				}
				event.preventDefault();
				if (
					this.allowDeselect &&
					item.classList.contains(this.itemSelectedClassName)
				) {
					this._deselect(item);
				} else {
					this._select(item);
				}
			});

			this.customSelect.appendChild(item);
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
			const selectedItem = this.customSelect.querySelectorAll(
				`.${this.itemClassName}`,
			)[selectedIndex];
			if (selectedItem) {
				this.positionActiveBackground(selectedItem, false);
			}
		});
	}

	_select(itemElement) {
		this.customSelect
			.querySelectorAll(`.${this.itemClassName}`)
			.forEach((item) => {
				if (item !== itemElement) {
					this._deselect(item, false);
				}
			});

		const index = Array.from(
			this.customSelect.querySelectorAll(`.${this.itemClassName}`),
		).indexOf(itemElement);
		this.originalSelect.querySelectorAll("option")[index].selected = true;

		this.updateSelectedOptions("select");
		this.originalSelect.dispatchEvent(new Event("change", { bubbles: true }));
	}

	_deselect(itemElement, shouldUpdate = true) {
		const index = Array.from(
			this.customSelect.querySelectorAll(`.${this.itemClassName}`),
		).indexOf(itemElement);
		this.originalSelect.querySelectorAll("option")[index].selected = false;
		if (shouldUpdate) {
			this.updateSelectedOptions("deselect");
			this.originalSelect.dispatchEvent(new Event("change", { bubbles: true }));
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
			"--picker-active-transform",
			transformValue,
		);

		if (!animate) {
			void this.activeBackground.offsetHeight;
			this.activeBackground.style.removeProperty("transition");
		}
	}

	hideActiveBackgroundWithAnimation() {
		this.activeBackground.classList.remove(
			this.activeBackgroundSelectClassName,
		);
		this.activeBackground.classList.add(this.activeBackgroundDeselectClassName);
		this.activeBackground.addEventListener(
			"animationend",
			() => {
				this.activeBackground.classList.remove(
					this.activeBackgroundDeselectClassName,
					this.activeBackgroundVisibleClassName,
				);
			},
			{ once: true },
		);
	}

	updateSelectedOptions(action = "sync") {
		const previousSelectedItem = this.currentSelectedItem;
		this.customSelect
			.querySelectorAll(`.${this.itemClassName}`)
			.forEach((item, index) => {
				const option = this.originalSelect.querySelectorAll("option")[index];
				if (option.selected) {
					item.classList.add(this.itemSelectedClassName);
				} else {
					item.classList.remove(this.itemSelectedClassName);
				}
				item.setAttribute("aria-pressed", String(option.selected));
			});

		const details = document.querySelector(this.detailsSelector);
		const selectedOption = this.originalSelect.querySelector("option:checked");
		let selectedItem = null;
		if (selectedOption) {
			const selectedIndex = Array.from(
				this.originalSelect.querySelectorAll("option"),
			).indexOf(selectedOption);
			selectedItem = this.customSelect.querySelectorAll(
				`.${this.itemClassName}`,
			)[selectedIndex];

			const sectionValue =
				selectedOption.dataset.section ||
				this.toUpperCaseFirstLetter(selectedOption.value);
			if (details) {
				details.setAttribute("section", sectionValue);
			}
			if (selectedItem) {
				this.positionActiveBackground(selectedItem);
				this.activeBackground.classList.remove(
					this.activeBackgroundDeselectClassName,
				);
				this.activeBackground.classList.add(
					this.activeBackgroundVisibleClassName,
				);
				if (action === "select" && !previousSelectedItem) {
					this.activeBackground.classList.remove(
						this.activeBackgroundSelectClassName,
					);
					void this.activeBackground.offsetHeight;
					this.activeBackground.classList.add(
						this.activeBackgroundSelectClassName,
					);
				} else {
					this.activeBackground.classList.remove(
						this.activeBackgroundSelectClassName,
					);
				}
			}
		} else {
			if (details) {
				details.setAttribute("section", "None");
			}
			if (action === "deselect" && previousSelectedItem) {
				this.hideActiveBackgroundWithAnimation();
			}
		}

		this.currentSelectedItem = selectedItem;
		this.onSelectionChanged();
	}

	toUpperCaseFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
}

export function initCustomSelectors({ onSelectionChanged } = {}) {
	document
		.querySelectorAll(".custom-selector, .picker-select")
		.forEach((selectElement) => {
			new CustomSelector(selectElement, { onSelectionChanged });
		});
}
