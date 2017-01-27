
export interface Annotation {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    byteRange: [number, number];
    message: string;
}

export interface BananaReport {
    errors: Annotation[];
    warnings: Annotation[];
}
