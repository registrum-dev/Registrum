import { useEffect, useEffectEvent, useRef } from "react";
import type { BookSource } from "@/features/reader/open-book";
import {
	applyRendererSettings,
	type MountCallbacks,
	type MountedBook,
	mountBook,
} from "@/features/reader/open-view";
import { useReaderSettings } from "@/features/reader/store";

interface ReaderViewProps extends Omit<MountCallbacks, "settings"> {
	source: BookSource;
	/**
	 * CFI to open at: where this book was last left, or where it was before a
	 * setting forced a remount. Read once, at mount.
	 */
	initialLocation?: string;
}

/** Wraps foliate-js's `<foliate-view>` custom element. */
export function ReaderView({
	source,
	initialLocation,
	...callbacks
}: ReaderViewProps) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const mounted = useRef<MountedBook | null>(null);
	const settings = useReaderSettings((state) => state.settings);

	// Reachable from the mount without making it re-run and re-parse the book.
	const latest = useEffectEvent(
		(): MountCallbacks => ({
			...callbacks,
			settings,
		}),
	);

	// Read once, at mount: later relocations must not change where we open.
	const openAt = useRef(initialLocation);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		const book = mountBook(host, {
			source,
			openAt: openAt.current,
			latest,
		});
		mounted.current = book;
		return () => {
			mounted.current = null;
			book.dispose();
		};
	}, [source]);

	useEffect(() => {
		const view = mounted.current?.view();
		if (view) applyRendererSettings(view, settings);
	}, [settings]);

	return <div ref={hostRef} className="h-full w-full" />;
}
