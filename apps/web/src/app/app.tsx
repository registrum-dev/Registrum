import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { queryClient } from "@/lib/query";
import { router } from "./router";

export function App() {
	return (
		// Outside the router, because what the library answered outlives the
		// screen that asked: stepping from the shelf into a book and back is not
		// a reason to ask the database the same question again.
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
}
