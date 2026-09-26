// The endpoint, the model and whether there is a key, as the server was started
// with. They are set in its environment, not here.

import { Spinner } from "@Registrum/ui/components/spinner";
import { useTranslation } from "react-i18next";

import { useAiSettings } from "../queries";
import { isConfigured } from "../types";

export function AiSettings() {
	const { t } = useTranslation();
	const settings = useAiSettings();

	if (!settings.data) {
		return settings.isPending ? (
			<div className="flex justify-center py-10">
				<Spinner aria-label={t("common.loading")} />
			</div>
		) : null;
	}
	const { baseUrl, model, hasKey } = settings.data;
	const unset = t("ai.unset");

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
			<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
				<Row label={t("ai.baseUrl")} value={baseUrl || unset} />
				<Row label={t("ai.model")} value={model || unset} />
				<Row
					label={t("ai.apiKey")}
					value={hasKey ? t("ai.apiKeySet") : unset}
				/>
			</dl>
			<p className="text-muted-foreground text-xs leading-relaxed">
				{isConfigured(settings.data) ? t("ai.envHint") : t("ai.envUnsetHint")}
			</p>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<>
			<dt className="text-muted-foreground text-xs leading-5">{label}</dt>
			<dd className="break-all font-mono text-xs leading-5">{value}</dd>
		</>
	);
}
