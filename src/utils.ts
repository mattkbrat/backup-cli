import { options } from "./program";

export const log = {
	info: (...args: unknown[]) => console.log(...args),
	verbose: (...args: unknown[]) =>
		options.verbose && console.log("[VERBOSE]", ...args),
	error: (...args: unknown[]) => console.error("[ERROR]", ...args),
	success: (...args: unknown[]) => console.log("[SUCCESS]", ...args),
};
