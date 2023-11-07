import { ChangeEvent, useCallback, useState } from "react";
import { Document, Page, Outline, Thumbnail, pdfjs } from "react-pdf";
import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { IconContext } from "react-icons";
import { FiSidebar, FiChevronUp, FiChevronDown } from "react-icons/fi";
import clsx from "clsx";

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

function PdfRedactor(props: PdfRedactorProps) {
	const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
	const [numPages, setNumPages] = useState<number>();
	const [pageNumber, setPageNumber] = useState<number>();

	const onPageClick = useCallback(
		(
			event: React.MouseEvent<HTMLDivElement>,
			page: PDFPageProxy | false | undefined,
		) => console.log("Clicked a page", { event, page }),
		[],
	);

	const onItemClick = useCallback((args: { pageNumber: number }) => {
		setPageNumber(args.pageNumber);
	}, []);

	const onDocumentLoadSuccess = useCallback((pdfDocument: PDFDocumentProxy) => {
		setNumPages(pdfDocument.numPages);
		setPageNumber(1);
	}, []);

	const toggleSidebar = () => {
		setSidebarVisible(!sidebarVisible);
	};

	const goToPrevPage = () => {
		if (pageNumber === undefined) {
			return;
		}

		if (pageNumber > 1) {
			setPageNumber(pageNumber - 1);
		}
	};

	const goToNextPage = () => {
		if (pageNumber === undefined || numPages === undefined) {
			return;
		}

		if (pageNumber < numPages) {
			setPageNumber(pageNumber + 1);
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
				<div className={styles.toolbar}>
					<IconContext.Provider value={{ className: styles.icon, size: "18" }}>
						<button type="button" onClick={toggleSidebar}>
							<FiSidebar />
						</button>
						<button type="button" onClick={goToPrevPage}>
							<FiChevronUp />
						</button>
						<button type="button" onClick={goToNextPage}>
							<FiChevronDown />
						</button>
						<input
							type="text"
							value={pageNumber || 0}
							inputMode="numeric"
							pattern="d*"
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								setPageNumber(parseInt(e.target.value, 10))
							}
						/>
						<span>av {numPages}</span>
					</IconContext.Provider>
				</div>
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
					<div className={styles.viewport}>
						<Page className={styles.page} pageNumber={pageNumber} />
					</div>
				</div>
			</Document>
		</>
	);
}

export default PdfRedactor;
