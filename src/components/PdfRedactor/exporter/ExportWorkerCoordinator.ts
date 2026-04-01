import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ExportWorkerMessage } from "./types/ExportWorkerMessage";
import type { ExportWorkerResponse } from "./types/ExportWorkerResponse";
import type { ExportedXObjects } from "./types/ExportedXObjects";
import { exportPdfAsync } from "./exportPdfAsync";
import { PDFDocument } from "pdf-lib";
import appendExportedPage from "./appendExportedPage";

import exportWorkerUrl from "./export-worker?worker&url";

export type ExportProgressEvent = CustomEvent<{
	numberOfPagesExported: number;
	totalNumberOfPages: number;
}>;

const currentDir = ".";
const prefixedWorkerUrl =
	import.meta.env.MODE === "development"
		? new URL(exportWorkerUrl, location.origin)
		: new URL(`${currentDir}${exportWorkerUrl}`, import.meta.url);

export default class ExportWorkerCoordinator extends EventTarget {
	private workers: Worker[] = [];
	private workerIndex = 0;

	private _numberOfWorkers: number;

	public get numberOfWorkers() {
		return this._numberOfWorkers;
	}

	private pageNumberResolverMap = new Map<
		number,
		(value: ExportedXObjects | PromiseLike<ExportedXObjects>) => void
	>();
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private pageNumberRejectMap = new Map<number, (reason?: any) => void>();

	private workerResolverMap = new Map<Worker, (value: unknown) => void>();
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private workerRejectMap = new Map<Worker, (reason?: any) => void>();

	private messageListener = (e: MessageEvent<ExportWorkerResponse>) => {
		if (e.data.type === "exportPage") {
			const pageNumber = e.data.params.pageNumber;
			const resolve = this.pageNumberResolverMap.get(pageNumber);
			if (resolve !== undefined) {
				resolve(e.data.params);
			}
		}
	};

	private documentBytes = new Uint8Array(0);

	constructor(numberOfWorkers = navigator.hardwareConcurrency || 4) {
		super();
		this._numberOfWorkers = numberOfWorkers;
		this.workers = Array.from({ length: numberOfWorkers }, () =>
			this.createWorker(),
		);
	}

	private createWorker() {
		const worker = new Worker(prefixedWorkerUrl, { type: "module" });
		worker.addEventListener("message", this.messageListener);
		worker.addEventListener(
			"message",
			(e: MessageEvent<ExportWorkerResponse>) => {
				if (e.data.type === "loadDocument") {
					const resolve = this.workerResolverMap.get(worker);
					if (resolve !== undefined) {
						resolve(null);
					}
				}
			},
		);

		return worker;
	}

	private removeWorker(worker: Worker) {
		this.workerResolverMap.delete(worker);
		this.workerRejectMap.delete(worker);
		worker.terminate();
	}

	private setupWorker(worker: Worker) {
		const promise = new Promise((resolve, reject) => {
			this.workerResolverMap.set(worker, resolve);
			this.workerRejectMap.set(worker, reject);
		}).then(() => {});

		if (this.documentBytes.byteLength === 0) {
			return Promise.resolve(undefined).then(() => {});
		}

		let bytes: Uint8Array | undefined = new Uint8Array(this.documentBytes);

		worker.postMessage(
			<ExportWorkerMessage>{
				type: "loadDocument",
				params: { buffer: bytes },
			},
			[bytes.buffer],
		);

		bytes = undefined;

		return promise;
	}

