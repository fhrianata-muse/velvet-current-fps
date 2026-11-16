// Keyboard and mouse input, plus the pointer-lock lifecycle. The simulation reads a
export function createInput(canvas, onLockChange) {
	const state = {
		keys: new Set(),
		firing: false,
		lookDX: 0,
		lookDY: 0,
		locked: false,
		interactHeld: false,
		pressed: new Set(),
	};

	canvas.addEventListener('click', () => {
		if (!state.locked) canvas.requestPointerLock();
	});
	document.addEventListener('pointerlockchange', () => {
		state.locked = document.pointerLockElement === canvas;
		if (onLockChange) onLockChange(state.locked);
	});
	document.addEventListener('mousemove', (event) => {
		if (!state.locked) return;
		state.lookDX += event.movementX || 0;
		state.lookDY += event.movementY || 0;
	});
	document.addEventListener('mousedown', (event) => {
		if (state.locked && event.button === 0) state.firing = true;
	});
	document.addEventListener('mouseup', (event) => {
		if (event.button === 0) state.firing = false;
	});
	window.addEventListener('keydown', (event) => {
		if (event.repeat) return;
		state.keys.add(event.code);
		state.pressed.add(event.code);
		if (event.code === 'KeyE') state.interactHeld = true;
		if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) event.preventDefault();
	});
	window.addEventListener('keyup', (event) => {
		state.keys.delete(event.code);
		if (event.code === 'KeyE') state.interactHeld = false;
	});
	window.addEventListener('blur', () => {
		state.keys.clear();
		state.firing = false;
		state.interactHeld = false;
	});

	return {
		state,

		takeLook() {
			const dx = state.lookDX;
			const dy = state.lookDY;
			state.lookDX = 0;
			state.lookDY = 0;
			return { dx, dy };
		},
		takePressed(code) {
			if (!state.pressed.has(code)) return false;
			state.pressed.delete(code);
			return true;
		},
		clearPressed() { state.pressed.clear(); },
	};
}
