import { useEffect, useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import useElementSize from "../../../../hooks/useElementSize";
import { PDFPageProxy } from "pdfjs-dist";

const ScaleProps: {
	width: number | undefined;
	height: number | undefined;
} = {
	width: undefined,
	height: undefined,
};

const AllProps: {
	scale: number | undefined;
	width: number | undefined;
	height: number | undefined;
} = {
	scale: undefined,
	width: undefined,
	height: undefined,
};

interface PageProxyWithWidthHeight extends PDFPageProxy {
	width: number,
	height: number,
	originalWidth: number,
	originalHeight: number
}

type ScaleSelectorProps = {
	onChange: (scale: typeof AllProps) => void;
	viewport: React.RefObject<HTMLElement>;
	pageProxy?: PageProxyWithWidthHeight;
	pageNumber?: number;
	numPages?: number;
};

const ScaleOptions = {
	"page-actual": {
		name: "Verklig storlek",
		props: { scale: 1, ...ScaleProps },
	},
	"page-fit": { name: "Anpassa sida", props: { ...AllProps } },
	"page-width": { name: "Sidbredd", props: { ...AllProps } },
	"0.5": { name: "50%", props: { scale: 0.5, ...ScaleProps } },
	"0.75": { name: "75%", props: { scale: 0.75, ...ScaleProps } },
	"1": { name: "100%", props: { scale: 1, ...ScaleProps } },
	"1.25": { name: "125%", props: { scale: 1.25, ...ScaleProps } },
	"1.5": { name: "150%", props: { scale: 1.5, ...ScaleProps } },
	"2": { name: "200%", props: { scale: 2, ...ScaleProps } },
	"3": { name: "300%", props: { scale: 3, ...ScaleProps } },
	"4": { name: "400%", props: { scale: 4, ...ScaleProps } },
};

const ScaleOptionKeys: Array<keyof typeof ScaleOptions> = [
	"page-actual",
	"page-fit",
	"page-width",
	"0.5",
	"0.75",
	"1",
	"1.25",
	"1.5",
	"2",
	"3",
	"4",
];

function ScaleSelector(props: ScaleSelectorProps) {
	const [selectedScale, setSelectedScale] =
		useState<keyof typeof ScaleOptions>("1");
	const viewportSize = useElementSize(props.viewport);

	/*
	// Re-rendering is way too slow, need to aggressively debounce
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		switch (selectedScale) {
			case "page-fit": // Not correct, neeed PDF-dimensions to set accurately
				return props.onChange({
					...ScaleOptions[selectedScale].props,
					width: viewportSize.width,
				});

			case "page-width":
				return props.onChange({
					...ScaleOptions[selectedScale].props,
					width: viewportSize.width,
				});
		}
	}, [viewportSize, selectedScale, ScaleOptions]);
	*/

	const onChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
		const value = e.target.value as keyof typeof ScaleOptions;
		setSelectedScale(value);
		switch (value) {
			case "page-fit":
				if (
					props.pageProxy !== undefined &&
					viewportSize.width / viewportSize.height <
						props.pageProxy.originalWidth / props.pageProxy.originalHeight
				) {
					return props.onChange({
						...ScaleOptions[value].props,
						width: viewportSize.width,
					});
				}
				return props.onChange({
					...ScaleOptions[value].props,
					height: viewportSize.height,
				});

			case "page-width":
				return props.onChange({
					...ScaleOptions[value].props,
					width: viewportSize.width,
				});

			default:
				return props.onChange({
					...ScaleOptions[value].props,
				});
		}
	};

	return (
		<>
			<button type="button">
				<FiMinus />
			</button>
			<button type="button">
				<FiPlus />
			</button>
			<select value={selectedScale} onChange={onChange}>
				{ScaleOptionKeys.map((key) => {
					return (
						<option key={key} value={key}>
							{ScaleOptions[key as keyof typeof ScaleOptions].name}
						</option>
					);
				})}
			</select>
		</>
	);
}

export default ScaleSelector;
