import "i18next";

import type { ja } from "./ja";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: { translation: typeof ja };
		returnNull: false;
	}
}
