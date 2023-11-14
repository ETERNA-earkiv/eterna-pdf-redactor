export function areDOMRectsMergable(a: DOMRect, b: DOMRect, margin = 0) {
	if (
		(Math.abs(a.top - b.top) <= margin &&
			Math.abs(a.bottom - b.bottom) <= margin &&
			!(a.left > b.right + margin || a.right < b.left - margin)) ||
		(Math.abs(a.left - b.left) <= margin &&
			Math.abs(a.right - b.right) <= margin &&
			!(a.top > b.bottom + margin || a.bottom < b.top - margin))
	) {
		return true;
	}

	return false;
}

export function mergeDOMRects(a: DOMRect, b: DOMRect) {
	const newDOMRect = DOMRect.fromRect();

	newDOMRect.x = Math.min(a.x, b.x);
	newDOMRect.y = Math.min(a.y, b.y);
	newDOMRect.width = Math.max(a.right, b.right) - newDOMRect.x;
	newDOMRect.height = Math.max(a.bottom, b.bottom) - newDOMRect.y;

	return newDOMRect;
}
