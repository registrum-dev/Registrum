// The app's own settings, as a sheet over the shelf.

import { Button } from "@Registrum/ui/components/button";
import { Spinner } from "@Registrum/ui/components/spinner";
import { cn } from "@Registrum/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { HouseIcon, LogOutIcon, RefreshCwIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "@/components/language-picker";
import {
	SheetBar,
	SheetBarButton,
	SheetBody,
	SheetSurface,
} from "@/components/phone-sheet";
import { SettingsSection as Section } from "@/components/settings-section";
import { ThemePicker } from "@/components/theme-picker";
import { AiSettings } from "@/features/ai/components/ai-settings";
import { ScanProgress } from "@/features/library/components/scan-progress";
import { ShelfSettings } from "@/features/library/components/shelf-settings";
import { useCurrentShelf } from "@/features/library/folder-queries";
import { folderLabel, shortDate } from "@/features/library/labels";
import { useFacetsQuery } from "@/features/library/queries";
import { NO_FACETS } from "@/features/library/query";
import { sessionQuery } from "@/features/library/session-query";
import { useLibrary } from "@/features/library/store";
import { signOut } from "@/features/session/session";
import { useWindowTitle } from "@/hooks/use-window-title";

/** The settings, risen over the shelf like a book's detail. The router owns its coming and going. */
export function SettingsSheet({
	open,
	appear,
}: {
	open: boolean;
	appear: boolean;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const toShelf = useCallback(() => void navigate({ to: "/" }), [navigate]);

	return (
		<SheetSurface
			open={open}
			kind="page"
			label={t("settings.title")}
			modal={false}
			appear={appear}
			onClose={toShelf}
			className="max-w-3xl"
		>
			<SheetBar
				title={t("settings.title")}
				trailing={
					<SheetBarButton strong onClick={toShelf}>
						{t("common.done")}
					</SheetBarButton>
				}
			/>
			<SheetBody className="p-0 pb-0">
				<LibrarySettings className="desktop:gap-8 gap-6 desktop:p-6 p-4 desktop:pb-[calc(1.5rem+var(--safe-bottom))] pb-[calc(1rem+var(--safe-bottom))]" />
			</SheetBody>
		</SheetSurface>
	);
}

/** Six sections, read top to bottom. */
function LibrarySettings({ className }: { className?: string }) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const shelfId = useLibrary((state) => state.shelfId);
	const busy = useLibrary((state) => state.busy);
	const leaveShelf = useLibrary((state) => state.leaveShelf);
	const shelf = useCurrentShelf();
	const session = useQuery(sessionQuery).data;
	const startScan = useLibrary((state) => state.startScan);
	// Over the whole library, not over the shelf the conditions are letting
	// through: this screen is about the folder, not about a shelf in it.
	const counted = useFacetsQuery();
	const facets = counted.data ?? NO_FACETS;

	useWindowTitle(t("app.settingsWindowTitle"));

	// The first screen is the shelf with no folder behind it, so leaving the
	// folder and going to the shelf are one gesture.
	const toWelcome = useCallback(() => {
		leaveShelf();
		void navigate({ to: "/" });
	}, [leaveShelf, navigate]);

	return (
		// Read top to bottom, so they arrive that way. A list this short can be
		// staggered outright.
		<div
			className={cn("motion-cascade flex flex-col [--step:70ms]", className)}
		>
			<Section title={t("settings.library")}>
				<div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<div className="min-w-0 flex-1">
							<div className="text-[11px] text-muted-foreground tracking-wide">
								{t("settings.folder")}
							</div>
							<div
								className="mt-0.5 truncate text-sm"
								title={shelf ? folderLabel(shelf.path) : undefined}
							>
								{shelf ? folderLabel(shelf.path) : t("settings.noFolder")}
							</div>
						</div>
						<Button variant="outline" onClick={toWelcome} className="gap-2">
							<HouseIcon />
							{t("settings.leaveFolder")}
						</Button>
					</div>

					<div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-border border-t pt-3">
						<Fact
							label={t("library.total")}
							value={t("common.bookCount", { count: facets.total })}
							waiting={counted.isPending}
						/>
						<Fact
							label={t("scan.lastLabel")}
							value={
								facets.lastScan ? shortDate(facets.lastScan) : t("scan.never")
							}
							waiting={counted.isPending}
						/>
						<Button
							variant="ghost"
							size="sm"
							disabled={!shelfId || busy === "scanning"}
							onClick={() => void startScan()}
							className="ml-auto gap-2"
						>
							<RefreshCwIcon
								className={busy === "scanning" ? "animate-spin" : undefined}
							/>
							{busy === "scanning" ? t("scan.running") : t("scan.again")}
						</Button>
					</div>

					{/* The shelf's own bar reports a scan too, but a scan started
              here has to be answerable here. */}
					<ScanProgress className="pt-3" barClassName="phone:w-20" />
				</div>
			</Section>

			<Section title={t("shelf.heading")}>
				<ShelfSettings />
			</Section>

			<Section title={t("settings.language")}>
				<LanguagePicker />
			</Section>

			<Section title={t("display.theme")}>
				<ThemePicker className="w-full max-w-sm rounded-xl border border-border bg-card p-1" />
			</Section>

			<Section title={t("ai.title")}>
				<AiSettings />
			</Section>

			{session?.required && (
				<Section title={t("session.heading")}>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3.5">
						<p className="min-w-0 flex-1 text-muted-foreground text-xs leading-relaxed">
							{t("session.signedInNote")}
						</p>
						<Button
							variant="outline"
							onClick={() => void signOut()}
							className="gap-2"
						>
							<LogOutIcon />
							{t("session.signOut")}
						</Button>
					</div>
				</Section>
			)}
		</div>
	);
}

/** One number about the folder. */
function Fact({
	label,
	value,
	waiting,
}: {
	label: string;
	value: string;
	waiting?: boolean;
}) {
	const { t } = useTranslation();

	return (
		<div>
			<div className="text-[11px] text-muted-foreground tracking-wide">
				{label}
			</div>
			{/* The line keeps its height whichever of the two it is showing, the
          spinner or the number that takes its place. */}
			<div className="mt-0.5 flex h-5 items-center text-sm tabular-nums">
				{waiting ? <Spinner aria-label={t("common.loading")} /> : value}
			</div>
		</div>
	);
}
