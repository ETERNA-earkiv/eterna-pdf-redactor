import {
	type MutableRefObject,
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress, {
	linearProgressClasses,
} from "@mui/material/LinearProgress";

import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFDocument } from "pdf-lib";

import ExportWorkerCoordinator, {
	type ExportProgressEvent,
} from "./ExportWorkerCoordinator";

const SAVE_TIMEOUT_MS = 30_000;

export type ExportContextType = {
	exportPdf: () => Promise<PDFDocument | undefined>;
	confirmExport: () => void;
};

type ExportProviderProps = {
	children?: ReactNode;
	contextRef?: React.RefObject<ExportContextType | null>;
	pdfDocument: PDFDocumentProxy | undefined;
	boxes: DOMRect[][];
	scale: number;
	numberOfWorkers?: number;
	numberOfPages: number;
	onProgress?: (e: ExportProgressEvent) => void;
};

export const ExportContext = createContext<ExportContextType>({
	exportPdf: async () => undefined,
	confirmExport: () => undefined,
});

export const ExportProvider: React.FC<ExportProviderProps> = ({
	children,
	contextRef,
	pdfDocument,
	boxes,
	numberOfWorkers = navigator.hardwareConcurrency || 4,
	numberOfPages = 0,
	onProgress,
}) => {
	const [workersReady, setWorkersReady] = useState<boolean>(false);
	const [exportStarted, setExportStarted] = useState<boolean>(false);
	const [exportDone, setExportDone] = useState<boolean>(false);
	const [uploadFailed, setUploadFailed] = useState<boolean>(false);
	const [exportTotalPages, setExportTotalPages] = useState<
		number | undefined
	>();
	const [exportedPages, setExportedPages] = useState<number | undefined>();
	const [suffixInput, setSuffixInput] = useState<string>("");
	const [suffixError, setSuffixError] = useState<string>("");
	const [suffixConflict, setSuffixConflict] = useState<boolean>(false);

	const SUFFIX_PATTERN = /^[a-zA-Z0-9\-_åäöÅÄÖ]*$/;

	const validateSuffix = (value: string): string => {
		if (value.length > 0 && !SUFFIX_PATTERN.test(value)) {
			return "Ogiltiga tecken — använd bokstäver, siffror, - eller _";
		}
		return "";
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const exportWorkerCoordinator = useMemo(() => {
		return new ExportWorkerCoordinator(
			Math.min(numberOfWorkers, numberOfPages),
		);
	}, []);

	useEffect(() => {
		setWorkersReady(false);

		if (pdfDocument === undefined) {
			return;
		}

		setExportTotalPages(pdfDocument.numPages);

		const loadDocument = async () => {
			const pdfData = await pdfDocument.getData();
			return exportWorkerCoordinator.loadDocument(pdfData);
		};

		loadDocument().then(() => {
			setWorkersReady(true);
		}).catch((err) => {
			console.error("[ExportContext] loadDocument failed, workers not ready:", err);
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
		const progressListener = (e: ExportProgressEvent) => {
			setExportedPages(e.detail.numberOfPagesExported);

			if (onProgress !== undefined) {
				onProgress(e);
			}
		};

		// TODO: Create strongly typed EventTarget
		// See: https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658
		exportWorkerCoordinator.addEventListener(
			"progress",
			progressListener as unknown as EventListener,
		);

		return () => {
			exportWorkerCoordinator.removeEventListener(
				"progress",
				progressListener as unknown as EventListener,
			);
			exportWorkerCoordinator.dispose();
		};
	}, []);

	const exportPdf = useMemo(() => {
		return async () => {
			if (pdfDocument !== undefined && workersReady === true) {
				return await exportWorkerCoordinator.exportPdf(pdfDocument, boxes, 3);
			}
		};
	}, [exportWorkerCoordinator, workersReady, pdfDocument, boxes]);

	const confirmExport = () => {
		handleClickOpen();
	};

	const [open, setOpen] = useState(false);

	const handleClickOpen = () => {
		setExportStarted(false);
		setExportDone(false);
		setUploadFailed(false);
		setExportedPages(undefined);
		setSuffixInput("");
		setSuffixError("");
		setSuffixConflict(false);
		setOpen(true);
	};

	const onClose = () => {
		if (!exportStarted || exportDone || uploadFailed) {
			setOpen(false);
		}
	};

	const isSaveSuccessful = (result: unknown): boolean => {
		// void/undefined is treated as success — AbortSignal handles hung callbacks.
		if (result === undefined || result === null) {
			return true;
		}

		if (typeof result === "boolean") {
			return result;
		}

		// Accept common HTTP-like responses for host integrations that return fetch/axios data.
		if (result !== null && typeof result === "object") {
			if ("ok" in result && typeof result.ok === "boolean") {
				return result.ok;
			}
			if ("success" in result && typeof result.success === "boolean") {
				return result.success;
			}
			if ("status" in result && typeof result.status === "number") {
				return result.status >= 200 && result.status < 300;
			}
		}

		return false;
	};

	const startExport = async () => {
		const validationError = validateSuffix(suffixInput);
		if (validationError) {
			setSuffixError(validationError);
			return;
		}

		setExportedPages(0);
		setExportStarted(true);
		setExportDone(false);
		setUploadFailed(false);
		setSuffixConflict(false);

		try {
			const exportedPdfDocument = await exportPdf();
			if (exportedPdfDocument === undefined) {
				setUploadFailed(true);
				return;
			}

			const pdfData = new Blob([await exportedPdfDocument.save()]);
			const saveAbortSignal = AbortSignal.timeout(SAVE_TIMEOUT_MS);
			const rawResult = window.PDFRedactor.save(pdfData, saveAbortSignal, suffixInput);
			const saveResult = await new Promise<unknown>((resolve, reject) => {
				const onAbort = () => reject(saveAbortSignal.reason);
				saveAbortSignal.addEventListener("abort", onAbort, { once: true });
				Promise.resolve(rawResult).then(
					(value) => {
						saveAbortSignal.removeEventListener("abort", onAbort);
						resolve(value);
					},
					(reason) => {
						saveAbortSignal.removeEventListener("abort", onAbort);
						reject(reason);
					},
				);
			});

			// Hantera 409 Conflict — visa feltext i dialogen istället för generiskt fel
			if (
				saveResult !== null &&
				typeof saveResult === "object" &&
				"status" in saveResult &&
				typeof (saveResult as { status: unknown }).status === "number" &&
				(saveResult as { status: number }).status === 409
			) {
				setSuffixConflict(true);
				setExportStarted(false);
				return;
			}

			if (isSaveSuccessful(saveResult)) {
				setExportDone(true);
				return;
			}
		} catch (err) {
			console.error("[ExportContext] Export failed:", err);
			setExportStarted(false);
		}

		setUploadFailed(true);
	};

	const value = { exportPdf, confirmExport };

	if (contextRef !== undefined) {
		(contextRef as MutableRefObject<ExportContextType>).current = value;
	}

	const CustomLinearProgress = styled(LinearProgress)(({ theme }) => ({
		height: 10,
		borderRadius: 5,
		[`&.${linearProgressClasses.colorPrimary}`]: {
			backgroundColor: theme.palette.grey[200],
		},
		[`& .${linearProgressClasses.bar}`]: {
			borderRadius: 5,
			backgroundColor: "#1a90ff",
			transition: "100ms",
		},
	}));

	return (
		<ExportContext.Provider value={value}>
			{children}
			<Dialog
				open={open}
				onClose={onClose}
				transitionDuration={250}
				fullWidth={true}
				maxWidth="sm"
				disableEscapeKeyDown={exportStarted && !exportDone}
				//closeOnOverlayClick={!exportStarted}
				//onClose={onClose}
				//isCentered
			>
				<Collapse in={!exportStarted} unmountOnExit>
					<DialogTitle>Spara PDF?</DialogTitle>
					<DialogContent>
						<DialogContentText>
							Vill du spara en maskerad kopia?
						</DialogContentText>
						<TextField
							autoFocus
							margin="dense"
							label="Suffix (valfritt)"
							placeholder="t.ex. sekretess-borttaget"
							helperText={
								suffixConflict
									? "En version med detta namn finns redan — välj ett annat suffix."
									: suffixError || "Lämna tomt för automatisk tidsstämpel."
							}
							error={!!suffixError || suffixConflict}
							fullWidth
							variant="outlined"
							value={suffixInput}
							onChange={(e) => {
								setSuffixInput(e.target.value);
								setSuffixError(validateSuffix(e.target.value));
								setSuffixConflict(false);
							}}
							slotProps={{ htmlInput: { maxLength: 100 } }}
						/>
					</DialogContent>
					<DialogActions>
						<Button
							onClick={startExport}
							variant="contained"
							disabled={!!suffixError}
						>
							Spara
						</Button>
						<Button onClick={onClose}>Avbryt</Button>
					</DialogActions>
				</Collapse>
				<Collapse in={exportStarted} unmountOnExit>
					<DialogTitle>Sparar PDF</DialogTitle>
					<DialogContent>
						{!exportDone && !uploadFailed ? (
							<>
								<DialogContentText>{`Sparar sida ${exportedPages} av ${exportTotalPages}`}</DialogContentText>
							</>
						) : exportDone && !uploadFailed ? (
							<DialogContentText>Export klar!</DialogContentText>
						) : (
							<DialogContentText sx={{ color: "error.main" }}>
								Export misslyckades. Försök igen.
							</DialogContentText>
						)}
						<CustomLinearProgress
							variant="determinate"
							sx={{ visibility: exportDone || uploadFailed ? "hidden" : undefined }}
							value={Math.round(
								((exportedPages ?? 0) / (exportTotalPages ?? 0)) * 100,
							)}
						/>
					</DialogContent>
					<DialogActions>
						<Button
							onClick={onClose}
							variant="contained"
							color={uploadFailed ? "error" : "primary"}
							sx={{ visibility: !exportDone && !uploadFailed ? "hidden" : undefined }}
							disabled={!exportDone && !uploadFailed}
						>
							Stäng
						</Button>
					</DialogActions>
				</Collapse>
			</Dialog>
		</ExportContext.Provider>
	);
};

export default ExportContext;
export const useExport = () => useContext(ExportContext);
