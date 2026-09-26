// The browser's sign-in, when the server has a password set.

export interface Session {
	/** Whether the server asks for a password at all. */
	required: boolean;
	signedIn: boolean;
}

/** Where this browser stands. A server that does not answer is left to the
 *  app itself to report: nothing here can do better. */
export async function fetchSession(): Promise<Session> {
	try {
		const response = await fetch("/api/session", {
			credentials: "same-origin",
		});
		if (response.ok) return (await response.json()) as Session;
	} catch {
		// Reported by the first question the app asks.
	}
	return { required: false, signedIn: true };
}

export async function signIn(password: string): Promise<boolean> {
	const response = await fetch("/api/login", {
		method: "POST",
		credentials: "same-origin",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ password }),
	});
	return response.ok;
}

/** Signs out and starts over, which lands on the sign-in. */
export async function signOut(): Promise<void> {
	await fetch("/api/logout", {
		method: "POST",
		credentials: "same-origin",
	}).catch(() => null);
	location.reload();
}
