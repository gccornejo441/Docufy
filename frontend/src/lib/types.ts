export interface WordBox {
x: number; y: number; w: number; h: number; text: string; conf?: number;
}
export interface WordsPerPage {
page: number; words: WordBox[];
}
export interface ExtractResponse {
filename?: string;
text: string;
words: WordsPerPage[];
metadata?: Record<string, unknown>;
}