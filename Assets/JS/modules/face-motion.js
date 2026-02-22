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
	containerPadding: 12,
	faceEase: 0.045,
	eyeEase: 0.07,
	mouthEase: 0.01,
	eyeParallax: 0.25,
	eyeParallaxY: 0.12,
	mouthParallax: 0.25,
	mouthParallaxY: 0.14,
	blushParallax: 0.18,
	blushEase: 0.06,
	blushCenterOffsetX: 0,
	cursorBiasX: 0,
	cursorBiasY: 0.05,
	touchBiasY: 0.2,
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

const handlePointerDown = (event) => {
	if (!banner) return;
	const point = getClientPoint(event);
	if (!point) return;

	updateFaceTargets(point.x, point.y, point.isTouch);

	if (!face) return;

	const faceRect = face.getBoundingClientRect();
	const faceCenterX = faceRect.left + faceRect.width / 2;
	const faceCenterY = faceRect.top + faceRect.height / 2;

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

export function initFaceMotion() {
	if (!face || !leftEye || !rightEye || !mouth) {
		return;
	}

	updateFaceBounds();
	requestAnimationFrame(animateFaceMotion);

	const motionTarget = is404Page ? document : heroArea || document;
	motionTarget.addEventListener("mousemove", handlePointerMove);
	motionTarget.addEventListener("pointermove", handlePointerMove);
	motionTarget.addEventListener("touchmove", handlePointerMove, {
		passive: true,
	});

	motionTarget.addEventListener("mouseleave", () => {
		faceMotionState.targetX = 0;
		faceMotionState.targetY = 0;
		faceMotionState.targetBlushX = 0;
		if (blushLeft) blushLeft.classList.remove("visible");
		if (blushRight) blushRight.classList.remove("visible");
	});

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

	window.addEventListener("resize", updateFaceBounds);
	window.addEventListener("load", updateFaceBounds);
}
