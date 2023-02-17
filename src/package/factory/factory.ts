import type { Prettify } from '../curator/types';
import { z } from 'zod';
import { BigNumber, type BigNumberish } from '@ethersproject/bignumber';
import { keccak256 } from '@ethersproject/solidity';
import { buildSVG } from './builder.js';

// author ens
const BLOCKHASH =
	'0xb7b854ef54ed2fee21bf30a27eae35b7d90101ed416c41f8cb68394d64fefdfb';

const zHexColor = z.union([
	z.string().startsWith('#').length(7),
	z.literal('transparent'),
	z.string().max(0),
]);

const zEncodedPart = z.object({
	filename: z.string().min(1),
	data: z.string().startsWith('0x'),
});

const zConfigFile = z.object({
	bgColors: zHexColor.array().nonempty(),
	palette: zHexColor.array().nonempty(),
	parts: z.object({}).catchall(zEncodedPart.array().nonempty()),
});

const zViewbox = z.number().array().length(4);
type Viewbox = z.infer<typeof zViewbox>;

type EncodedPart = { readonly filename: string; readonly data: string };

type ConfigFile = {
	bgColors: readonly string[];
	palette: readonly string[];
	parts: Record<string, readonly EncodedPart[]>;
};

type NamedBgColor<File extends ConfigFile> = {
	readonly background: File['bgColors'][number];
};

type NamedParts<File extends ConfigFile> = {
	[Part in keyof File['parts']]: File['parts'][Part][number]['filename'];
};

type NamedSeed<File extends ConfigFile> = Prettify<
	NamedBgColor<File> & NamedParts<File>
>;

type Seed<File extends ConfigFile> = Prettify<
	{ [Color in keyof NamedBgColor<File>]: number } & {
		[Part in keyof NamedParts<File>]: number;
	}
>;

type NamedSeedItemConfig<File extends ConfigFile> = Prettify<
	NamedSeed<File> & ItemConfig
>;

type ItemConfig = { size?: number; removeBg?: boolean };

export class Factory<File extends ConfigFile> {
	private _bgColors;
	private _palette;
	private _parts;
	private _viewbox;

	constructor(config: File, opts?: { viewbox?: Viewbox }) {
		const { bgColors, palette, parts } = zConfigFile.parse(config);
		this._bgColors = bgColors;
		this._palette = palette;
		this._parts = parts as unknown as {
			[T in keyof File['parts']]: readonly EncodedPart[];
		};
		this._viewbox = opts?.viewbox ?? [0, 0, 320, 320];
	}

	public get bgColors() {
		return this._bgColors;
	}

	public get palette() {
		return this._palette;
	}

	public get parts() {
		return this._parts;
	}

	public get viewbox() {
		return this._viewbox;
	}

	public set viewbox(viewbox: Viewbox) {
		this._viewbox = zViewbox.parse(viewbox);
	}

	public createItem(config: Partial<NamedSeedItemConfig<File>> = {}) {
		const namedSeed: Partial<NamedSeed<File>> = {};
		const keys = this.utils.getSeedKeys();

		for (const key of Object.keys(config)) {
			// @ts-expect-error issue with index sigs on partials, idk...
			if (keys.includes(key)) namedSeed[key] = config[key];
		}

		const seed = this.utils.namedSeedToSeed(namedSeed);
		return this.buildItem(seed, config);
	}

	public createItemFromSeed(seed: Seed<File>, opts: ItemConfig = {}) {
		return this.buildItem(seed, opts);
	}

	private buildItem(seed: Seed<File>, config: ItemConfig) {
		const _seed = this.utils.validateSeed(seed);
		const { background, parts } = this.itemParts(_seed, config.removeBg);

		const svg = buildSVG({
			parts,
			background,
			size: config.size,
			palette: this.palette,
			viewbox: this.viewbox,
		});

		return {
			...this.utils.seedToNamedSeed(seed),
			seed,
			dataUrl: 'data:image/svg+xml;base64,' + btoa(svg),
		};
	}

	private itemParts(seed: Seed<File>, removeBg?: boolean) {
		// get background color
		let background;
		if (seed.background === -99 || removeBg) background = 'transparent';
		else background = this.bgColors[seed.background];

		// get part data
		const parts = Object.keys(this.parts).map((part) => {
			if (seed[part] === -99) return { data: '0x0000000000' };
			return this.parts[part][seed[part]];
		});

		//
		return { background, parts };
	}

