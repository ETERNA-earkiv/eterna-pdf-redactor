import { useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import useElementSize from "../../../../hooks/useElementSize";
import type { PDFPageProxy } from "pdfjs-dist";

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
	width: number;
	height: number;
	originalWidth: number;
	originalHeight: number;
}

type ScaleSelectorProps = {
	onChange: (scale: typeof AllProps) => void;
	viewport: React.RefObject<HTMLElement | null>;
	pageProxy?: PageProxyWithWidthHeight;
	pageNumber?: number;
	numPages?: number;
};

const ScaleOptionKeys = [
	"page-actual",
	"page-fit",
	"page-width",
	"custom",
	"50",
	"75",
	"100",
	"125",
	"150",
	"200",
	"300",
	"400",
] as const;

type ScaleOptionType = {
	name: string;
	hidden?: boolean;
	props: typeof AllProps;
};

type ScaleOptionKeysType = typeof ScaleOptionKeys[number];

type ScaleOptionsType = {
	[K in ScaleOptionKeysType]: ScaleOptionType;
};

const ScaleOptions: ScaleOptionsType = {
	"page-actual": {
		name: "Verklig storlek",
		props: { scale: 1, ...ScaleProps },
	},
	"page-fit": { name: "Anpassa sida", props: { ...AllProps } },
	"page-width": { name: "Sidbredd", props: { ...AllProps } },
	custom: { name: "", hidden: true, props: { ...AllProps } },
	"50": { name: "50%", props: { scale: 0.5, ...ScaleProps } },
	"75": { name: "75%", props: { scale: 0.75, ...ScaleProps } },
	"100": { name: "100%", props: { scale: 1, ...ScaleProps } },
	"125": { name: "125%", props: { scale: 1.25, ...ScaleProps } },
	"150": { name: "150%", props: { scale: 1.5, ...ScaleProps } },
	"200": { name: "200%", props: { scale: 2, ...ScaleProps } },
	"300": { name: "300%", props: { scale: 3, ...ScaleProps } },
	"400": { name: "400%", props: { scale: 4, ...ScaleProps } },
};

const CustomScaleValues = [
	10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 130, 150, 170, 190, 210, 240,
	270, 300, 330, 370, 410, 460, 510, 570, 630, 700, 770, 850, 940, 1000,
];

function ScaleSelector(props: ScaleSelectorProps) {
	const [selectedScale, setSelectedScale] =
		useState<ScaleOptionKeysType>("100");
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
		const value = e.target.value as ScaleOptionKeysType;
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

	const zoom = (zoomIn: boolean) => {
		if (props.pageProxy === undefined) {
			return;
		}

		const currentScale = ScaleOptions[selectedScale].props.scale;

		const currentScalePercent =
			currentScale !== undefined
				? Math.round(currentScale * 100)
				: Math.round((props.pageProxy.width / props.pageProxy.originalWidth) * 100);

		let newCustomIndex = -1;
		const currentCustomIndex = CustomScaleValues.indexOf(currentScalePercent);

		if (currentCustomIndex >= 0) {
			if (zoomIn === true && currentCustomIndex < CustomScaleValues.length - 1) {
				newCustomIndex = currentCustomIndex + 1;
			} else if(zoomIn === false && currentCustomIndex > 0) {
				newCustomIndex = currentCustomIndex - 1;
			}
		} else {
			if (zoomIn) {
				for (let i = CustomScaleValues.length - 1; i > 0; i--) {
					if (CustomScaleValues[i] > currentScalePercent) {
						newCustomIndex = i;
					} else {
						break;
					}
				}
			} else {
				for (let i = 0; i < CustomScaleValues.length; i++) {
					if (CustomScaleValues[i] < currentScalePercent) {
						newCustomIndex = i;
					} else {
						break;
					}
				}
			}
		}

		if (newCustomIndex >= 0) {
			ScaleOptions.custom.name = `${CustomScaleValues[
				newCustomIndex
			].toString()}%`;
			ScaleOptions.custom.props.scale = CustomScaleValues[newCustomIndex] / 100;

			props.onChange({
				...ScaleOptions.custom.props,
			});

			setSelectedScale("custom");
		}
	};

	return (
		<>
			<button type="button" onClick={() => zoom(false)}>
				<FiMinus />
			</button>
			<button type="button" onClick={() => zoom(true)}>
				<FiPlus />
			</button>
			<select value={selectedScale} onChange={onChange}>
				{ScaleOptionKeys.map((key) => {
					const scaleOpt = ScaleOptions[key as keyof typeof ScaleOptions];
					return (
						<option
							key={key}
							value={key}
							hidden={scaleOpt.hidden}
							disabled={scaleOpt.hidden}
						>
							{scaleOpt.name}
						</option>
					);
				})}
			</select>
		</>
	);
}

export default ScaleSelector;
