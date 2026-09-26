// The folder list the app draws itself: the folders under the books mount,
// which is all a shelf can be made of.

import { Button } from "@registrum/ui/components/button";
import { Spinner } from "@registrum/ui/components/spinner";
import { ChevronRight, CornerLeftUp, Folder } from "lucide-react";
import { useTranslation } from "react-i18next";
import { folderLabel } from "../labels";
import { useFolderListing } from "../shelf-queries";

/** Where the browser starts: the books mount itself. */
export const TOP = "";

const ROW =
	"flex h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm hover:bg-accent";

/** The first question: which folder the shelf is made of. The folder the
 *  list is inside is the one a shelf would be made of. */
export function FolderBrowser({
	at,
	onAt,
}: {
	/** Which folder is being looked inside, relative to the mount. */
	at: string;
	onAt: (at: string) => void;
}) {
	const { t } = useTranslation();
	const walk = useFolderListing(at);
	const listing = walk.data ?? null;

	return (
		<div className="overflow-hidden rounded-xl border border-border">
			<div className="flex items-center gap-2 border-border border-b bg-muted px-2.5 py-1.5">
				{listing?.parent != null ? (
					<Button
						variant="outline"
						size="sm"
						onClick={() => onAt(listing.parent ?? TOP)}
						className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
					>
						<CornerLeftUp className="size-3.5" />
						{t("browse.up")}
					</Button>
				) : null}
				<span className="min-w-0 flex-1 truncate py-1.5 text-muted-foreground text-xs">
					{listing ? folderLabel(listing.path) : t("common.loading")}
				</span>
			</div>

			<div className="h-57 overflow-y-auto p-1.5">
				{walk.isPending ? (
					<div className="flex justify-center py-8">
						<Spinner aria-label={t("common.loading")} />
					</div>
				) : walk.isError ? (
					<p className="py-8 text-center text-muted-foreground text-sm">
						{t("browse.unreadable")}
					</p>
				) : (
					<ul className="flex flex-col gap-0.5">
						{listing?.folders.map((folder) => (
							<li key={folder.path}>
								<button
									type="button"
									onClick={() => onAt(folder.path)}
									className={ROW}
								>
									<Folder className="size-4 shrink-0 text-muted-foreground" />
									<span className="min-w-0 flex-1 truncate">{folder.name}</span>
									{folder.shelf && (
										<span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-semibold text-[11px] text-accent-foreground">
											{t("shelfSetup.isShelf")}
										</span>
									)}
									<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
								</button>
							</li>
						))}
						{listing && listing.folders.length === 0 ? (
							<li className="px-2.5 py-8 text-center text-muted-foreground text-sm">
								{t("browse.noFolders")}
							</li>
						) : null}
					</ul>
				)}
			</div>
		</div>
	);
}
