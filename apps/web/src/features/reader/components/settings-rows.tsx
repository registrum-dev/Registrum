// The rows the display settings are built out of.

import { Field, FieldLabel } from "@registrum/ui/components/field";
import { Slider } from "@registrum/ui/components/slider";
import { Switch } from "@registrum/ui/components/switch";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@registrum/ui/components/toggle-group";
import { cn } from "@registrum/ui/lib/utils";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { ChoiceGroup, oneChoice } from "@/components/choice-group";
import { LabeledSelect } from "@/components/labeled-select";
import type { PageDirection } from "@/features/reader/direction";
import { useReaderSettings } from "@/features/reader/store";

/** A slider hands back one number, or one per thumb; these have one thumb.
 *  An array with no thumb in it says nothing, so `current` stands. */
export function sliderValue(
	value: number | readonly number[],
	current: number,
): number {
	return typeof value === "number" ? value : (value[0] ?? current);
}

export function SectionTitle({ children }: { children: string }) {
	return (
		<h2 className="font-semibold text-[11px] text-muted-foreground tracking-widest">
			{children}
		</h2>
	);
}

export function SliderRow({
	label,
	value,
	min,
	max,
	step = 1,
	display,
	edges,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	display: string;
	/** Icons at either end of the track, saying which way is less and which more. */
	edges?: [ReactNode, ReactNode];
	onChange: (value: number) => void;
}) {
	const id = useId();
	const slider = (
		<Slider
			id={id}
			value={value}
			min={min}
			max={max}
			step={step}
			onValueChange={(next) => onChange(sliderValue(next, value))}
			className="phone:[&_[data-slot=slider-thumb]]:size-5"
		/>
	);

	return (
		<Field>
			<div className="flex items-baseline justify-between gap-2">
				<FieldLabel htmlFor={id}>{label}</FieldLabel>
				<span className="text-[11.5px] text-muted-foreground tabular-nums">
					{display}
				</span>
			</div>
			{edges ? (
				<div className="flex items-center gap-3 text-muted-foreground [&_svg]:size-4.5 [&_svg]:shrink-0">
					{edges[0]}
					{slider}
					{edges[1]}
				</div>
			) : (
				slider
			)}
		</Field>
	);
}

export function SwitchRow({
	label,
	display,
	checked,
	onChange,
}: {
	label: string;
	/** What the setting currently amounts to, where the switch cannot say it. */
	display?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	const id = useId();

	return (
		<Field orientation="horizontal">
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			{display && (
				<span className="text-[11.5px] text-muted-foreground">{display}</span>
			)}
			<Switch id={id} checked={checked} onCheckedChange={onChange} />
		</Field>
	);
}

export function ChoiceRow<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: { label: string; value: T }[];
	onChange: (value: T) => void;
}) {
	return (
		<Field orientation="horizontal">
			<FieldLabel>{label}</FieldLabel>
			<ToggleGroup
				value={[value]}
				onValueChange={oneChoice(onChange)}
				spacing={0}
				variant="outline"
				size="sm"
			>
				{options.map((option) => (
					<ToggleGroupItem key={option.value} value={option.value}>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</Field>
	);
}

/** A choice made by pressing a card, each with a picture of what it does. */
export function CardChoiceRow<T extends string>({
	label,
	value,
	options,
	inline = false,
	onChange,
}: {
	label: string;
	value: T;
	options: { label: string; value: T; icon: ReactNode }[];
	/** Icon beside the label rather than above it. */
	inline?: boolean;
	onChange: (value: T) => void;
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<ChoiceGroup
				value={value}
				onChange={onChange}
				aria-label={label}
				variant="outline"
				className="w-full"
				itemClassName={cn(
					"flex-1 font-normal",
					inline ? "h-11 gap-2" : "h-auto flex-col gap-1.5 py-2.5",
				)}
				choices={options.map((option) => ({
					value: option.value,
					content: (
						<>
							{option.icon}
							<span className="text-[12.5px]">{option.label}</span>
						</>
					),
				}))}
			/>
		</Field>
	);
}

export function SelectRow<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: { label: string; value: T }[];
	onChange: (value: T) => void;
}) {
	return (
		<Field orientation="horizontal">
			<FieldLabel>{label}</FieldLabel>
			<LabeledSelect
				aria-label={label}
				value={value}
				options={options}
				onValueChange={(next) => onChange(next as T)}
				className="w-44"
			/>
		</Field>
	);
}

/* Which way the pages run is not a property of the layout, so the same row
   stands in both sections rather than being written out twice. */
export function DirectionRow({ direction }: { direction: PageDirection }) {
	const { t } = useTranslation();
	const reverseDirection = useReaderSettings(
		(state) => state.settings.reverseDirection,
	);
	const update = useReaderSettings((state) => state.update);

	return (
		<SwitchRow
			label={t("display.reverseDirection")}
			display={t(`direction.${direction.nextIsLeft ? "left" : "right"}`)}
			checked={reverseDirection}
			onChange={(next) => update({ reverseDirection: next })}
		/>
	);
}
