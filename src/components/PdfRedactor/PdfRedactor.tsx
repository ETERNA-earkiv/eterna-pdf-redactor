import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { Document, Page, Thumbnail, pdfjs } from "react-pdf";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import clsx from "clsx";

import { useMemoizedRefArray } from "../../hooks/useMemoizedRefArray";
import Toolbar from "./Toolbar/Toolbar";
import * as ToolbarItem from "./Toolbar/ToolbarItems";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import styles from "./PdfRedactor.module.css";
import "./PdfRedactor.css";
import { areDOMRectsMergable, mergeDOMRects } from "./DOMRectUtils";

import {
	type ExportContextType,
	ExportProvider,
} from "./exporter/ExportContext";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	/* @vite-ignore */ "pdfjs/pdf.worker.min.mjs",
	import.meta.url,
).href;

const options = {
	cMapUrl: new URL(/* @vite-ignore */ "pdfjs/cmaps/", import.meta.url).href,
	standardFontDataUrl: new URL(
		/* @vite-ignore */ "pdfjs/standard_fonts/",
		import.meta.url,
	).href,
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
	const [boxRedactorSelected, setBoxRedactorSelected] =
		useState<boolean>(false);

	const sidebar = useRef<HTMLDivElement>(null);

	const viewport = useRef<HTMLDivElement>(null);
	const currentViewport = viewport.current;

	const [ignoreScrollEvents, setIgnoreScrollEvents] = useState<boolean>(false);

	const exporter = useRef<ExportContextType>(null);

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
			sidebar.current.scrollTo({
				top: thumbnail.offsetTop,
				behavior: "smooth",
			});
		}
	}, [pageNumber, sidebarVisible]);

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
	const pageScaleRef = useRef<number>(1);

	const [_, setCurrentPageProxy] = useState<PDFPageProxy | undefined>(
		pageProxyObjects[pageNumber],
	);

	const goToPage = useCallback(
		(pageNumber: number) => {
			setIgnoreScrollEvents(true);
			const firstPageElementRef = pageElementRefs[0];
			const pageElementRef = pageElementRefs[pageNumber - 1];
			if (
				viewport.current !== null &&
				firstPageElementRef !== undefined &&
				pageElementRef !== undefined &&
				firstPageElementRef.current !== null &&
				pageElementRef.current !== null
			) {
				const marginTop =
					pageElementRef.current.offsetHeight < viewport.current.clientHeight
						? Math.min(
								firstPageElementRef.current.offsetTop,
								viewport.current.clientHeight -
									pageElementRef.current.offsetHeight,
							)
						: 0;

				viewport.current.scrollTo({
					top: pageElementRef.current.offsetTop - marginTop,
					behavior: "smooth",
				});
			}
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
		setNumPages(pdfDocument._pdfInfo.numPages);
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

	const onScroll = () => {
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

				let pageIndex = Number.NaN;
				let currentNode: Node | Element | null = range.commonAncestorContainer;

				do {
					if (
						currentNode.nodeType === Node.ELEMENT_NODE &&
						(currentNode as Element).hasAttribute("data-page-number")
					) {
						pageIndex = Number.parseInt(
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
							2 * pageScaleRef.current,
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

						adjustedRect.x =
							(adjustedRect.x - pageRect.x) / pageScaleRef.current - 1;
						adjustedRect.y =
							(adjustedRect.y - pageRect.y) / pageScaleRef.current - 1;
						adjustedRect.width = adjustedRect.width / pageScaleRef.current + 2;
						adjustedRect.height =
							adjustedRect.height / pageScaleRef.current + 2;

						return adjustedRect;
					});
			});

			setBoxesMarkedForRedaction(rects);
		},
		[numPages, pageElementRefs],
	);

	const selectionHandler = useMemo<() => void>(
		() => () => {
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
		},
		[redactedRangesHandler],
	);

	const toggleTextRedactor = () => {
		setBoxRedactorSelected(false);
		setBoxesMarkedForRedaction([]);
		window.getSelection()?.removeAllRanges();
		if (!textRedactorSelected) {
			setTextRedactorSelected(true);
			document.addEventListener("selectionchange", selectionHandler);
		} else {
			setTextRedactorSelected(false);
			document.removeEventListener("selectionchange", selectionHandler);
		}
	};

	const [tempRedactBox, setTempRedactBox] = useState<DOMRect>();
	const drawRedactBoxFrom = useRef<{ x: number; y: number } | undefined>(
		undefined,
	);
	const drawRedactBoxTo = useRef<{ x: number; y: number } | undefined>(
		undefined,
	);
	const boxRedactorMouseIsDown = useRef<boolean>(false);
	const boxRedactorCurrentPage = useRef<number | undefined>(undefined);

	const boxRedactorMouseMoveMouseUp = useCallback(
		(e: MouseEvent) => {
			if (
				boxRedactorCurrentPage.current === undefined ||
				drawRedactBoxFrom.current === undefined
			) {
				return;
			}

			const pageElement = pageElementRefs[boxRedactorCurrentPage.current - 1];
			if (pageElement === undefined || pageElement.current === null) {
				return;
			}

			const pageRect = pageElement.current.getBoundingClientRect();

			const offsetX = e.pageX - pageRect.x;
			const offsetY = e.pageY - pageRect.y;

			const x = Math.min(Math.max(0, offsetX), pageElement.current.offsetWidth);

			const y = Math.min(
				Math.max(0, offsetY),
				pageElement.current.offsetHeight,
			);

			const fromX = Math.min(x, drawRedactBoxFrom.current.x);
			const fromY = Math.min(y, drawRedactBoxFrom.current.y);

			const width = Math.max(x, drawRedactBoxFrom.current.x) - fromX;
			const height = Math.max(y, drawRedactBoxFrom.current.y) - fromY;

			const redactionBox = DOMRect.fromRect();
			redactionBox.x = fromX / pageScaleRef.current;
			redactionBox.y = fromY / pageScaleRef.current;
			redactionBox.width = width / pageScaleRef.current;
			redactionBox.height = height / pageScaleRef.current;

			setTempRedactBox(redactionBox);

			return { pageNumber: boxRedactorCurrentPage.current, x, y };
		},
		[pageElementRefs],
	);

	const boxRedactorMouseUpHandler = useCallback(
		(e: MouseEvent) => {
			document.documentElement.removeEventListener(
				"mouseup",
				boxRedactorMouseUpHandler,
			);
			document.documentElement.removeEventListener(
				"mousemove",
				boxRedactorMouseMoveHandler,
			);
			boxRedactorMouseIsDown.current = false;

			if (drawRedactBoxFrom.current === undefined) {
				drawRedactBoxFrom.current = undefined;
				drawRedactBoxTo.current = undefined;
				boxRedactorMouseIsDown.current = false;
				boxRedactorCurrentPage.current = undefined;
				return;
			}

			const coords = boxRedactorMouseMoveMouseUp(e);
			setTempRedactBox(undefined);
			if (coords === undefined) {
				drawRedactBoxFrom.current = undefined;
				drawRedactBoxTo.current = undefined;
				boxRedactorMouseIsDown.current = false;
				boxRedactorCurrentPage.current = undefined;
				return;
			}

			const x = Math.min(coords.x, drawRedactBoxFrom.current.x);
			const y = Math.min(coords.y, drawRedactBoxFrom.current.y);

			const width = Math.max(coords.x, drawRedactBoxFrom.current.x) - x;
			const height = Math.max(coords.y, drawRedactBoxFrom.current.y) - y;

			const redactionBox = DOMRect.fromRect();
			redactionBox.x = x / pageScaleRef.current;
			redactionBox.y = y / pageScaleRef.current;
			redactionBox.width = width / pageScaleRef.current;
			redactionBox.height = height / pageScaleRef.current;

			const boxes: DOMRect[][] = Array.from({ length: numPages }, () => []);
			boxes[coords.pageNumber - 1].push(redactionBox);
			setBoxesMarkedForRedaction(boxes);

			drawRedactBoxFrom.current = undefined;
			drawRedactBoxTo.current = undefined;
			boxRedactorMouseIsDown.current = false;
			boxRedactorCurrentPage.current = undefined;
		},
		[boxRedactorMouseMoveMouseUp, numPages],
	);

	const boxRedactorMouseMoveHandler = useCallback(
		(e: MouseEvent) => {
			if ((e.buttons & 1) !== 1) {
				boxRedactorMouseUpHandler(e);
				return;
			}

			if (drawRedactBoxFrom.current === undefined) {
				return;
			}

			const coords = boxRedactorMouseMoveMouseUp(e);
			if (coords !== undefined) {
				drawRedactBoxTo.current = { x: coords.x, y: coords.y };
			}
		},
		[boxRedactorMouseUpHandler, boxRedactorMouseMoveMouseUp],
	);

	const boxRedactorMouseDownHandler = useCallback(
		(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			if (boxRedactorSelected) {
				const pageElement = e.currentTarget as HTMLDivElement;
				const pageNumberAttribute =
					pageElement.getAttribute("data-page-number");

				if (pageNumberAttribute === null) {
					return;
				}

				boxRedactorMouseIsDown.current = true;

				const pageNumber = Number.parseInt(pageNumberAttribute, 10);

				drawRedactBoxFrom.current = {
					x: e.nativeEvent.offsetX,
					y: e.nativeEvent.offsetY,
				};

				boxRedactorCurrentPage.current = pageNumber;

				document.documentElement.addEventListener(
					"mousemove",
					boxRedactorMouseMoveHandler,
				);
				document.documentElement.addEventListener(
					"mouseup",
					boxRedactorMouseUpHandler,
				);
			}
		},
		[
			boxRedactorSelected,
			boxRedactorMouseMoveHandler,
			boxRedactorMouseUpHandler,
		],
	);

	const toggleBoxRedactor = () => {
		setTextRedactorSelected(false);
		setBoxesMarkedForRedaction([]);
		window.getSelection()?.removeAllRanges();
		if (!boxRedactorSelected) {
			setBoxRedactorSelected(true);
			document.removeEventListener("selectionchange", selectionHandler);
		} else {
			setBoxRedactorSelected(false);
		}
	};

	const Save = async () => {
		if (
			documentProxy === undefined ||
			numPages === 0 ||
			exporter.current === null
		) {
			return;
		}

		exporter.current.confirmExport();
	};

	return (
		<>
			<ExportProvider
				contextRef={exporter}
				pdfDocument={documentProxy}
				boxes={boxesRedacted}
				numberOfPages={numPages}
				scale={pageScale}
			>
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
								goToPage(Number.parseInt(e.target.value, 10))
							}
							pageNumber={pageNumber}
							numPages={numPages}
						/>
						<ToolbarItem.Spacer />
						<ToolbarItem.ScaleSelector
							viewport={viewport}
							pageProxy={
								pageNumber !== 0
									? (pageProxyObjects[
											pageNumber - 1
										] as PageProxyWithWidthHeight)
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
								pageScaleRef.current = currentScale;
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
								!(textRedactorSelected || boxRedactorSelected) ||
								boxesMarkedForRedaction.length === 0
							}
						/>
						<ToolbarItem.TextRedactor
							onClick={toggleTextRedactor}
							selected={textRedactorSelected}
						/>
						<ToolbarItem.BoxRedactor
							onClick={toggleBoxRedactor}
							selected={boxRedactorSelected}
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
								boxRedactorSelected && styles.boxRedactorActive,
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
										onMouseDown={boxRedactorMouseDownHandler}
										{...pageScaleOptions}
									>
										<div className={styles.markedForRedactionContainer}>
											{tempRedactBox !== undefined &&
												boxRedactorCurrentPage.current === index + 1 && (
													<div
														className={styles.tempMarkedForRedaction}
														style={{
															top: `${tempRedactBox.top * pageScale}px`,
															left: `${tempRedactBox.left * pageScale}px`,
															width: `${tempRedactBox.width * pageScale}px`,
															height: `${tempRedactBox.height * pageScale}px`,
														}}
													/>
												)}
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
			</ExportProvider>
		</>
	);
}

export default PdfRedactor;
