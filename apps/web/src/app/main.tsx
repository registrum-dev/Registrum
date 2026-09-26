// The app is loaded only after the sign-in, so that nothing asks the server
// a question it would refuse.

import React from "react";
import ReactDOM from "react-dom/client";

import { fetchSession } from "@/features/session/session";
import "@/i18n";
import "../index.css";

const element = document.getElementById("root");
if (!element) throw new Error("Root element not found");
const screen = ReactDOM.createRoot(element);

void fetchSession().then(async (session) => {
	if (session.required && !session.signedIn) {
		const { SignIn } = await import("@/features/session/components/sign-in");
		screen.render(
			<React.StrictMode>
				<SignIn />
			</React.StrictMode>,
		);
		return;
	}
	const [{ App }, { rememberSession }] = await Promise.all([
		import("./app"),
		import("@/features/session/queries"),
	]);
	rememberSession(session);
	screen.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
});
