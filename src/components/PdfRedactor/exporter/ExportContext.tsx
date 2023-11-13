import {
	MutableRefObject,
	ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFDocument } from "pdf-lib";

import ExportWorkerCoordinator from "./ExportWorkerCoordinator";

export type ExportContextType = {
	exportPdf: () => Promise<PDFDocument | undefined>;
};

type ExportProviderProps = {
	children?: ReactNode;
	contextRef?: React.RefObject<ExportContextType>;
	pdfDocument: PDFDocumentProxy | undefined;
	boxes: DOMRect[][];
	scale: number;
	numberOfWorkers?: number;
	numberOfPages: number;
};

export const ExportContext = createContext<ExportContextType>({
	exportPdf: async () => undefined,
});

export const ExportProvider: React.FC<ExportProviderProps> = ({
	children,
	contextRef,
	pdfDocument,
	boxes,
	numberOfWorkers = navigator.hardwareConcurrency || 4,
	numberOfPages = 0,
}) => {
	const [workersReady, setWorkersReady] = useState<boolean>(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const exportWorkerCoordinator = useMemo(() => {
		return new ExportWorkerCoordinator(
			Math.min(numberOfWorkers, numberOfPages),
		);
	}, []);


	const exportPdf = useMemo(() => {
		return async () => {
			if (pdfDocument !== undefined && workersReady === true) {
				return await exportWorkerCoordinator.exportPdf(pdfDocument, boxes, 3);
			}
		};
	}, [exportWorkerCoordinator, workersReady, pdfDocument, boxes]);

	useEffect(() => {
		setWorkersReady(false);

		if (pdfDocument === undefined) {
			return;
		}

		const loadDocument = async () => {
			const pdfData = await pdfDocument.getData();
			return exportWorkerCoordinator.loadDocument(pdfData);
		};

		loadDocument().then(() => {
			setWorkersReady(true);
		});
	}, [exportWorkerCoordinator, pdfDocument]);

	useEffect(() => {
		const newNumberOfWorkers = Math.min(numberOfWorkers, numberOfPages);

		if (exportWorkerCoordinator.numberOfWorkers !== newNumberOfWorkers) {
			exportWorkerCoordinator.setNumberOfWorkers(newNumberOfWorkers);
		}
	}, [exportWorkerCoordinator, numberOfWorkers, numberOfPages]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		return () => {
			exportWorkerCoordinator.dispose();
		};
	}, []);

	const value = { exportPdf };

	if (contextRef !== undefined) {
		(contextRef as MutableRefObject<ExportContextType>).current = value;
	}

	return (
		<ExportContext.Provider value={value}>{children}</ExportContext.Provider>
	);
};

export default ExportContext;
export const useExport = () => useContext(ExportContext);
