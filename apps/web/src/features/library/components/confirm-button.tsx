// A button that asks first.

import { Button } from "@Registrum/ui/components/button";
import { type ReactNode, useState } from "react";
import { Confirm } from "@/components/confirm";

/** A button whose press is the question, and whose answer is `onConfirm`. */
export function ConfirmButton({
	title,
	description,
	confirmLabel,
	destructive,
	onConfirm,
	children,
	...button
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "title"> & {
	title: ReactNode;
	description: ReactNode;
	confirmLabel: string;
	/** Off for the ones that only cost work, not data. */
	destructive?: boolean;
	onConfirm: () => void;
}) {
	const [asking, setAsking] = useState(false);

	return (
		<>
			<Button {...button} onClick={() => setAsking(true)}>
				{children}
			</Button>
			<Confirm
				open={asking}
				onOpenChange={setAsking}
				title={title}
				description={description}
				confirmLabel={confirmLabel}
				destructive={destructive}
				onConfirm={() => {
					setAsking(false);
					onConfirm();
				}}
			/>
		</>
	);
}
