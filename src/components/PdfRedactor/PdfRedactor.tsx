import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
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

const pdfjsBase = import.meta.env.MODE === "development" ? location.origin + "/" : import.meta.url;

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	/* @vite-ignore */ "pdfjs/pdf.worker.min.mjs",
	pdfjsBase,
).href;

const options = {
	cMapUrl: new URL(/* @vite-ignore */ "pdfjs/cmaps/", pdfjsBase).href,
	standardFontDataUrl: new URL(
		/* @vite-ignore */ "pdfjs/standard_fonts/",
		pdfjsBase,
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

type RedactionHistoryEntry = {
	pageIndex: number;
	box: DOMRect;
};

type RedactionState = {
	boxesMarkedForRedaction: DOMRect[][];
	boxesRedacted: DOMRect[][];
	redactionHistory: RedactionHistoryEntry[][];
	redoHistory: RedactionHistoryEntry[][];
};

const cloneDOMRect = (rect: DOMRect): DOMRect =>
	DOMRect.fromRect({
		x: rect.x,
		y: rect.y,
		width: rect.width,
		height: rect.height,
	});

const hasAnyBoxes = (boxes: DOMRect[][]): boolean =>
	boxes.some((pageBoxes) => pageBoxes.length > 0);

const createRedactionHistoryEntries = (
	boxesMarkedForRedaction: DOMRect[][],
): RedactionHistoryEntry[] => {
	const entries: RedactionHistoryEntry[] = [];

	for (let pageIndex = 0; pageIndex < boxesMarkedForRedaction.length; pageIndex++) {
		const pageBoxes = boxesMarkedForRedaction[pageIndex] ?? [];
		for (let i = 0; i < pageBoxes.length; i++) {
			entries.push({ pageIndex, box: cloneDOMRect(pageBoxes[i]) });
		}
	}

	return entries;
};

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

	const [redactionState, setRedactionState] = useState<RedactionState>({
		boxesMarkedForRedaction: [],
		boxesRedacted: [],
		redactionHistory: [],
		redoHistory: [],
	});
	const { boxesMarkedForRedaction, boxesRedacted, redactionHistory, redoHistory } =
		redactionState;
	const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);

	const undo = useCallback(() => {
		setRedactionState((prev) => {
			const lastGroup = prev.redactionHistory[prev.redactionHistory.length - 1];
			if (lastGroup === undefined) {
				return prev;
			}

			const nextBoxesRedacted = prev.boxesRedacted.map((pageBoxes) => [
				...pageBoxes,
			]);

			// Count how many boxes to remove per page (they were appended last)
			const removeCountByPage = new Map<number, number>();
			for (const entry of lastGroup) {
				removeCountByPage.set(
					entry.pageIndex,
					(removeCountByPage.get(entry.pageIndex) ?? 0) + 1,
				);
			}
			for (const [pageIndex, count] of removeCountByPage) {
				const pageBoxes = nextBoxesRedacted[pageIndex] ?? [];
				nextBoxesRedacted[pageIndex] = pageBoxes.slice(0, pageBoxes.length - count);
			}

			return {
				boxesMarkedForRedaction: [],
				boxesRedacted: nextBoxesRedacted,
				redactionHistory: prev.redactionHistory.slice(
					0,
					prev.redactionHistory.length - 1,
				),
				redoHistory: [
					...prev.redoHistory,
					lastGroup.map((entry) => ({
						pageIndex: entry.pageIndex,
						box: cloneDOMRect(entry.box),
					})),
				],
			};
		});
	}, []);

	const redo = useCallback(() => {
		setRedactionState((prev) => {
			const lastGroup = prev.redoHistory[prev.redoHistory.length - 1];
			if (lastGroup === undefined) {
				return prev;
			}

			const nextBoxesRedacted = prev.boxesRedacted.map((pageBoxes) => [
				...pageBoxes,
			]);
			for (const entry of lastGroup) {
				const pageBoxes = nextBoxesRedacted[entry.pageIndex] ?? [];
				pageBoxes.push(cloneDOMRect(entry.box));
				nextBoxesRedacted[entry.pageIndex] = pageBoxes;
			}

			return {
				boxesMarkedForRedaction: prev.boxesMarkedForRedaction,
				boxesRedacted: nextBoxesRedacted,
				redactionHistory: [
					...prev.redactionHistory,
					lastGroup.map((entry) => ({
						pageIndex: entry.pageIndex,
						box: cloneDOMRect(entry.box),
					})),
				],
				redoHistory: prev.redoHistory.slice(0, prev.redoHistory.length - 1),
			};
		});
	}, []);

	const onResetDialogOpen = useCallback(() => {
		setResetDialogOpen(true);
	}, []);

	const onResetDialogClose = useCallback(() => {
		setResetDialogOpen(false);
	}, []);

	const resetRedactions = useCallback(() => {
		setRedactionState({
			boxesMarkedForRedaction: [],
			boxesRedacted: [],
			redactionHistory: [],
			redoHistory: [],
		});
		setResetDialogOpen(false);
	}, []);


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

			setRedactionState((prev) => ({ ...prev, boxesMarkedForRedaction: rects }));
		},
		[numPages, pageElementRefs],
	);

	const selectionHandler = useMemo<() => void>(
		() => () => {
			const selection = document.getSelection();
			if (selection === null || selection.type !== "Range") {
				setRedactionState((prev) => ({ ...prev, boxesMarkedForRedaction: [] }));
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
		setRedactionState((prev) => ({ ...prev, boxesMarkedForRedaction: [] }));
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
			setRedactionState((prev) => ({ ...prev, boxesMarkedForRedaction: boxes }));

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
		setRedactionState((prev) => ({ ...prev, boxesMarkedForRedaction: [] }));
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
								setRedactionState((prev) => {
									const nextHistoryEntries = createRedactionHistoryEntries(
										prev.boxesMarkedForRedaction,
									);
									if (nextHistoryEntries.length === 0) {
										return prev;
									}

									return {
										boxesMarkedForRedaction: [],
										boxesRedacted: Array.from(
											{ length: numPages },
											(_, pageIndex) => [
												...(prev.boxesRedacted[pageIndex] ?? []).map(cloneDOMRect),
												...(prev.boxesMarkedForRedaction[pageIndex] ?? []).map(
													cloneDOMRect,
												),
											],
										),
										redactionHistory: [
											...prev.redactionHistory,
											nextHistoryEntries,
										],
										redoHistory: [],
									};
								});
							}}
							disabled={
								!(textRedactorSelected || boxRedactorSelected) ||
								!hasAnyBoxes(boxesMarkedForRedaction)
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
						<ToolbarItem.Undo
							onClick={undo}
							disabled={redactionHistory.length === 0}
						/>
						<ToolbarItem.Redo
							onClick={redo}
							disabled={redoHistory.length === 0}
						/>
						<ToolbarItem.Reset
							onClick={onResetDialogOpen}
							disabled={redactionHistory.length === 0}
						/>
						<ToolbarItem.Save
							onClick={() => Save()}
							disabled={!hasAnyBoxes(boxesRedacted)}
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
			<Dialog
				open={resetDialogOpen}
				onClose={onResetDialogClose}
				transitionDuration={250}
				fullWidth
				maxWidth="sm"
			>
				<DialogContent>
					<DialogContentText>
						Vill du verkligen kassera alla ändringar?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={resetRedactions} variant="contained" autoFocus>
						Bekräfta
					</Button>
					<Button onClick={onResetDialogClose}>Avbryt</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}

export default PdfRedactor;
