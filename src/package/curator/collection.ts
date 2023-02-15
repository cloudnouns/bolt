import type { HexColor } from './types';
import { Trait } from './trait';

type CollectionConfig = {
	traits: Trait[];
	bgColors: HexColor[];
};

export class Collection {
	private _bgColors: Set<HexColor>;
	private _traits: Set<Trait>;

	constructor({ traits = [], bgColors = [] }: CollectionConfig) {
		this._traits = new Set(traits);
		this._bgColors = new Set(bgColors);
	}

	public get bgColors() {
		const colors = Array.from(this._bgColors);
		if (!colors.length) return ['transparent'];

		return colors.map((color) => {
			if (!color) color = 'transparent';
			return color;
		});
	}

	public set bgColors(colors: HexColor[]) {
		if (colors && colors.length) {
			if (colors.includes('transparent')) {
				const i = colors.findIndex((c) => c === 'transparent');
				colors[i] = '';
			}
			this._bgColors = new Set(colors);
		} else if (colors && !colors.length) this._bgColors.clear();
	}

	public addBgColor(color: HexColor) {
		if (color === 'transparent') color = '';
		this._bgColors.add(color);
		return this.bgColors;
	}

	public removeBgColor(color: HexColor) {
		if (color === 'transparent') color = '';
		this._bgColors.delete(color);
		return this.bgColors;
	}

	public get traits() {
		return Array.from(this._traits);
	}

	public addTrait(trait: Trait) {
		this._traits.add(trait);
		return this.traits;
	}

	public getTrait(filename: string) {
		return this.traits.find((t) => t.filename === filename);
	}

	public updateTrait(filename: string, trait: Trait) {
		const traits = [...this.traits];
		const index = traits.findIndex((t) => t.filename === filename);
		if (index >= 0) {
			traits[index] = trait;
			this._traits = new Set(traits);
			return this.traits;
		}
	}

	public removeTrait(filename: string) {
		const traits = [...this.traits];
		const index = traits.findIndex((t) => t.filename === filename);
		if (index >= 0) {
			const filtered = traits.filter((t) => t.filename !== filename);
			this._traits = new Set(filtered);
			return this.traits;
		}
	}

	public get layers() {
		const layerSet = new Set(this.traits.map((t) => t.layer));
		return Array.from(layerSet);
	}

	public reorderLayers(order: string[]) {
		const layers = this.layers;
		const extraLayers = order.filter((layer) => !layers.includes(layer));
		const missingLayers = layers.filter((layer) => !order.includes(layer));

		if (extraLayers.length) {
			throw new Error(`Extra layers included: [${extraLayers.join(', ')}]`);
		} else if (missingLayers.length) {
			throw new Error(`Missing layers: [${missingLayers.join(', ')}]`);
		} else {
			this._traits = new Set(
				order
					.map((layer) => {
						return this.traits.filter((t) => t.layer === layer);
					})
					.flat()
			);
			return this.layers;
		}
	}

	public get palette() {
		const colors = new Set(this.traits.flatMap((t) => t.palette));
		return ['', ...colors];
	}

	// todo: implement encodeTrait, config, and Collection.fromConfig
}
