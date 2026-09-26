import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@registrum/ui/components/select";
import { cn } from "@registrum/ui/lib/utils";
import { Fragment } from "react";

/** A choice, and how many books it would leave where that is worth saying. */
export interface SelectOption {
	value: string;
	label: string;
	count?: number;
	/** Drawn faint, here and in the trigger: a choice that means "nothing". */
	muted?: boolean;
	/** A line under this choice, setting it apart from the ones after it. */
	separatorAfter?: boolean;
}

/** A menu of named choices. */
export function LabeledSelect({
	value,
	options,
	onValueChange,
	placeholder,
	id,
	size,
	className,
	alignItemWithTrigger,
	"aria-label": ariaLabel,
}: {
	value: string;
	options: SelectOption[];
	onValueChange: (value: string) => void;
	/** What the trigger reads when the value names no option of its own. */
	placeholder?: string;
	id?: string;
	size?: "sm" | "default";
	className?: string;
	alignItemWithTrigger?: boolean;
	"aria-label"?: string;
}) {
	const labelOf = (item: string) => {
		const option = options.find((each) => each.value === item);
		const label = option?.label ?? placeholder ?? options[0]?.label ?? item;
		return option?.muted ? (
			<span className="text-muted-foreground">{label}</span>
		) : (
			label
		);
	};

	return (
		<Select
			value={value}
			onValueChange={(next: string | null) => {
				if (next) onValueChange(next);
			}}
		>
			<SelectTrigger
				id={id}
				size={size}
				className={className}
				aria-label={ariaLabel}
			>
				<SelectValue>{(item: string) => labelOf(item)}</SelectValue>
			</SelectTrigger>
			<SelectContent alignItemWithTrigger={alignItemWithTrigger}>
				<SelectGroup>
					{options.map((option) => (
						<Fragment key={option.value}>
							<SelectItem value={option.value}>
								<span
									className={cn(
										"truncate",
										option.muted && "text-muted-foreground",
									)}
								>
									{option.label}
								</span>
								{option.count !== undefined && (
									<span className="ml-auto flex-none text-muted-foreground text-xs tabular-nums">
										{option.count}
									</span>
								)}
							</SelectItem>
							{option.separatorAfter && <SelectSeparator />}
						</Fragment>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
