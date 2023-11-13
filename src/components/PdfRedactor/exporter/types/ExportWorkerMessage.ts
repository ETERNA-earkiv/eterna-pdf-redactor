export type SetBufferMessage = {
    type: "loadDocument";
    params: {
        buffer: Uint8Array;
    };
};

export type ExportPageMessage = {
    type: "exportPage";
    params: {
        pageNumber: number;
        boxes: DOMRect[] | undefined;
        scale: number;
    };
};

export type ExportWorkerMessage = SetBufferMessage | ExportPageMessage;
