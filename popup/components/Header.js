import Settings from "./icons/Settings"

import "../styles/header.scss";

function Header({ onSettingsClick }) {
	return <div className="header flex align-center justify-between">
		<h1>Leetcode Solver</h1>
		<button className="settings__button" type="button" onClick={onSettingsClick} title="Settings">
			<Settings classes="settings__icon" />
		</button>
	</div>
}

export default Header;
