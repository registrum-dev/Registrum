// The page's fullscreen, from the settings panel, F11 and Escape.

export async function toggleFullscreen(): Promise<void> {
	try {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await document.documentElement.requestFullscreen();
	} catch {
		// Refused -- an iframe without the permission, or a phone browser that
		// has no fullscreen for a page.
	}
}

export async function exitFullscreen(): Promise<void> {
	try {
		if (document.fullscreenElement) await document.exitFullscreen();
	} catch {
		// Nothing to leave.
	}
}
