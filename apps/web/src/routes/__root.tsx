// What every screen sits inside.

import {
	Alert,
	AlertAction,
	AlertDescription,
} from "@registrum/ui/components/alert";
import { Button } from "@registrum/ui/components/button";
import { TooltipProvider } from "@registrum/ui/components/tooltip";
import { cn } from "@registrum/ui/lib/utils";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import {
	CheckIcon,
	CircleCheckIcon,
	CopyIcon,
	TriangleAlertIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Presence } from "@/components/presence";
import { useReaderSettings } from "@/features/reader/store";
import { useArrivingBooks } from "@/features/shelf/hooks/use-arriving-books";
import { resolveLanguage, setLocale } from "@/i18n";
import { copyText } from "@/lib/clipboard";
import { useAlert } from "@/store/alert";

/** How long the copy button says it worked. */
const COPIED_MS = 1500;

export const Route = createRootRoute({ component: RootLayout });

/**
 * Everything that is true of the app rather than of one screen: the theme, the
 * ways a book can arrive from outside the window, and the one banner.
 */
function RootLayout() {
	const { t } = useTranslation();
	const { dragging } = useArrivingBooks();
	const theme = useReaderSettings((state) => state.settings.theme);
	const language = useReaderSettings((state) => state.settings.language);

	const message = useAlert((state) => state.message);
	const tone = useAlert((state) => state.tone);
	const dismiss = useAlert((state) => state.dismiss);

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	useEffect(() => {
		setLocale(resolveLanguage(language));
	}, [language]);

	return (
		<TooltipProvider delay={400}>
			<div className="relative h-full w-full overflow-hidden bg-background text-foreground">
				{/* The screen swap is animated by the platform rather than from
            here: `Outlet` reads the router, so a copy kept mounted to play
            an exit would render the screen that replaced it. `router.ts`
            names the direction and `index.css` draws it. */}
				<Outlet />

				{/* The whole window is the drop target; this only says so. */}
				{dragging && (
					<div className="chrome fade-in-0 pointer-events-none absolute inset-0 z-50 animate-in duration-[var(--dur-quick)]">
						<div className="absolute inset-4 rounded-3xl border-[1.5px] border-primary border-dashed bg-background/40" />
						<div className="absolute inset-x-0 bottom-16 text-center text-muted-foreground text-sm">
							{t("common.dropToOpen")}
						</div>
					</div>
				)}

				{/* What leaves is the banner as it last stood, so it keeps its words
            and its colour on the way out. */}
				<Presence>
					{message && (
						<div
							key="alert"
							className={cn(
								"chrome absolute inset-x-0 bottom-20 z-40 mx-auto w-fit max-w-[80%]",
								"fade-in-0 slide-in-from-bottom-2 animate-in duration-300 ease-enter",
								"data-leaving:fade-out-0 data-leaving:animate-out data-leaving:fill-mode-forwards data-leaving:duration-150 data-leaving:ease-exit",
							)}
						>
							<Alert
								variant={tone === "problem" ? "destructive" : "default"}
								className="chrome-panel rounded-xl py-3 pr-20 pl-4"
							>
								{tone === "problem" ? (
									<TriangleAlertIcon />
								) : (
									<CircleCheckIcon className="text-accent-foreground" />
								)}
								<AlertDescription className="select-text">
									{message}
								</AlertDescription>
								<AlertAction className="flex gap-0.5">
									{tone === "problem" && <CopyMessage message={message} />}
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={t("common.close")}
										onClick={dismiss}
									>
										<XIcon />
									</Button>
								</AlertAction>
							</Alert>
						</div>
					)}
				</Presence>
			</div>
		</TooltipProvider>
	);
}

/** Puts what the banner says on the clipboard, so a failure can be pasted somewhere. */
function CopyMessage({ message }: { message: string }) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
		return () => window.clearTimeout(timer);
	}, [copied]);

	return (
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label={copied ? t("common.copied") : t("common.copy")}
			onClick={() => {
				void copyText(message).then(setCopied);
			}}
		>
			{copied ? <CheckIcon /> : <CopyIcon />}
		</Button>
	);
}
