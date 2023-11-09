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

import clsx from "clsx";

import Toolbar from "./Toolbar/Toolbar";
import * as ToolbarItem from "./Toolbar/ToolbarItems";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import styles from "./PdfRedactor.module.css";

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

function areDOMRectsMergable(a: DOMRect, b: DOMRect) {
	if (
		(Math.abs(a.top - b.top) <= 2 &&
			Math.abs(a.height - b.height) <= 2 &&
			!(a.left > b.right + 2 || a.right < b.left - 2)) ||
		(Math.abs(a.left - b.left) <= 2 &&
			Math.abs(a.width - b.width) <= 2 &&
			!(a.top > b.bottom + 2 || a.bottom < b.top - 2))
	) {
		return true;
	}

	return false;
}

function mergeDOMRects(a: DOMRect, b: DOMRect) {
	const newDOMRect = DOMRect.fromRect();

	newDOMRect.x = Math.min(a.x, b.x);
	newDOMRect.y = Math.min(a.y, b.y);
	newDOMRect.width = Math.max(a.right, b.right) - newDOMRect.x;
	newDOMRect.height = Math.max(a.bottom, b.bottom) - newDOMRect.y;

	return newDOMRect;
}

function PdfRedactor(props: PdfRedactorProps) {
	const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
	const [numPages, setNumPages] = useState<number>();
	const [pageNumber, setPageNumber] = useState<number>();

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
		if (pageNumber === undefined || sidebarVisible === false) {
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

	const pageProxyObjects: Array<PDFPageProxy | undefined> = useMemo(
		() => Array.from({ length: numPages ?? 0 }, (_) => undefined),
		[numPages],
	);

		console.log(pageProxyObjects);

	const pageElementRefs: RefObject<HTMLDivElement>[] = useMemo(
		() =>
			Array.from({ length: numPages ?? 0 }, (_) => createRef<HTMLDivElement>()),
		[numPages],
	);

	const thumbnailElementRefs: RefObject<HTMLDivElement>[] = useMemo(
		() =>
			Array.from({ length: numPages ?? 0 }, (_) => createRef<HTMLDivElement>()),
		[numPages],
	);

	const [pageScaleOptions, setPageScaleOptions] =
		useState<ScaleOptionProperties>({
			scale: 1,
			width: undefined,
			height: undefined,
		});

	const [currentPageProxy, setCurrentPageProxy] = useState<
		PDFPageProxy | undefined
	>(pageProxyObjects[pageNumber ?? 0]);

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
		setNumPages(pdfDocument.numPages);
		setPageNumber(1);
	}, []);

	const onPageLoadSuccess = useCallback(
		(pdfPage: PDFPageProxy) => {
			if (pageNumber === pdfPage._pageIndex) {
				setCurrentPageProxy(pdfPage);
			}

			pageProxyObjects[pdfPage._pageIndex] = pdfPage;
		},
		[pageNumber, pageProxyObjects],
	);

	const toggleSidebar = () => {
		setSidebarVisible(!sidebarVisible);
	};

	const goToPrevPage = () => {
		if (pageNumber === undefined) {
			return;
		}

		if (pageNumber > 1) {
			goToPage(pageNumber - 1);
		}
	};

	const goToNextPage = () => {
		if (pageNumber === undefined || numPages === undefined) {
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

		let mostVisiblePageIndex = pageNumber !== undefined ? pageNumber - 1 : 0;
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
		DOMRect[]
	>([]);
	const [boxesRedacted, setBoxesRedacted] = useState<DOMRect[]>([]);

	useEffect(() => {
		if (textRedactorSelected) {
			console.log("Installing selection handler");

			const selectionHandler = () => {
				const selection = document.getSelection();
				if (selection === null) {
					return;
				}

				let currentBoxes: Array<DOMRect | null> = [];
				if (selection.type !== "Range") {
					setBoxesMarkedForRedaction([]);
					return;
				}

				console.log("selection", selection);

				console.log("rangeCount", selection.rangeCount);

				for (
					let rangeIndex = 0;
					rangeIndex < selection.rangeCount;
					rangeIndex++
				) {
					const range = selection.getRangeAt(rangeIndex);

					const clientRects = range.getClientRects();
					currentBoxes.push(...clientRects);
				}

				for (
					let rectIndex = 0;
					rectIndex < currentBoxes.length - 1;
					rectIndex++
				) {
					if (
						areDOMRectsMergable(
							currentBoxes[rectIndex] as DOMRect,
							currentBoxes[rectIndex + 1] as DOMRect,
						)
					) {
						currentBoxes.splice(
							rectIndex,
							2,
							null,
							mergeDOMRects(
								currentBoxes[rectIndex] as DOMRect,
								currentBoxes[rectIndex + 1] as DOMRect,
							),
						);
					}
				}

				const viewportRect =
					viewport.current?.getBoundingClientRect() ?? DOMRect.fromRect();

				currentBoxes = currentBoxes
					.filter((rect) => rect !== null)
					.map((rect) => {
						const adjustedRect = DOMRect.fromRect(rect ?? undefined);

						adjustedRect.y =
							adjustedRect.y -
							viewportRect.y +
							(viewport.current?.scrollTop ?? 0);
						adjustedRect.x =
							adjustedRect.x -
							viewportRect.x +
							(viewport.current?.scrollLeft ?? 0);

						return adjustedRect;
					});

				setBoxesMarkedForRedaction(currentBoxes as DOMRect[]);
				console.log(currentBoxes);
			};

			document.addEventListener("selectionchange", selectionHandler);

			return () => {
				console.log("Uninstallating selection handler");
				document.removeEventListener("selectionchange", selectionHandler);
			};
		} else {
			setBoxesMarkedForRedaction([]);
		}
	}, [textRedactorSelected]);

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
						disabled={pageNumber === null || pageNumber === 1}
					/>
					<ToolbarItem.NextPage
						onClick={goToNextPage}
						disabled={pageNumber === null || pageNumber === numPages}
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
							pageNumber !== undefined
								? (pageProxyObjects[pageNumber - 1] as PageProxyWithWidthHeight)
								: undefined
						}
						onChange={(scale) => {
							setTextRedactorSelected(false);
							setPageScaleOptions(scale);
						}}
					/>
					<ToolbarItem.Spacer />
					<ToolbarItem.ApplyRedactions
						onClick={() => {
							setBoxesRedacted([...boxesRedacted, ...boxesMarkedForRedaction]);
							setBoxesMarkedForRedaction([]);
						}}
						disabled={
							!textRedactorSelected || boxesMarkedForRedaction.length === 0
						}
					/>
					<ToolbarItem.TextRedactor
						onClick={() => setTextRedactorSelected(!textRedactorSelected)}
						selected={textRedactorSelected}
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
								/>
							))}
						</div>
						<div className={styles.markedForRedactionContainer}>
							{boxesMarkedForRedaction.map((rect, i) => {
								const top = rect.top;
								const left = rect.left;
								const width = rect.width;
								const height = rect.height;

								return (
									<div
										key={`selection_${i}`}
										className={styles.markedForRedaction}
										style={{
											top: `${top}px`,
											left: `${left}px`,
											width: `${width}px`,
											height: `${height}px`,
										}}
									/>
								);
							})}
						</div>
						<div className={styles.redactedContainer}>
							{boxesRedacted.map((rect, i) => {
								const top = rect.top;
								const left = rect.left;
								const width = rect.width;
								const height = rect.height;

								return (
									<div
										key={`selection_${i}`}
										className={styles.redacted}
										style={{
											top: `${top}px`,
											left: `${left}px`,
											width: `${width}px`,
											height: `${height}px`,
										}}
									/>
								);
							})}
						</div>
					</div>
				</div>
			</Document>
		</>
	);
}

export default PdfRedactor;
