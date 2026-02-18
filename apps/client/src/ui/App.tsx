import type { Engine } from "@babylonjs/core/Engines/engine";
import { render } from "solid-js/web";
import type { EngineType } from "../engine/Engine.js";
import { HUD, type HUDState } from "./HUD.jsx";

export function initUI(root: HTMLElement, engine: Engine, engineType: EngineType, state: HUDState) {
	render(() => <HUD engine={engine} engineType={engineType} state={state} />, root);
}
