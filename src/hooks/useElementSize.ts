import { useLayoutEffect, useState } from "react";
import useResizeObserver from "@react-hook/resize-observer";

export default function useElementSize<T extends HTMLElement = HTMLDivElement>(
	target: React.RefObject<T | null>,
) {
	const [size, setSize] = useState<DOMRect>(DOMRect.fromRect());

	useLayoutEffect(() => {
		setSize(target.current?.getBoundingClientRect() ?? DOMRect.fromRect());
	}, [target.current]);

	useResizeObserver(target.current, (entry) => setSize(entry.contentRect));

	return size;
}
