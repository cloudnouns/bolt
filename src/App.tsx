import { Factory } from './package/factory/factory';
import { Trait } from './package/curator/trait';
import Flamingo from './data/mock-trait';
import NounsData from './data/nouns.json';

const nounFactory = new Factory(NounsData);

function App() {
	const trait = new Trait({
		name: 'flamingo',
		layer: 'heads',
		colorMatrix: Flamingo,
	});

	trait.setPixelColorAt({ x: 31, y: 0, color: '#ddccff' });

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="flex flex-col items-start max-w-md gap-3">
				<div>
					<p>Name: {trait.name}</p>
					<p>Layer: {trait.layer}</p>
					<p>Filename: {trait.filename}</p>
				</div>

				<div className="flex gap-2">
					<div className="border flex-grow-0">
						{trait.colorMatrix.map((row, i) => {
							return (
								<div className="flex" key={i}>
									{row.map((color, i) => {
										return (
											<div
												className="h-3 aspect-square"
												style={{ backgroundColor: color }}
												key={i}
											></div>
										);
									})}
								</div>
							);
						})}
					</div>

					<img src={trait.preview} alt="" />
					<img src={nounFactory.createItem({}).dataUrl} alt="" />
				</div>

				<div className="flex flex-wrap">
					<p>Palette: {trait.palette.join(', ')}</p>
				</div>
			</div>
		</div>
	);
}

export default App;
