// The shelf's frame: one screen, clear of the phone's bars.

/** The shelf's frame. */
export function ScreenFrame({ children }: { children: React.ReactNode }) {
	return (
		<main
			className="screen-pane relative flex h-full w-full min-w-0 flex-col bg-background"
			style={{
				paddingTop: "var(--safe-top)",
				paddingLeft: "var(--safe-left)",
				paddingRight: "var(--safe-right)",
			}}
		>
			{children}
		</main>
	);
}
