// The pieces more than one schema needs.

import { z } from "zod";

export const filledText = z.string().refine((value) => value.trim() !== "");

export const textOrNull = filledText.nullable().catch(null);

export const optionalText = filledText.optional().catch(undefined);

export const looseRecord = z.record(z.string(), z.unknown()).catch({});
