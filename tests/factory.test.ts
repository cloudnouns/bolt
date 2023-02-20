import { describe, it, expect } from 'vitest';
import { Factory } from '../src/package/factory';
import NounsData from '../src/data/nouns';

const factory = new Factory(NounsData);

describe('Factory', () => {
	it('should do something', () => {
		const noun = factory.createItem({ glasses: 'fullblack' });
		expect(noun.seed.glasses).toEqual(7);

		const noun2 = factory.createItemFromSeed({
			background: -99,
			body: -99,
			accessory: -99,
			head: -99,
			glasses: -99,
		});
		expect(noun2.background).toEqual('transparent');
		expect(noun2.glasses).toEqual('intentionally-blank');
	});
});
