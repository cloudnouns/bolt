import type {
	ColorCoordinates,
	ColorMatrix,
	HexColor,
	Prettify,
} from './types';
import { colord } from 'colord';
import { createMatrix } from './utils';
import { RLEImage } from './encoder';
import { Factory } from '../factory/factory';

type TraitConfig = {
	name: string;
	layer: string;
	colorMatrix?: ColorMatrix;
};

export class Trait {
	private _name: string;
	private _layer: string;
	private _matrix: ColorMatrix;

	constructor({ name, layer, colorMatrix = createMatrix() }: TraitConfig) {
		this._name = name.trim();
		this._layer = layer.trim();
		this._matrix = colorMatrix;
	}

	public get name() {
		return this._name;
	}

	public set name(name: string) {
		this._name = name.trim();
	}

	public get layer() {
		return this._layer;
	}

	public set layer(layer: string) {
		this._layer = layer.trim().toLowerCase().replaceAll(' ', '-');
	}

	public get filename() {
		const name = this.name.toLowerCase().replaceAll(' ', '-');
		return [this.layer, name].join('-');
	}

	public get colorMatrix() {
		return this._matrix;
	}

	public set colorMatrix(matrix: ColorMatrix) {
		this._matrix = matrix;
	}

	public get palette() {
		const colors = this.colorMatrix.flat().filter((color) => color);
		return Array.from(new Set(colors));
	}

	public get shape() {
		return {
			height: this.colorMatrix.length,
			width: Math.max(...this.colorMatrix.map((row) => row.length)),
		};
	}

	public getPixelColorAt(opts: ColorCoordinates) {
		const { x, y } = opts;
		return this.colorMatrix[y][x] || 'transparent';
	}

	public setPixelColorAt(
		opts: Prettify<ColorCoordinates & { color: HexColor }>
	) {
		const { x, y, color } = opts;
		if (!color) this.colorMatrix[y][x] = '';
		else this.colorMatrix[y][x] = color;
	}

	public get preview() {
		const colorMap = new Map();
		const palette = ['', ...this.palette];
		palette.map((color, i) => colorMap.set(color, i));

		const getColor = (coords: ColorCoordinates) => {
			const color = this.getPixelColorAt(coords);
			if (color === 'transparent') return colord(color).alpha(0).toRgb();
			return colord(color).toRgb();
		};

		const encodedImage = new RLEImage({
			width: this.shape.width,
			height: this.shape.height,
			colorFn: getColor,
		}).toRLE(colorMap);

		const previewConfig = {
			bgColors: ['transparent'],
			palette,
			parts: {
				preview: [{ filename: 'preview', data: encodedImage }],
			},
		};

		const factory = new Factory(previewConfig);
		const item = factory.createItem();

		return item.dataUrl;
	}
}
