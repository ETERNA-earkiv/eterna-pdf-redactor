import {
	ChangeEvent,
	RefObject,
	createRef,
	useCallback,
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

function PdfRedactor(props: PdfRedactorProps) {
	const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
	const [numPages, setNumPages] = useState<number>();
	const [pageNumber, setPageNumber] = useState<number>();

	const pageProxyObjects: Array<PDFPageProxy | undefined> = useMemo(
		() => Array.from({ length: numPages ?? 0 }, (_) => undefined),
		[numPages],
	);

	const pageElementRefs: RefObject<HTMLDivElement>[] = useMemo(
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

	const viewport = useRef<HTMLDivElement>(null);

	const onPageClick = useCallback(
		(
			event: React.MouseEvent<HTMLDivElement>,
			page: PDFPageProxy | false | undefined,
		) => console.log("Clicked a page", { event, page }),
		[],
	);

	const goToPage = useCallback(
		(pageNumber: number) => {
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
			pageProxyObjects[pdfPage._pageIndex] = pdfPage;
		},
		[pageProxyObjects],
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

	return (
		<>
			<Document
				className={styles.document}
				file={props.document}
				options={options}
				onItemClick={onItemClick}
				onLoadSuccess={onDocumentLoadSuccess}
			>
				<Toolbar className={styles.toolbar} iconSize="18">
					<ToolbarItem.SidebarToggle onClick={toggleSidebar} />
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
						onChange={(scale) => setPageScaleOptions(scale)}
					/>
					<ToolbarItem.Spacer />
				</Toolbar>
				<div
					className={clsx(
						styles.workarea,
						sidebarVisible && styles.sidebarVisible,
					)}
				>
					<aside className={styles.sidebar}>
						{Array.from(new Array(numPages), (_, index) => (
							<div
								key={`thumbnail_${index + 1}`}
								className={clsx(
									styles.thumbnailContainer,
									index + 1 === pageNumber && styles.active,
								)}
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
					<div ref={viewport} className={styles.viewport}>
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
					</div>
				</div>
			</Document>
		</>
	);
}

export default PdfRedactor;
