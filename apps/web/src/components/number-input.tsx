import { Input } from "@registrum/ui/components/input";

/** Digits and at most one decimal point. A volume is 3, or 3.5, never a word. */
const NUMERIC = /^\d*\.?\d*$/;

/** A text box that only ever holds a number. */
export function NumberInput({
	value,
	onChange,
	...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<Input
			inputMode="decimal"
			autoComplete="off"
			value={value}
			onChange={(event) => {
				const next = event.target.value;
				if (NUMERIC.test(next)) onChange(next);
			}}
			{...props}
		/>
	);
}
