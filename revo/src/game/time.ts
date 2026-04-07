import type { GameState } from "./state";

export const debugTimeScalePresets = [1, 2, 5, 10, 20] as const;

export type DebugTimeScalePreset = (typeof debugTimeScalePresets)[number];

export function isDebugTimeScalePreset(value: number): value is DebugTimeScalePreset {
  return debugTimeScalePresets.includes(value as DebugTimeScalePreset);
}

export function getEffectiveTimeScale(state: GameState): number {
  return (
    state.time.debugMultiplier *
    state.time.prestigeMultiplier *
    state.time.systemMultiplier
  );
}

export function setDebugTimeScale(
  state: GameState,
  multiplier: DebugTimeScalePreset,
): void {
  state.time.debugMultiplier = multiplier;
}
