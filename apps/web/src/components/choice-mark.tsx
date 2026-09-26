import {
	ToggleGroup,
	ToggleGroupItem,
} from "@Registrum/ui/components/toggle-group";
import { cn } from "@Registrum/ui/lib/utils";
import { type ComponentProps, type ReactNode, useId } from "react";
import { useSharedMark } from "@/hooks/use-shared-mark";
import { TOUCH } from "@/lib/motion";

/** The group has to be its own stacking context so the mark can sit under every item. */
export const CHOICE_GROUP = "isolate";

/**
 * The pressed item hands its fill to the mark, which is behind it. No item
 * lifts on focus: a lifted item would carry the mark over its neighbours.
 */
export const CHOICE_ITEM =
	"relative focus:z-auto focus-visible:z-auto aria-pressed:border-transparent aria-pressed:bg-transparent aria-pressed:hover:bg-transparent";

/** The pressed item's fill, shared by `id` so it slides to the next choice. */
export function ChoiceMark({ id }: { id: string }) {
	const ref = useSharedMark<HTMLSpanElement>(id, TOUCH);
	return (
		<span
			ref={ref}
			aria-hidden="true"
			className="absolute inset-0 -z-10 rounded-[inherit] border border-accent-foreground/25 bg-accent"
		/>
	);
}

/**
 * The first of what a toggle group says is pressed, for a group that is one
 * choice: pressing the pressed item again empties it, which is no choice at all.
 */
export function oneChoice<T extends string>(
	onChange: (value: T) => void,
): (next: readonly unknown[]) => void {
	return (next) => {
		const picked = next[0] as T | undefined;
		if (picked) onChange(picked);
	};
}

export interface Choice<T extends string> {
	value: T;
	/** What a screen reader calls it, where what is drawn does not say. */
	label?: string;
	content: ReactNode;
}

/** One choice out of several, with a mark that slides to the one pressed. */
export function ChoiceGroup<T extends string>({
	value,
	choices,
	onChange,
	variant,
	className,
	itemClassName,
	"aria-label": ariaLabel,
}: {
	value: T;
	choices: readonly Choice<T>[];
	onChange: (value: T) => void;
	variant?: ComponentProps<typeof ToggleGroup>["variant"];
	className?: string;
	itemClassName?: string;
	"aria-label"?: string;
}) {
	const mark = useId();

	return (
		<ToggleGroup
			value={[value]}
			onValueChange={oneChoice(onChange)}
			aria-label={ariaLabel}
			variant={variant}
			className={cn(CHOICE_GROUP, className)}
		>
			{choices.map((choice) => (
				<ToggleGroupItem
					key={choice.value}
					value={choice.value}
					aria-label={choice.label}
					className={cn(itemClassName, CHOICE_ITEM)}
				>
					{choice.value === value && <ChoiceMark id={mark} />}
					{choice.content}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
