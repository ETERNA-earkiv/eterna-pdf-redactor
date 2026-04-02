import type { ExportedXObjects } from "./ExportedXObjects";

type SetBufferResponse = {
	type: "loadDocument";
};

type ExportPageResponse = {
	type: "exportPage";
	params: ExportedXObjects;
};

type ErrorPageResponse = {
	type: "errorPage";
	params: { pageNumber: number; message: string };
};

export type ExportWorkerResponse =
	| SetBufferResponse
	| ExportPageResponse
	| ErrorPageResponse;
