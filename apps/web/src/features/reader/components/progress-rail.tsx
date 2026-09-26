import { Slider } from "@Registrum/ui/components/slider";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { sliderValue } from "@/features/reader/components/settings-rows";
import i18n from "@/i18n";

/** Fine enough to land on any page of a long book. */
const STEP = 0.001;

/** What the slider says it is worth, for anyone who cannot see the readout. */
const PERCENT = { style: "percent", maximumFractionDigits: 0 } as const;

interface ProgressRailProps {
	fraction: number;
	onSeek: (fraction: number) => void;
}

/** How far in the book is, and a way to move. */
export function ProgressRail({ fraction, onSeek }: ProgressRailProps) {
	const { t } = useTranslation();
	/** Where the thumb has been dragged to, until the book reports where it
	 *  landed: any new `fraction` lets it go. */
	const [dragged, setDragged] = useState<number | null>(null);
	const [seen, setSeen] = useState(fraction);
	if (seen !== fraction) {
		setSeen(fraction);
		setDragged(null);
	}

	const value = dragged ?? fraction;

	return (
		<div className="flex h-12 shrink-0 items-center gap-4 ps-4 pe-3">
			{/* The slider itself is `w-full`; the width has to come from a wrapper. */}
			<div className="min-w-0 grow">
				<Slider
					value={value}
					min={0}
					max={1}
					step={STEP}
					format={PERCENT}
					locale={i18n.language}
					onValueChange={(next) => setDragged(toFraction(next, value))}
					onValueCommitted={(next) => onSeek(toFraction(next, value))}
					aria-label={t("reader.position")}
				/>
			</div>

			{/* Fixed width and tabular figures: the slider must not shift as the
          number grows a digit. */}
			<span className="w-9 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
				{Math.round(value * 100)}%
			</span>
		</div>
	);
}

function toFraction(
	value: number | readonly number[],
	current: number,
): number {
	return Math.min(1, Math.max(0, sliderValue(value, current)));
}
