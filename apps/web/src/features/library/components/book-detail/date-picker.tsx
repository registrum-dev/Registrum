// A day typed, or picked from a calendar, rather than the platform's date
// field.

import { parseDay, toDay } from "@Registrum/api/types";
import { Calendar } from "@Registrum/ui/components/calendar";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@Registrum/ui/components/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@Registrum/ui/components/popover";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { enUS, ja } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";

/** How far back the year list reaches. */
const FIRST_YEAR = 1800;

/** A day as `YYYY-MM-DD`, or `""` for none. */
export function DatePicker({
	id,
	value,
	onChange,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const { t, i18n } = useTranslation();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(value);
	const [seen, setSeen] = useState(value);
	const selected = fromValue(value);

	// Only a day set from outside rewrites the text. One typed in stays as typed:
	// "2024/3/1" is not reformatted under a finger about to add the 5.
	if (value !== seen) {
		setSeen(value);
		if ((draft.trim() === "" ? "" : parseDay(draft)) !== value) setDraft(value);
	}

	const type = (text: string) => {
		setDraft(text);
		if (text.trim() === "") onChange("");
		else {
			const day = parseDay(text);
			if (day !== null) onChange(day);
		}
	};

	// What cannot be read as a day goes back to the day that was kept.
	const settle = () => setDraft(value);

	return (
		<InputGroup>
			<InputGroupInput
				id={id}
				value={draft}
				placeholder={t("edit.datePlaceholder")}
				autoComplete="off"
				aria-invalid={draft.trim() !== "" && parseDay(draft) === null}
				onChange={(event) => type(event.target.value)}
				onBlur={settle}
				onKeyDown={(event) => {
					if (event.key === "Enter") settle();
				}}
			/>
			<InputGroupAddon align="inline-end">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger
						render={
							<InputGroupButton
								size="icon-xs"
								aria-label={t("edit.pickDate")}
							/>
						}
					>
						<CalendarIcon />
					</PopoverTrigger>
					<PopoverContent align="end" className="w-auto p-0">
						<Calendar
							mode="single"
							captionLayout="dropdown"
							locale={i18n.language === "ja" ? ja : enUS}
							selected={selected}
							defaultMonth={selected}
							startMonth={new Date(FIRST_YEAR, 0)}
							endMonth={new Date(new Date().getFullYear() + 1, 11)}
							onSelect={(date) => {
								const day = date ? toValue(date) : "";
								setDraft(day);
								onChange(day);
								setOpen(false);
							}}
						/>
					</PopoverContent>
				</Popover>
			</InputGroupAddon>
		</InputGroup>
	);
}

// Local midnight both ways: the value is a day, not an instant.
function fromValue(value: string): Date | undefined {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return undefined;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toValue(date: Date): string {
	return toDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) ?? "";
}
