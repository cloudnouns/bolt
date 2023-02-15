import type { ColorMatrix } from './types';

export const createMatrix = (n = 32): ColorMatrix => {
	const matrix = [];

	for (let i = 0; i < n; i++) {
		const row = [];
		for (let j = 0; j < n; j++) {
			row.push('');
		}
		matrix.push(row);
	}

	return matrix;
};
