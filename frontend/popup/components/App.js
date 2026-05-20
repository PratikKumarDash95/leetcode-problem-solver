import SolverForm from "./SolverForm";

import "../styles/app.scss"

function App() {
	return <div className="app">
		<SolverForm settingsOpen={false} onCloseSettings={() => {}} />
	</div>
}

export default App;
