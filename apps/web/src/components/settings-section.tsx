// One labelled block of settings.

export function SettingsSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="motion-rise flex flex-col gap-3">
			<h2 className="font-semibold text-[13px]">{title}</h2>
			{children}
		</section>
	);
}
