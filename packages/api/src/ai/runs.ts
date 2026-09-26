// The generations that are still out, and the one thing each says before it
// answers: how much of the book went.

import { Failure } from "../failure";
import { Channel, Runs } from "../lib/runs";

/** Said once per generation, the moment the book has been read and before the
 *  endpoint is asked anything. */
export interface GenerationSent {
	run: string;
	chars: number;
}

const said = new Channel<GenerationSent>();

const out = new Runs();

/** Runs one generation, and lets the button stop it. `work` is handed the
 *  controller the button aborts, which the call to the endpoint goes out on. */
export function stoppable<T>(
	run: string,
	work: (controller: AbortController) => Promise<T>,
): Promise<T> {
	return out.run(run, (controller) => {
		const stopped = new Promise<never>((_, reject) => {
			controller.signal.addEventListener(
				"abort",
				() => reject(Failure.bare("aiStopped")),
				{ once: true },
			);
		});
		return Promise.race([work(controller), stopped]);
	});
}

/** Stops the generation with this id, if it is still out. Saying so about one
 *  that has already finished is not an error -- the answer and the button can
 *  cross. */
export function stopGeneration(run: string): void {
	out.stop(run);
}

/** Says how much of the book is about to go, before any of it does. */
export function announce(run: string, chars: number): { chars: number } {
	said.say({ run, chars });
	return { chars };
}

/** Every announcement, until the signal says to stop listening. */
export function generationSent(
	signal?: AbortSignal,
): AsyncGenerator<GenerationSent> {
	return said.listen(signal);
}