	public setNumberOfWorkers(numberOfWorkers: number) {
		if (numberOfWorkers > this._numberOfWorkers) {
			const newWorkers: Worker[] = Array.from(
				{ length: numberOfWorkers - this._numberOfWorkers },
				() => this.createWorker(),
			);

			this.workers.push(...newWorkers);
			this._numberOfWorkers = numberOfWorkers;

			if (this.documentBytes.length === 0) {
				return Promise.resolve(undefined).then(() => {});
			}

			const workerPromises = newWorkers.map((worker) =>
				this.setupWorker(worker),
			);

			return Promise.all(workerPromises).then(() => {});
			// biome-ignore lint/style/noUselessElse: <explanation>
		} else if (numberOfWorkers < this._numberOfWorkers) {
			for (let i = this._numberOfWorkers - 1; i >= numberOfWorkers; i--) {
				const worker: Worker | undefined = this.workers.pop();
				if (worker) {
					this.removeWorker(worker);
				}
			}

			this._numberOfWorkers = numberOfWorkers;
		}

		return Promise.resolve(undefined).then(() => {});
	}

	public dispose() {
		for (let i = 0; i < this._numberOfWorkers; i++) {
			const worker: Worker | undefined = this.workers.shift();
			if (worker) {
				this.removeWorker(worker);
			}
		}

		this.pageNumberResolverMap.clear();
		this.pageNumberRejectMap.clear();
	}

	public loadDocument(pdfDocumentBytes: Uint8Array) {
		this.documentBytes = new Uint8Array(pdfDocumentBytes);

		const workerPromises = this.workers.map((worker) =>
			this.setupWorker(worker),
		);

		return Promise.all(workerPromises).then(() => {});
	}

	public exportPage(
		pageNumber: number,
		boxes: DOMRect[] | undefined,
		scale: number,
	) {
		const promise = new Promise<ExportedXObjects>((resolve, reject) => {
			this.pageNumberResolverMap.set(pageNumber, resolve);
			this.pageNumberRejectMap.set(pageNumber, reject);

			this.workers[this.workerIndex].postMessage(<ExportWorkerMessage>{
				type: "exportPage",
				params: {
					pageNumber,
					boxes,
					scale,
				},
			});

			this.workerIndex = (this.workerIndex + 1) % this.workers.length;
		});

		return promise;
	}

	public async exportPdf(
		documentProxy: PDFDocumentProxy,
		boxes: DOMRect[][],
		scale: number,
	) {
		if (window.Worker) {
			return await this.exportPdfWithWorkers(this, documentProxy, boxes, scale);
		}
		return await exportPdfAsync(documentProxy, boxes, scale);
	}

	private async exportPdfWithWorkers(
		exporter: ExportWorkerCoordinator,
		documentProxy: PDFDocumentProxy,
		boxes: DOMRect[][],
		scale: number,
	) {
		const start = performance.now();

		const e = new CustomEvent("progress", {
			detail: {
				numberOfPagesExported: 0,
				totalNumberOfPages: documentProxy.numPages,
			},
		});
		this.dispatchEvent(e);

		const newDocument = await PDFDocument.create();
		const newPages = Array.from({ length: documentProxy.numPages }, (_) =>
			newDocument.addPage(),
		);

		const exportPagePromises = [];

		for (
			let pageNumber = 1;
			pageNumber <= documentProxy.numPages;
			pageNumber++
		) {
			const exportPagePromise = exporter
				.exportPage(pageNumber, boxes[pageNumber - 1], scale)
				.then((exportedXObjects) =>
					appendExportedPage(
						exportedXObjects,
						newDocument,
						newPages[exportedXObjects.pageNumber - 1],
					),
				);

			exportPagePromises.push(exportPagePromise);
		}

		const exportPageProgressPromises = new Map(
			exportPagePromises.map((promise, index) => [index, promise]),
		);

		for (let i = 0; i < documentProxy.numPages; i++) {
			const exportedPage = await Promise.any(
				exportPageProgressPromises.values(),
			);

			if (exportedPage === undefined) {
				return;
			}

			const e = new CustomEvent("progress", <ExportProgressEvent>{
				detail: {
					numberOfPagesExported: i + 1,
					totalNumberOfPages: documentProxy.numPages,
				},
			});
			this.dispatchEvent(e);

			const pageIndex = exportedPage.pageNumber - 1;
			exportPageProgressPromises.delete(pageIndex);
		}

		console.log(`exportPdf took ${performance.now() - start}ms`);

		return newDocument;
	}
}
