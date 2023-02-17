import { z } from 'zod';
import NounsDataTs from '../../data/nouns.js';
import NounsData from '../../data/nouns.json' assert { type: 'json' };
import { Prettify } from '../curator/types';

const ColorSchema = z.union([
	z.string().startsWith('#').length(7),
	z.string().regex(/^transparent$/),
	z.string().max(0),
]);

const EncodedImageSchema = z.object({
	filename: z.string().min(1),
	data: z.string().startsWith('0x'),
});

export const zConfigFile = z.object({
	bgColors: ColorSchema.array(),
	palette: ColorSchema.array(),
	images: z.object({}).catchall(EncodedImageSchema.array()),
});

const Viewbox = z.number().array().length(4);

type EncodedImage = { readonly filename: string; readonly data: string };

type ConfigFile = {
	bgColors: readonly string[];
	palette: readonly string[];
	images: Record<string, readonly EncodedImage[]>;
};

type FactoryOptions = { viewbox?: z.infer<typeof Viewbox> };
type ItemConfig = { size?: number; removeBg?: boolean };

export class Factory<File extends ConfigFile> {
	private _bgColors;
	private _palette;
	private _images;
	private _viewbox;

	constructor(config: File, opts?: FactoryOptions) {
		const { bgColors, palette, images } = zConfigFile.parse(config);
		this._bgColors = bgColors;
		this._palette = palette;
		this._images = images as unknown as {
			[K in keyof File['images']]: EncodedImage[];
		};
		this._viewbox = opts?.viewbox ?? [0, 0, 320, 320];
	}

	public get bgColors() {
		return this._bgColors;
	}

	public get palette() {
		return this._palette;
	}

	public get images() {
		return this._images;
	}

	public get viewbox() {
		return this._viewbox;
	}

	public set viewbox(viewbox: z.infer<typeof Viewbox>) {
		this._viewbox = viewbox;
	}

	public createItem(
		config: Partial<
			Prettify<
				{ readonly background: File['bgColors'][number] } & {
					[T in keyof File['images']]: File['images'][T][number]['filename'];
				} & ItemConfig
			>
		>
	) {}

	public createItemFromSeed(
		config: Prettify<
			{ readonly background: File['bgColors'][number] } & {
				[T in keyof File['images']]: File['images'][T][number]['filename'];
			} & ItemConfig
		>
	) {}
}

const nf = new Factory(NounsDataTs);
const nf2 = new Factory(NounsData);
nf.createItem({ background: '#d5d7e1', body: 'gold', removeBg: true });
