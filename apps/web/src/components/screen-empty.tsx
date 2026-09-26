import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@registrum/ui/components/empty";
import { cn } from "@registrum/ui/lib/utils";
import type { ReactNode } from "react";

/** A whole screen with nothing on it: why, in the middle, and the way out. */
export function ScreenEmpty({
	icon,
	title,
	description,
	className,
	children,
}: {
	icon: ReactNode;
	title: ReactNode;
	description: ReactNode;
	/** How tall the frame it sits in the middle of is. */
	className?: string;
	/** The one thing to do about it, where there is one. */
	children?: ReactNode;
}) {
	return (
		<div
			className={cn("flex h-full items-center justify-center p-10", className)}
		>
			<Empty className="border-0 bg-transparent">
				<EmptyHeader>
					<EmptyMedia
						variant="icon"
						className="rounded-xl bg-accent text-accent-foreground"
					>
						{icon}
					</EmptyMedia>
					<EmptyTitle>{title}</EmptyTitle>
					<EmptyDescription>{description}</EmptyDescription>
				</EmptyHeader>
				{children}
			</Empty>
		</div>
	);
}
