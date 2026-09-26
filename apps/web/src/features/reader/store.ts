import { create } from "zustand";
import { persist } from "zustand/middleware";

import { preferences } from "@/lib/persist";
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from "./settings";

const STORE_KEY = "reader";

interface SettingsState {
	settings: Settings;
	update: (patch: Partial<Settings>) => void;
	reset: () => void;
}

export const useSettings = create<SettingsState>()(
	persist<SettingsState, [], [], Settings>(
		(set, get) => ({
			settings: DEFAULT_SETTINGS,

			update(patch) {
				set({ settings: { ...get().settings, ...patch } });
			},

			reset() {
				set({ settings: { ...DEFAULT_SETTINGS } });
			},
		}),
		{
			name: STORE_KEY,
			storage: preferences<Settings>(),
			partialize: (state) => state.settings,
			merge: (stored, current) => ({
				...current,
				settings: mergeSettings(stored),
			}),
		},
	),
);
