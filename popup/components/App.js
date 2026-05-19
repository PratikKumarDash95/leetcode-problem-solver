import Header from "./Header";
import SolverForm from "./SolverForm";
import { useState } from "react";

import "../styles/app.scss"

function App() {
	const [settingsOpen, setSettingsOpen] = useState(false);

	return <div className="app">
		<Header onSettingsClick={() => setSettingsOpen((open) => !open)} />
		<SolverForm settingsOpen={settingsOpen} onCloseSettings={() => setSettingsOpen(false)} />
	</div>
}

export default App;
