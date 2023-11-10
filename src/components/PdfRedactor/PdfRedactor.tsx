import {
	ChangeEvent,
	RefObject,
	createRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { Document, Page, Outline, Thumbnail, pdfjs } from "react-pdf";
import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";
import clsx from "clsx";

import { useMemoizedRefArray } from "../../hooks/useMemoizedRefArray";
import Toolbar from "./Toolbar/Toolbar";
import * as ToolbarItem from "./Toolbar/ToolbarItems";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import styles from "./PdfRedactor.module.css";
import "./PdfRedactor.css";
import { areDOMRectsMergable, mergeDOMRects } from "./DOMRectUtils";

pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js";

const options = {
	cMapUrl: "/pdfjs/cmaps/",
	standardFontDataUrl: "/pdfjs/standard_fonts/",
};

type File = React.ComponentProps<typeof Document>["file"];

type PdfRedactorProps = {
	document: File;
};

type ScaleOptionProperties = {
	scale: number | undefined;
	width: number | undefined;
	height: number | undefined;
};

interface PageProxyWithWidthHeight extends PDFPageProxy {
	width: number;
	height: number;
	originalWidth: number;
	originalHeight: number;
}

function PdfRedactor(props: PdfRedactorProps) {
	const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy>();
	const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
	const [numPages, setNumPages] = useState<number>(0);
	const [pageNumber, setPageNumber] = useState<number>(0);

	const [textRedactorSelected, setTextRedactorSelected] =
		useState<boolean>(false);

	const sidebar = useRef<HTMLDivElement>(null);

	const viewport = useRef<HTMLDivElement>(null);
	const currentViewport = viewport.current;

	const [ignoreScrollEvents, setIgnoreScrollEvents] = useState<boolean>(false);

	useEffect(() => {
		if (currentViewport === null) {
			return;
		}

		const tmpScrollEndHandler = () => setIgnoreScrollEvents(false);
		currentViewport.addEventListener("scrollend", tmpScrollEndHandler);

		return () => {
			currentViewport?.removeEventListener("scrollend", tmpScrollEndHandler);
		};
	}, [currentViewport]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (pageNumber === 0 || sidebarVisible === false) {
			return;
		}

		const thumbnail = thumbnailElementRefs[pageNumber - 1].current;
		if (thumbnail === null || sidebar.current === null) {
			return;
		}

		if (
			!(
				thumbnail.offsetTop - sidebar.current.scrollTop >= 0 &&
				thumbnail.offsetTop +
					thumbnail.offsetHeight -
					sidebar.current.scrollTop <=
					sidebar.current.clientHeight
			)
		) {
			thumbnail.scrollIntoView();
		}
	}, [pageNumber]);

	/*
	const pageProxyObjects: Array<PDFPageProxy | undefined> = useMemo(
		() => Array.from({ length: numPages }, (_) => undefined),
		[numPages],
	);
	*/
	const [pageProxyObjects, setPageProxyObjects] = useState<PDFPageProxy[]>([]);

	const pageElementRefs = useMemoizedRefArray<HTMLDivElement>(numPages, null);

	const thumbnailElementRefs = useMemoizedRefArray<HTMLDivElement>(
		numPages,
		null,
	);

	const [pageScaleOptions, setPageScaleOptions] =
		useState<ScaleOptionProperties>({
			scale: 1,
			width: undefined,
			height: undefined,
		});

	const [pageScale, setPageScale] = useState(1);

	const [_, setCurrentPageProxy] = useState<PDFPageProxy | undefined>(
		pageProxyObjects[pageNumber],
	);

	const onPageClick = useCallback(
		(
			event: React.MouseEvent<HTMLDivElement>,
			page: PDFPageProxy | false | undefined,
		) => console.log("Clicked a page", { event, page }),
		[],
	);

	const goToPage = useCallback(
		(pageNumber: number) => {
			setIgnoreScrollEvents(true);
			pageElementRefs[pageNumber - 1].current?.scrollIntoView();
			setPageNumber(pageNumber);
		},
		[pageElementRefs],
	);

	const onItemClick = useCallback(
		(args: { pageNumber: number }) => {
			goToPage(args.pageNumber);
		},
		[goToPage],
	);

	const onDocumentLoadSuccess = useCallback((pdfDocument: PDFDocumentProxy) => {
		setDocumentProxy(pdfDocument);
		setNumPages(pdfDocument.numPages);
		setPageNumber(1);
	}, []);

	const onPageLoadSuccess = useCallback(
		(pdfPage: PDFPageProxy) => {
			if (pageNumber === pdfPage._pageIndex) {
				setCurrentPageProxy(pdfPage);
			}

			pageProxyObjects[pdfPage._pageIndex] = pdfPage;
			setPageProxyObjects(pageProxyObjects);
		},
		[pageNumber, pageProxyObjects],
	);

	const toggleSidebar = () => {
		setSidebarVisible(!sidebarVisible);
	};

	const goToPrevPage = () => {
		if (pageNumber > 1) {
			goToPage(pageNumber - 1);
		}
	};

	const goToNextPage = () => {
		if (pageNumber === 0 || numPages === 0) {
			return;
		}

		if (pageNumber < numPages) {
			goToPage(pageNumber + 1);
		}
	};

	const onScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
		if (ignoreScrollEvents === true || viewport.current === null) {
			return;
		}

		let mostVisiblePageIndex = pageNumber - 1;
		let largestVisibleHeight = 0;

		for (let i = 0; i < pageElementRefs.length; i++) {
			const page = pageElementRefs[i].current;

			if (page === null) {
				return;
			}

			const viewportHeight = viewport.current.clientHeight;
			const deltaTop = page.offsetTop - viewport.current.scrollTop;
			const deltaBottom =
				page.offsetTop + page.offsetHeight - viewport.current.scrollTop;
			const visibleHeight = Math.max(
				0,
				deltaTop > 0
					? Math.min(page.offsetHeight, viewportHeight - deltaTop)
					: Math.min(deltaBottom, viewportHeight),
			);

			if (
				page.offsetTop + page.offsetHeight > viewport.current.scrollTop &&
				page.offsetTop <
					viewport.current.scrollTop + viewport.current.clientHeight &&
				visibleHeight > largestVisibleHeight
			) {
				largestVisibleHeight = visibleHeight;
				mostVisiblePageIndex = i;
			}
		}

		if (mostVisiblePageIndex + 1 !== pageNumber) {
			setPageNumber(mostVisiblePageIndex + 1);
		}
	};

	const [boxesMarkedForRedaction, setBoxesMarkedForRedaction] = useState<
		DOMRect[][]
	>([]);
	const [boxesRedacted, setBoxesRedacted] = useState<DOMRect[][]>([]);

	const redactedRangesHandler = useCallback(
		(ranges: Range[]) => {
			const currentBoxes: Array<DOMRect | null>[] = Array.from(
				{ length: numPages },
				(_) => [],
			);

			for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
				const range = ranges[rangeIndex];

				let pageIndex = NaN;
				let currentNode: Node | Element | null = range.commonAncestorContainer;

				do {
					if (
						currentNode.nodeType === Node.ELEMENT_NODE &&
						(currentNode as Element).hasAttribute("data-page-number")
					) {
						pageIndex = parseInt(
							(currentNode as Element).getAttribute(
								"data-page-number",
							) as string,
							10,
						);
						break;
					}

					currentNode = currentNode.parentElement;
				} while (currentNode !== null);

				if (Number.isNaN(pageIndex)) {
					continue;
				}

				console.log(`Range #${rangeIndex + 1}, Page #${pageIndex}`);

				const clientRects = Array.from(range.getClientRects());
				currentBoxes[pageIndex - 1].push(...clientRects);
			}

			for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
				for (
					let rectIndex = 0;
					rectIndex < currentBoxes[pageIndex].length - 1;
					rectIndex++
				) {
					if (
						areDOMRectsMergable(
							currentBoxes[pageIndex][rectIndex] as DOMRect,
							currentBoxes[pageIndex][rectIndex + 1] as DOMRect,
							2 * pageScale,
						)
					) {
						currentBoxes[pageIndex].splice(
							rectIndex,
							2,
							null,
							mergeDOMRects(
								currentBoxes[pageIndex][rectIndex] as DOMRect,
								currentBoxes[pageIndex][rectIndex + 1] as DOMRect,
							),
						);
					}
				}
			}

			const rects = currentBoxes.map((boxes, pageIndex) => {
				return boxes
					.filter(
						(rect) => rect !== null && rect.width !== 0 && rect.height !== 0,
					)
					.map((rect) => {
						const pageRect =
							pageElementRefs[pageIndex].current?.getBoundingClientRect() ??
							DOMRect.fromRect();
						const adjustedRect = DOMRect.fromRect(rect ?? undefined);

						adjustedRect.x = (adjustedRect.x - pageRect.x) / pageScale - 1;
						adjustedRect.y = (adjustedRect.y - pageRect.y) / pageScale - 1;
						adjustedRect.width = adjustedRect.width / pageScale + 2;
						adjustedRect.height = adjustedRect.height / pageScale + 2;

						return adjustedRect;
					});
			});

			setBoxesMarkedForRedaction(rects);
		},
		[numPages, pageElementRefs, pageScale],
	);

	const selectionHandler = useCallback(() => {
		const selection = document.getSelection();
		if (selection === null || selection.type !== "Range") {
			setBoxesMarkedForRedaction([]);
			return;
		}

		/*
			TODO:
				Check if range.commonAncestorContainer is child of pages container
				if not check if pages are child of range.commonAncestor
				if they are run function that splits range into subranges that are children of individual pages
		*/

		const ranges: Range[] = Array.from(
			{ length: selection.rangeCount },
			(rangeIndex: number) => selection.getRangeAt(rangeIndex),
		);

		redactedRangesHandler(ranges);
	}, [redactedRangesHandler]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const wrappedSelectionHandler = useMemo<() => void>(
		() => selectionHandler,
		undefined,
	);

	const toggleTextRedactor = () => {
		if (!textRedactorSelected) {
			setTextRedactorSelected(true);
			document.addEventListener("selectionchange", wrappedSelectionHandler);
		} else {
			setTextRedactorSelected(false);
			document.removeEventListener("selectionchange", selectionHandler);
			setBoxesMarkedForRedaction([]);
		}
	};

	const Save = async () => {
		if (documentProxy === undefined || numPages === 0) {
			return;
		}

		const scale = 3;
		const newDocument = await PDFDocument.create();

		for (let pageIndex = 1; pageIndex <= documentProxy.numPages; pageIndex++) {
			const page = await documentProxy.getPage(pageIndex);
			const viewport = page.getViewport({ scale: scale });
			// Support HiDPI-screens.
			const outputScale = window.devicePixelRatio || 1;

			const canvas = document.createElement("canvas");
			canvas.width = Math.floor(viewport.width * outputScale);
			canvas.height = Math.floor(viewport.height * outputScale);

			const context = canvas.getContext("2d");
			if (context === null) {
				console.log("Could not get canvas context.");
				return;
			}

			const transform =
				outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

			const renderContext = {
				canvasContext: context,
				transform: transform,
				viewport: viewport,
			};

			await page.render(renderContext).promise;

			if (boxesRedacted[pageIndex - 1] !== undefined) {
				for (let i = 0; i < boxesRedacted[pageIndex - 1].length; i++) {
					context.fillRect(
						boxesRedacted[0][i].x * scale,
						boxesRedacted[0][i].y * scale,
						boxesRedacted[0][i].width * scale,
						boxesRedacted[0][i].height * scale,
					);
				}
			}

			const width = (page as PageProxyWithWidthHeight).originalWidth;
			const height = (page as PageProxyWithWidthHeight).originalHeight;

			const newPage = newDocument.addPage([width, height]);
			const image = await newDocument.embedPng(canvas.toDataURL("image/png"));
			newPage.drawImage(image, {
				x: 0,
				y: 0,
				width,
				height,
			});
		}

		const base64DataUri = await newDocument.saveAsBase64({ dataUri: true });

		const link = document.createElement("a");
		link.setAttribute("download", "page1.pdf");
		link.setAttribute("href", base64DataUri);
		link.click();
	};

	return (
		<>
			<Document
				className={styles.document}
				file={props.document}
				options={options}
				onItemClick={onItemClick}
				onLoadSuccess={onDocumentLoadSuccess}
			>
				<Toolbar className={styles.toolbar} iconSize="24">
					<ToolbarItem.SidebarToggle
						onClick={toggleSidebar}
						selected={sidebarVisible}
					/>
					<ToolbarItem.PreviousPage
						onClick={goToPrevPage}
						disabled={pageNumber <= 1}
					/>
					<ToolbarItem.NextPage
						onClick={goToNextPage}
						disabled={pageNumber === 0 || pageNumber === numPages}
					/>
					<ToolbarItem.PageSelector
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							goToPage(parseInt(e.target.value, 10))
						}
						pageNumber={pageNumber}
						numPages={numPages}
					/>
					<ToolbarItem.Spacer />
					<ToolbarItem.ScaleSelector
						viewport={viewport}
						pageProxy={
							pageNumber !== 0
								? (pageProxyObjects[pageNumber - 1] as PageProxyWithWidthHeight)
								: undefined
						}
						onChange={(scaleOptions) => {
							setTextRedactorSelected(false);
							setPageScaleOptions(scaleOptions);

							let currentScale = 1;
							if (scaleOptions.scale !== undefined) {
								currentScale = scaleOptions.scale;
							} else if (
								pageNumber > 0 &&
								pageProxyObjects[pageNumber - 1] !== undefined
							) {
								const pageProxy = pageProxyObjects[
									pageNumber - 1
								] as PageProxyWithWidthHeight;
								currentScale = pageProxy.width / pageProxy.originalWidth;
							}

							setPageScale(currentScale);
						}}
					/>
					<ToolbarItem.Spacer />
					<ToolbarItem.ApplyRedactions
						onClick={() => {
							const redacted: DOMRect[][] = [];
							for (let i = 0; i < numPages; i++) {
								const tmpBoxesRedacted = boxesRedacted[i] ?? [];
								const tmpBoxesMarkedForRedaction =
									boxesMarkedForRedaction[i] ?? [];
								redacted[i] = [
									...tmpBoxesRedacted,
									...tmpBoxesMarkedForRedaction,
								];
							}

							setBoxesRedacted(redacted);
							setBoxesMarkedForRedaction([]);
						}}
						disabled={
							!textRedactorSelected || boxesMarkedForRedaction.length === 0
						}
					/>
					<ToolbarItem.TextRedactor
						onClick={toggleTextRedactor}
						selected={textRedactorSelected}
					/>
					<ToolbarItem.Save
						onClick={() => Save()}
						disabled={boxesRedacted.length === 0}
					/>
				</Toolbar>
				<div
					className={clsx(
						styles.workarea,
						sidebarVisible && styles.sidebarVisible,
					)}
				>
					<aside className={styles.sidebar} ref={sidebar}>
						{Array.from(new Array(numPages), (_, index) => (
							<div
								key={`thumbnail_${index + 1}`}
								className={clsx(
									styles.thumbnailContainer,
									index + 1 === pageNumber && styles.active,
								)}
								ref={thumbnailElementRefs[index]}
							>
								<Thumbnail
									pageNumber={index + 1}
									width={180}
									className={styles.thumbnail}
								/>
								{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
								<span
									className={styles.pageNumber}
									onClick={() => setPageNumber(index + 1)}
								>
									{index + 1}
								</span>
							</div>
						))}
					</aside>
					{/*<Outline className="test" />*/}
					<div
						ref={viewport}
						className={clsx(
							styles.viewport,
							textRedactorSelected && styles.textRedactorActive,
						)}
						onScroll={onScroll}
					>
						<div className={styles.pagePosition}>
							{Array.from(new Array(numPages), (_, index) => (
								<Page
									key={`page_${index + 1}`}
									className={styles.page}
									pageNumber={index + 1}
									onLoadSuccess={onPageLoadSuccess}
									inputRef={pageElementRefs[index]}
									{...pageScaleOptions}
								>
									<div className={styles.markedForRedactionContainer}>
										{boxesMarkedForRedaction[index]?.map((rect, i) => {
											return (
												<div
													key={`marked_for_redaction_${i}`}
													className={styles.markedForRedaction}
													style={{
														top: `${rect.top * pageScale}px`,
														left: `${rect.left * pageScale}px`,
														width: `${rect.width * pageScale}px`,
														height: `${rect.height * pageScale}px`,
													}}
												/>
											);
										})}
									</div>
									<div className={styles.redactedContainer}>
										{boxesRedacted[index]?.map((rect, i) => {
											return (
												<div
													key={`redacted_${i}`}
													className={styles.redacted}
													style={{
														top: `${rect.top * pageScale}px`,
														left: `${rect.left * pageScale}px`,
														width: `${rect.width * pageScale}px`,
														height: `${rect.height * pageScale}px`,
													}}
												/>
											);
										})}
									</div>
								</Page>
							))}
						</div>
					</div>
				</div>
			</Document>
		</>
	);
}

export default PdfRedactor;
