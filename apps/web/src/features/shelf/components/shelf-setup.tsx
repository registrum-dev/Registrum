// The first screen: two questions between no shelf and an open one.

import { Button } from "@registrum/ui/components/button";
import { ScrollArea } from "@registrum/ui/components/scroll-area";
import { Spinner } from "@registrum/ui/components/spinner";
import { ArrowRightIcon, BookOpenIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsDialog } from "@/components/settings-dialog";
import { useFormFactor } from "@/hooks/use-form-factor";
import { baseName } from "../paths";
import { useFolderListing } from "../shelf-queries";
import { useShelfStore } from "../store";
import { FolderBrowser, TOP } from "./folder-browser";
import { ScreenFrame } from "./screen-frame";
import { ShelfList, StepSection } from "./shelf-setup-parts";
import { StepName } from "./shelf-setup-steps";

export function ShelfSetup() {
	const { t } = useTranslation();
	const phone = useFormFactor() === "phone";
	const createShelf = useShelfStore((state) => state.createShelf);
	const switchTo = useShelfStore((state) => state.switchTo);
	const busy = useShelfStore((state) => state.busy === "loading");

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [at, setAt] = useState(TOP);
	/** The folder this shelf would be made of: the one the browser is inside,
	 *  once it has been read (the same question the browser asks). */
	const listing = useFolderListing(at).data;
	const folder = listing ? { path: listing.path, shelf: listing.shelf } : null;
	/** The name the reader typed, which a new folder must not overwrite. Until
	 *  they type one the field follows the folder, so that a reader with no
	 *  opinion about the name can press on. */
	const [typed, setTyped] = useState<string | null>(null);
	const name =
		typed ??
		(folder ? baseName(folder.path) || t("shelfSetup.shelfDefaultName") : "");

	const settled = folder?.shelf != null;
	const ready = folder !== null && (settled || name.trim() !== "");

	const open = () => {
		if (!folder) return;
		// A folder that is a shelf already is opened, not made again.
		if (folder.shelf) void switchTo(folder.shelf);
		else void createShelf(folder.path, name);
	};

	const openButton = (
		<Button
			disabled={busy || !ready}
			onClick={open}
			className="h-11 phone:w-full gap-2 rounded-xl px-5 text-sm"
		>
			{busy && <Spinner className="size-4" />}
			{t("shelfSetup.open")}
			{!busy && <ArrowRightIcon />}
		</Button>
	);

	return (
		<ScreenFrame>
			<header className="chrome z-20 flex h-14 shrink-0 items-center gap-2 border-border border-b pr-3 pl-5">
				<BookOpenIcon className="size-4.5 shrink-0 text-accent-foreground" />
				<h1 className="min-w-0 flex-1 truncate text-muted-foreground text-sm">
					{t("shelfSetup.title")}
				</h1>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t("settings.title")}
					onClick={() => setSettingsOpen(true)}
					className="size-9 shrink-0 rounded-xl text-muted-foreground"
				>
					<SettingsIcon />
				</Button>
			</header>

			<ScrollArea className="min-h-0 flex-1">
				{/* Read top to bottom, so they arrive that way. */}
				<div className="motion-cascade mx-auto flex max-w-3xl flex-col gap-8 phone:gap-6 p-6 phone:p-4 [--step:70ms]">
					<ShelfList />

					<StepSection
						n={1}
						title={t("shelfSetup.stepFolder")}
						done={folder !== null}
					>
						<FolderBrowser at={at} onAt={setAt} />
					</StepSection>

					<StepSection
						n={2}
						title={t("shelfSetup.stepName")}
						done={settled}
						doneLabel={t("shelfSetup.stepSettled")}
						waiting={folder === null}
					>
						<StepName
							folder={folder?.path ?? null}
							settled={settled}
							name={name}
							onName={setTyped}
							busy={busy}
						/>
					</StepSection>

					{!phone && (
						<div className="flex items-center gap-3">
							<p className="min-w-0 flex-1 text-muted-foreground text-xs">
								{t("shelfSetup.formats")}
							</p>
							{openButton}
						</div>
					)}
				</div>
			</ScrollArea>

			{phone && (
				<div className="shrink-0 border-border border-t px-4 pt-2.5 pb-[calc(0.625rem+var(--safe-bottom))]">
					{openButton}
				</div>
			)}

			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
		</ScreenFrame>
	);
}
