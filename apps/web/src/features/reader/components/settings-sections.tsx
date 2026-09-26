// The groups of display settings: three tabs, or one page for a fixed layout.

import { cn } from "@Registrum/ui/lib/utils";
import {
	AArrowDownIcon,
	AArrowUpIcon,
	BookOpenIcon,
	Rows2Icon,
	Rows4Icon,
	ScrollTextIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemePicker } from "@/components/theme-picker";
import {
	CardChoiceRow,
	ChoiceRow,
	DirectionRow,
	SectionTitle,
	SelectRow,
	SliderRow,
	SwitchRow,
} from "@/features/reader/components/settings-rows";
import type { PageDirection } from "@/features/reader/direction";
import { FONTS, fontLabel } from "@/features/reader/fonts";
import {
	type FitMode,
	type FlowMode,
	FONT_SIZE,
	MARGIN_SIZES,
	type MarginSize,
} from "@/features/reader/settings";
import { useSettings } from "@/features/reader/store";

/** Base UI selects cannot carry an empty value, so "follow the book" gets a name. */
const FOLLOW_BOOK = "__book__";

/** Look: the colours, and the size and face of the words. */
export function AppearanceSection() {
	const { t } = useTranslation();
	const settings = useSettings((state) => state.settings);
	const update = useSettings((state) => state.update);

	return (
		<section className="flex flex-col gap-4">
			<ThemePicker className="w-full" />

			<SliderRow
				label={t("display.fontSize")}
				value={settings.fontSize}
				min={FONT_SIZE.min}
				max={FONT_SIZE.max}
				display={`${settings.fontSize}px`}
				edges={[<AArrowDownIcon key="less" />, <AArrowUpIcon key="more" />]}
				onChange={(fontSize) => update({ fontSize })}
			/>
			<SliderRow
				label={t("display.lineHeight")}
				value={settings.lineHeight}
				min={1.2}
				max={2.6}
				step={0.05}
				display={settings.lineHeight.toFixed(2)}
				edges={[<Rows2Icon key="less" />, <Rows4Icon key="more" />]}
				onChange={(lineHeight) => update({ lineHeight })}
			/>

			<SelectRow
				label={t("display.font")}
				value={settings.fontFamily || FOLLOW_BOOK}
				options={FONTS.map((font) => ({
					label: fontLabel(font),
					value: font.value || FOLLOW_BOOK,
				}))}
				onChange={(value) =>
					update({ fontFamily: value === FOLLOW_BOOK ? "" : value })
				}
			/>
		</section>
	);
}

const MARGIN_INSET: Record<MarginSize, string> = {
	narrow: "px-1",
	normal: "px-1.5",
	wide: "px-2.5",
};

/** A page with lines on it, set in as far as the margin would set them. */
function MarginGlyph({ size }: { size: MarginSize }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"flex h-9 w-7 flex-col gap-[3px] rounded-[3px] border-[1.5px] border-current py-1.5",
				MARGIN_INSET[size],
			)}
		>
			{[0, 1, 2, 3].map((line) => (
				<span key={line} className="h-0.5 rounded-full bg-current opacity-60" />
			))}
			<span className="h-0.5 w-3/5 rounded-full bg-current opacity-60" />
		</span>
	);
}

/** Page: how the text moves, how far in it sits, and which way it turns. */
export function PageSection({ direction }: { direction: PageDirection }) {
	const { t } = useTranslation();
	const settings = useSettings((state) => state.settings);
	const update = useSettings((state) => state.update);

	return (
		<section className="flex flex-col gap-4">
			<CardChoiceRow<FlowMode>
				label={t("display.flow")}
				value={settings.flow}
				inline
				options={[
					{
						label: t("display.paginated"),
						value: "paginated",
						icon: <BookOpenIcon />,
					},
					{
						label: t("display.scrolled"),
						value: "scrolled",
						icon: <ScrollTextIcon />,
					},
				]}
				onChange={(flow) => update({ flow })}
			/>
			<CardChoiceRow<MarginSize>
				label={t("display.margins")}
				value={settings.margins}
				options={MARGIN_SIZES.map((size) => ({
					label: t(`display.${size}`),
					value: size,
					icon: <MarginGlyph size={size} />,
				}))}
				onChange={(margins) => update({ margins })}
			/>
			<DirectionRow direction={direction} />

			<p className="text-[11.5px] text-muted-foreground leading-relaxed">
				{t("display.marginNote")}
			</p>
		</section>
	);
}

/** Details: the finer points of setting the type, seldom touched. */
export function DetailsSection() {
	const { t } = useTranslation();
	const settings = useSettings((state) => state.settings);
	const update = useSettings((state) => state.update);

	return (
		<section className="flex flex-col gap-4">
			<SliderRow
				label={t("display.letterSpacing")}
				value={settings.letterSpacing}
				min={0}
				max={0.3}
				step={0.01}
				display={`${settings.letterSpacing.toFixed(2)}em`}
				onChange={(letterSpacing) => update({ letterSpacing })}
			/>
			<ChoiceRow<string>
				label={t("display.columns")}
				value={String(settings.maxColumnCount)}
				options={[
					{ label: t("display.oneColumn"), value: "1" },
					{ label: t("display.twoColumns"), value: "2" },
				]}
				onChange={(value) => update({ maxColumnCount: Number(value) })}
			/>
			<SwitchRow
				label={t("display.justify")}
				checked={settings.justify}
				onChange={(justify) => update({ justify })}
			/>
			<SwitchRow
				label={t("display.hyphenate")}
				checked={settings.hyphenate}
				onChange={(hyphenate) => update({ hyphenate })}
			/>
			<SwitchRow
				label={t("display.strictLineBreak")}
				checked={settings.strictLineBreak}
				onChange={(strictLineBreak) => update({ strictLineBreak })}
			/>
		</section>
	);
}

/** What a PDF or a comic archive can be told, which is not much. */
export function FixedLayoutSection({
	direction,
}: {
	direction: PageDirection;
}) {
	const { t } = useTranslation();
	const settings = useSettings((state) => state.settings);
	const update = useSettings((state) => state.update);

	return (
		<section className="flex flex-col gap-3">
			<SectionTitle>{t("layout.pre-paginated")}</SectionTitle>

			<ChoiceRow<FitMode>
				label={t("display.zoom")}
				value={settings.fitMode}
				options={[
					{ label: t("display.fitPage"), value: "fit-page" },
					{ label: t("display.fitWidth"), value: "fit-width" },
				]}
				onChange={(fitMode) => update({ fitMode })}
			/>
			<SwitchRow
				label={t("display.spread")}
				checked={settings.spread}
				onChange={(spread) => update({ spread })}
			/>
			<DirectionRow direction={direction} />
			<SwitchRow
				label={t("display.invertFixed")}
				checked={settings.invertFixed}
				onChange={(invertFixed) => update({ invertFixed })}
			/>

			<p className="text-[11.5px] text-muted-foreground leading-relaxed">
				{t("display.fixedNote")}
			</p>
		</section>
	);
}
