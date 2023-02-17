import type { ColorCoordinates } from './types';

interface RLEImageBounds {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

interface RGBAColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

type EncoderConfig = {
	width: number;
	height: number;
	colorFn: ({ x, y }: ColorCoordinates) => RGBAColor;
};

/**
 * A class used to convert an image into the following RLE format:
 * Palette Index, Bounds [Top (Y), Right (X), Bottom (Y), Left (X)] (4 Bytes), [Pixel Length (1 Byte), Color Index (1 Byte)][].
 *
 * As opposed to the first encoding version, this supports multiline run-length encoding
 */
export class RLEImage {
	private _width: number;
	private _height: number;
	private _bounds: RLEImageBounds = { top: 0, bottom: 0, left: 0, right: 0 };
	public tuples: number[][] = [];
	private _getRgbaAt: ({ x, y }: ColorCoordinates) => RGBAColor;

	constructor({ width, height, colorFn }: EncoderConfig) {
		this._width = width;
		this._height = height;
		this._getRgbaAt = colorFn;
	}

	get height(): number {
		return this._height;
	}

	get width(): number {
		return this._width;
	}

	get bounds(): RLEImageBounds {
		return this._bounds;
	}

	public toRLE(colors: Map<string, number>): string {
		this._bounds = this.calcBounds();

		const indexes: number[] = [];

		for (let y = this.bounds.top; y <= this.bounds.bottom; y++) {
			for (let x = this.bounds.left; x < this.bounds.right; x++) {
				const { r, g, b, a } = this._getRgbaAt({ x, y });
				const hexColor = rgbToHex(r, g, b);

				// Insert the color if it does not yet exist
				if (!colors.has(hexColor)) {
					colors.set(hexColor, colors.size);
				}

				// If alpha is 0, use 'transparent' index, otherwise get color index
				indexes.push(a === 0 ? 0 : colors.get(hexColor)!);
			}
		}

		// [palette_index, top, right, bottom, left]
		const metadata = [
			0,
			this.bounds.top,
			this.bounds.right,
			this.bounds.bottom,
			this.bounds.left,
		].map((v) => toPaddedHex(v));
		return `0x${metadata.join('')}${this.encode(indexes)}`;
	}

	/**
	 * Given a numeric array, return a string of padded hex run-length encoded values
	 * @param data The numeric array to run-length encode
	 */
	private encode(data: number[]) {
		const encoding: string[] = [];
		let previous = data[0];
		let count = 1;

		for (let i = 1; i < data.length; i++) {
			if (data[i] !== previous || count === 255) {
				encoding.push(toPaddedHex(count), toPaddedHex(previous));
				this.tuples.push([count, previous]);
				count = 1;
				previous = data[i];
			} else {
				count++;
			}
		}

		if (previous !== undefined) {
			encoding.push(toPaddedHex(count), toPaddedHex(previous));
		}
		return encoding.join('');
	}

	calcBounds(): RLEImageBounds {
		let bottom = this.height - 1;
		while (bottom > 0 && this._isTransparentRow(bottom)) {
			bottom--;
		}

		let top = 0;
		while (top < bottom && this._isTransparentRow(top)) {
			top++;
		}

		let right = this.width - 1;
		while (right >= 0 && this._isTransparentColumn(right)) {
			right--;
		}

		let left = 0;
		while (left < right && this._isTransparentColumn(left)) {
			left++;
		}

		return {
			top: top,
			bottom: bottom,
			left: left,
			right: right + 1, // right bound is calculated to be one pixel outside the content
		};
	}

	private _isTransparentColumn(column: number) {
		for (let row = 0; row < this.height; row++) {
			if (this._getRgbaAt({ x: column, y: row }).a !== 0) {
				return false;
			}
		}
		return true;
	}

	private _isTransparentRow(row: number) {
		for (let column = 0; column < this.width; column++) {
			if (this._getRgbaAt({ x: column, y: row }).a !== 0) {
				return false;
			}
		}
		return true;
	}
}

/**
 * Convert the provided number to a passed hex string
 * @param c
 * @param pad The desired number of chars in the hex string
 */
const toPaddedHex = (c: number, pad = 2): string => {
	return c.toString(16).padStart(pad, '0');
};

/**
 * Convert an RGB color to hex
 * @param r The red value
 * @param g The green value
 * @param b The blue value
 */
const rgbToHex = (r: number, g: number, b: number): string => {
	return `#${toPaddedHex(r)}${toPaddedHex(g)}${toPaddedHex(b)}`;
};