	utils = {
		getBackgroundIdByColor: (color: File['bgColors'][number]) => {
			const count = this.bgColors.length;
			const id = this.bgColors.findIndex((c) => color === c);

			// validate id
			const result = z.number().nonnegative().lt(count).safeParse(id);
			if (!result.success) {
				throw new Error(`invalid_background_color: ${color}`);
			}

			return id;
		},

		getPartIdByName: <Part extends keyof File['parts']>(
			part: Part,
			partName: File['parts'][Part][number]['filename']
		) => {
			const count = this.parts[part].length;
			const id = this.parts[part].findIndex((part) => {
				return partName === part.filename;
			});

			// validate id
			const result = z.number().nonnegative().lt(count).safeParse(id);
			if (!result.success) {
				throw new Error(`invalid_part: { ${String(part)}: "${partName}" }`);
			}

			return id;
		},

		getSeedKeys: () => ['background', ...Object.keys(this.parts)],

		getRandomSeed: (): Seed<File> => {
			const _seed: any = {};

			// get id for random background color
			const background = Math.floor(Math.random() * this.bgColors.length);

			// get ids for random parts
			for (const [part, items] of Object.entries(this.parts)) {
				_seed[part] = Math.floor(Math.random() * items.length);
			}

			return { background, ..._seed };
		},

		getSeedFromBlockhash: (config: {
			id: BigNumberish;
			blockhash?: string;
		}): Seed<File> => {
			const { id, blockhash } = config;
			const types = ['bytes32', 'uint256'];
			const values = [blockhash ?? BLOCKHASH, id];
			const pseudorandomness = keccak256(types, values);

			const _seed = this.utils.getSeedKeys().map((part, i) => {
				let count: number;
				if (part === 'background') count = this.bgColors.length;
				else count = this.parts[part].length;
				return getPseudorandomPart(pseudorandomness, count, i * 48);
			});

			return this.utils.arraySeedToSeed(_seed);
		},

		arraySeedToNamedSeed: (seed: number[]): NamedSeed<File> => {
			const _seed = this.utils.arraySeedToSeed(seed);
			return this.utils.seedToNamedSeed(_seed);
		},

		arraySeedToSeed: (seed: number[]): Seed<File> => {
			const parts = this.utils.getSeedKeys();
			const entries = parts.map((part, i) => [part, seed[i]]);
			return Object.fromEntries(entries);
		},

		namedSeedToArraySeed: (seed: NamedSeed<File>): number[] => {
			const _seed = this.utils.namedSeedToSeed(seed);
			return this.utils.seedToArraySeed(_seed);
		},

		namedSeedToSeed: (
			seed: NamedSeed<File> | Partial<NamedSeed<File>>
		): Seed<File> => {
			const _seed: any = {};
			const providedParts = Object.entries(seed);
			const missingParts = this.utils
				.getSeedKeys()
				.filter((key) => !Object.keys(seed).includes(key));

			for (const [part, value] of providedParts) {
				if (part === 'background') {
					_seed.background = this.utils.getBackgroundIdByColor(value);
				} else {
					_seed[part] = this.utils.getPartIdByName(part, value);
				}
			}

			if (missingParts.length) {
				const random = this.utils.getRandomSeed();
				for (const part of missingParts) _seed[part] = random[part];
			}

			return _seed;
		},

		seedToArraySeed: (seed: Seed<File>): number[] => {
			const parts = this.utils.getSeedKeys();
			return parts.map((part) => seed[part]);
		},

		seedToNamedSeed: (seed: Seed<File>): NamedSeed<File> => {
			const _seed: any = {};

			for (const [part, value] of Object.entries(seed)) {
				if (part === 'background') {
					if (value === -99) _seed.background = 'transparent';
					else _seed.background = this.bgColors[Number(value)];
				} else {
					if (value === -99) _seed[part] = 'intentionally-blank';
					else _seed[part] = this.parts[part][Number(value)].filename;
				}
			}

			return _seed;
		},

		validateSeed: (seed: Seed<File>): Seed<File> => {
			const parts = this.utils.getSeedKeys();

			// check for extra or missing parts
			const providedParts = Object.keys(seed);
			const extraKeys = parts.filter((part) => !providedParts.includes(part));
			const missingKeys = parts.filter((part) => !providedParts.includes(part));

			if (extraKeys.length) {
				throw new Error(`Extra keys included: [${extraKeys.join(', ')}]`);
			} else if (missingKeys.length) {
				throw new Error(`Missing keys: [${missingKeys.join(', ')}]`);
			}

			// validate each part
			for (const [part, id] of Object.entries(seed)) {
				let count;
				if (part === 'background') count = this.bgColors.length;
				else count = this.parts[part].length;

				// validate id
				const result = z
					.union([z.literal(-99), z.number().nonnegative().lt(count)])
					.safeParse(id);
				if (!result.success) {
					throw new Error(`invalid_part: { ${String(part)}: ${id} }`);
				}
			}

			// reorder seed
			const _seed = parts.map((part) => seed[part]);
			return this.utils.arraySeedToSeed(_seed);
		},
	};
}

const getPseudorandomPart = (
	pseudorandomness: string,
	partCount: number,
	shiftAmount: number,
	uintSize: number = 48
): number => {
	const hex = shiftRightAndCast(pseudorandomness, shiftAmount, uintSize);
	return BigNumber.from(hex).mod(partCount).toNumber();
};

const shiftRightAndCast = (
	value: BigNumberish,
	shiftAmount: number,
	uintSize: number
): string => {
	const shifted = BigNumber.from(value).shr(shiftAmount).toHexString();
	return `0x${shifted.substring(shifted.length - uintSize / 4)}`;
};
