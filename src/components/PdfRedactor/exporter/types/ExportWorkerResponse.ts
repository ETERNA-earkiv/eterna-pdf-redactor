import { ExportedXObjects } from "./ExportedXObjects";

type SetBufferResponse = {
	type: "loadDocument";
};

type ExportPageResponse = {
	type: "exportPage";
	params: ExportedXObjects;
};

export type ExportWorkerResponse = SetBufferResponse | ExportPageResponse;
