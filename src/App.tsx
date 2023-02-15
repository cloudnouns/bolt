import { useState } from 'react';

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="App">
			<p>{count}</p>
			<button onClick={() => setCount(count + 1)}>+</button>
			<button onClick={() => setCount(count - 1)}>-</button>
		</div>
	);
}

export default App;
