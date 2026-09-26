// Where the endpoint, the key and the model are typed. They are kept on the
// server, and the key never comes back to a browser once it has been saved.

import { Button } from "@Registrum/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "@Registrum/ui/components/field";
import { Input } from "@Registrum/ui/components/input";
import { Spinner } from "@Registrum/ui/components/spinner";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAiSettings, useSaveAiSettings } from "../queries";
import type { AiSettings as Saved } from "../types";

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
	return <AiSettingsForm saved={settings.data} />;
}

/**
 * The fields start from what the server holds, once it has said, and are the
 * reader's after that: a save landing for one field does not put back what is
 * being typed into another.
 */
function AiSettingsForm({ saved }: { saved: Saved }) {
	const { t } = useTranslation();
	const save = useSaveAiSettings();

	const [baseUrl, setBaseUrl] = useState(saved.baseUrl);
	const [model, setModel] = useState(saved.model);
	const [apiKey, setApiKey] = useState("");
	const { hasKey } = saved;

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-border bg-card px-4 py-3.5">
			<Row
				id="ai-base-url"
				label={t("ai.baseUrl")}
				hint={t("ai.baseUrlHint")}
				placeholder="https://openrouter.ai/api/v1"
				value={baseUrl}
				onChange={setBaseUrl}
				onCommit={() => {
					if (baseUrl !== saved.baseUrl) save.mutate({ baseUrl });
				}}
			/>
			<Row
				id="ai-model"
				label={t("ai.model")}
				hint={t("ai.modelHint")}
				placeholder="google/gemini-2.5-pro"
				value={model}
				onChange={setModel}
				onCommit={() => {
					if (model !== saved.model) save.mutate({ model });
				}}
			/>
			<Row
				id="ai-api-key"
				label={t("ai.apiKey")}
				hint={hasKey ? t("ai.apiKeySavedHint") : t("ai.apiKeyHint")}
				placeholder={hasKey ? t("ai.apiKeySaved") : undefined}
				// Masked for a shoulder; the server never hands it back.
				type="password"
				value={apiKey}
				onChange={setApiKey}
				onCommit={() => {
					if (apiKey.trim() === "") return;
					save.mutate({ apiKey }, { onSuccess: () => setApiKey("") });
				}}
				trailing={
					hasKey ? (
						<Button
							variant="outline"
							size="sm"
							disabled={save.isPending}
							onClick={() => save.mutate({ apiKey: "" })}
							className="shrink-0"
						>
							{t("ai.forgetKey")}
						</Button>
					) : null
				}
			/>
		</div>
	);
}

function Row({
	id,
	label,
	hint,
	placeholder,
	value,
	type,
	onChange,
	onCommit,
	trailing,
}: {
	id: string;
	label: string;
	hint: string;
	placeholder?: string;
	value: string;
	type?: string;
	onChange: (value: string) => void;
	/** The field is left, or Enter pressed: what it holds is saved. */
	onCommit: () => void;
	trailing?: React.ReactNode;
}) {
	return (
		<Field>
			<FieldLabel htmlFor={id} className="text-muted-foreground text-xs">
				{label}
			</FieldLabel>
			<div className="flex items-center gap-2">
				<Input
					id={id}
					type={type}
					value={value}
					placeholder={placeholder}
					spellCheck={false}
					autoComplete="off"
					onChange={(event) => onChange(event.target.value)}
					onBlur={onCommit}
					onKeyDown={(event) => {
						if (event.key === "Enter") onCommit();
					}}
				/>
				{trailing}
			</div>
			<FieldDescription className="text-xs leading-relaxed">
				{hint}
			</FieldDescription>
		</Field>
	);
}
