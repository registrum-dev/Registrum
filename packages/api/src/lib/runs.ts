// Long jobs the screen can stop, and the news they send while they go.

import { EventEmitter, on } from "node:events";

/** The jobs that are going, one per key at most. Starting a job on a key that
 *  already has one stops the one before it. */
export class Runs {
	readonly #going = new Map<string, AbortController>();

	/** Runs `work` under this key. Its controller is the one `stop` aborts, and
	 *  what it signals is whether the job has been stopped. */
	async run<T>(
		key: string,
		work: (controller: AbortController) => Promise<T>,
	): Promise<T> {
		const controller = new AbortController();
		this.#going.get(key)?.abort();
		this.#going.set(key, controller);
		try {
			return await work(controller);
		} finally {
			if (this.#going.get(key) === controller) this.#going.delete(key);
		}
	}

	/** Stops the job under this key, if one is going. Saying so about one that
	 *  has already finished is not an error. */
	stop(key: string): void {
		this.#going.get(key)?.abort();
		this.#going.delete(key);
	}
}

/** Something said to everyone listening at the moment it is said. */
export class Channel<T> {
	readonly #emitter = new EventEmitter().setMaxListeners(0);

	say(value: T): void {
		this.#emitter.emit("said", value);
	}

	/** Everything said, until the signal says to stop listening. */
	async *listen(signal?: AbortSignal): AsyncGenerator<T> {
		for await (const [value] of on(this.#emitter, "said", { signal }))
			yield value as T;
	}
}
