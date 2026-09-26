// The password, before the shelf.

import { Button } from "@Registrum/ui/components/button";
import { Input } from "@Registrum/ui/components/input";
import { LockIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { signIn } from "../session";

export function SignIn() {
	const { t } = useTranslation();
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [wrong, setWrong] = useState(false);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setBusy(true);
		const ok = await signIn(password).catch(() => false);
		// Starting over lets the app load with the session in hand.
		if (ok) {
			location.reload();
			return;
		}
		setBusy(false);
		setWrong(true);
	};

	return (
		<main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
			<form
				onSubmit={(event) => void submit(event)}
				className="flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-border bg-card p-6"
			>
				<div className="flex flex-col items-center gap-2 text-center">
					<span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
						<LockIcon className="size-5" />
					</span>
					<h1 className="font-semibold text-base">{t("app.name")}</h1>
					<p className="text-muted-foreground text-sm">
						{t("session.signInPrompt")}
					</p>
				</div>
				<Input
					type="password"
					autoFocus
					autoComplete="current-password"
					aria-label={t("session.password")}
					aria-invalid={wrong || undefined}
					value={password}
					onChange={(event) => {
						setPassword(event.target.value);
						setWrong(false);
					}}
				/>
				{wrong && (
					<p className="text-destructive text-sm">
						{t("session.wrongPassword")}
					</p>
				)}
				<Button type="submit" disabled={busy || password === ""}>
					{t("session.signIn")}
				</Button>
			</form>
		</main>
	);
}
