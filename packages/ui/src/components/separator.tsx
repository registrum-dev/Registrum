"use client";

import { cn } from "@Registrum/ui/lib/utils";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

function Separator({
	className,
	orientation = "horizontal",
	...props
}: SeparatorPrimitive.Props) {
	return (
		<SeparatorPrimitive
			data-slot="separator"
			orientation={orientation}
			className={cn(
				// A vertical separator is centred, not stretched. `align-self: stretch`
				// falls back to flex-start the moment the item has a height of its own,
				// and every vertical separator here is given one — so stretching left
				// them hanging from the top of the bar they divide.
				"shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-center",
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };
