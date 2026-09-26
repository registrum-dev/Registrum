// The bar that turns the shelf's pages.

import { Button } from "@registrum/ui/components/button";
import { cn } from "@registrum/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LabeledSelect } from "@/components/labeled-select";

import {
	lastPage,
	PAGE_SIZES,
	type PageSize,
	pageRange,
	pageSteps,
} from "../paging";

/** Which page of the shelf is on screen, and the way to any other. */
export function BookPager({
	page,
	size,
	total,
	onPageChange,
	onSizeChange,
}: {
	page: number;
	size: PageSize;
	total: number;
	onPageChange: (page: number) => void;
	onSizeChange: (size: PageSize) => void;
}) {
	const { t } = useTranslation();
	const last = lastPage(total, size);
	const { from, to } = pageRange(page, size, total);

	return (
		<nav
			aria-label={t("pager.label")}
			className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2"
		>
			<span className="text-muted-foreground text-xs tabular-nums">
				{t("pager.range", { from, to, total })}
			</span>

			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon-lg"
					className="rounded-xl"
					aria-label={t("pager.previous")}
					disabled={page <= 0}
					onClick={() => onPageChange(page - 1)}
				>
					<ChevronLeftIcon />
				</Button>

				{pageSteps(page, last).map((step, at) =>
					step === null ? (
						// The run of pages nobody asked to see by name.
						<span
							key={`gap-${at}`}
							aria-hidden
							className="px-0.5 text-muted-foreground text-xs"
						>
							{t("pager.gap")}
						</span>
					) : (
						<Button
							key={step}
							variant={step === page ? "default" : "ghost"}
							size="icon-lg"
							className={cn(
								"rounded-xl tabular-nums",
								step === page && "pointer-events-none",
							)}
							aria-label={t("pager.page", { page: step + 1 })}
							aria-current={step === page ? "page" : undefined}
							onClick={() => onPageChange(step)}
						>
							{step + 1}
						</Button>
					),
				)}

				<Button
					variant="ghost"
					size="icon-lg"
					className="rounded-xl"
					aria-label={t("pager.next")}
					disabled={page >= last}
					onClick={() => onPageChange(page + 1)}
				>
					<ChevronRightIcon />
				</Button>
			</div>

			<LabeledSelect
				aria-label={t("pager.perPage")}
				value={String(size)}
				options={PAGE_SIZES.map((option) => ({
					value: String(option),
					label: t("common.bookCount", { count: option }),
				}))}
				onValueChange={(next) => onSizeChange(Number(next) as PageSize)}
				className="h-9 rounded-xl"
			/>
		</nav>
	);
}
