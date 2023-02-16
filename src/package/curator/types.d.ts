export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type HexColor = string;
export type ColorMatrixRow = HexColor[];
export type ColorMatrix = ColorMatrixRow[];
export type ColorCoordinates = { x: number; y: number };
