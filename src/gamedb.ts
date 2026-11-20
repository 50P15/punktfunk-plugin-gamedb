// LizardByte GameDB: a static mirror of IGDB served from GitHub Pages, the database Sunshine,
// Apollo and Vibepollo search for covers. No account and no key: a title's first two characters
// name a bucket of ids and names, and each id has its own record with the IGDB image ids.
import { SourceRateLimited } from "@punktfunk/plugin-kit/metadata";
import { Data, Effect } from "effect";

export const BASE =
	"https://raw.githubusercontent.com/LizardByte/GameDB/gh-pages";
const IMAGES = "https://images.igdb.com/igdb/image/upload";
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const BUCKET_TTL_MS = 6 * 60 * 60 * 1000;
const GAME_CACHE_MAX = 500;

export interface GameDbImage {
	readonly id?: number;
	readonly url?: string;
}

export interface GameDbGame {
	readonly id: number;
	readonly name: string;
	readonly cover?: GameDbImage;
	readonly artworks?: ReadonlyArray<GameDbImage>;
	readonly screenshots?: ReadonlyArray<GameDbImage>;
	readonly summary?: string;
	readonly genres?: ReadonlyArray<{ readonly name?: string }>;
	readonly involved_companies?: ReadonlyArray<{
		readonly company?: { readonly name?: string };
		readonly developer?: boolean;
	}>;
	readonly release_dates?: ReadonlyArray<{ readonly y?: number }>;
}

export interface BucketHit {
	readonly id: string;
	readonly name: string;
}

export class GameDbError extends Data.TaggedError("GameDbError")<{
	readonly path: string;
	readonly status?: number;
	readonly cause?: unknown;
}> {
	override get message(): string {
		const why =
			this.status !== undefined
				? `HTTP ${this.status}`
				: this.cause instanceof Error
					? this.cause.message
					: String(this.cause);
		return `GameDB ${this.path}: ${why}`;
	}
}

export type Failure = GameDbError | SourceRateLimited;
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** The bucket a name lives in: its first two characters, lowercased, letters and digits only. */
export const bucketOf = (name: string): string => {
	const prefix = name
		.trim()
		.substring(0, 2)
		.toLocaleLowerCase()
		.replace(/[^a-z\d]/g, "");
	return prefix || "@";
};

/** Vibepollo's prefix test: whitespace runs as dots, case-insensitive. */
const dotted = (s: string): string =>
	s.trim().replace(/\s+/g, ".").toLocaleLowerCase();

/** Letters and digits only, without accents: "Little Big Planet" and "LittleBigPlanet" agree. */
export const squash = (s: string): string =>
	s
		.toLocaleLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "");

/**
 * Names in a bucket that start with the term: Vibepollo's cover picker test, or the same with
 * spaces and punctuation ignored, so "Little Big Planet" also finds "LittleBigPlanet".
 */
export const prefixHits = (
	bucket: Readonly<Record<string, { readonly name?: unknown }>>,
	term: string,
): BucketHit[] => {
	const want = dotted(term);
	if (!want) return [];
	const loose = squash(term);
	const out: BucketHit[] = [];
	for (const [id, item] of Object.entries(bucket)) {
		if (
			typeof item?.name === "string" &&
			(dotted(item.name).startsWith(want) ||
				(loose !== "" && squash(item.name).startsWith(loose)))
		) {
			out.push({ id, name: item.name });
		}
	}
	return out;
};

/** An IGDB image id from a GameDB url such as `//images.igdb.com/.../t_thumb/co1v7k.jpg`. */
export const imageId = (img: GameDbImage | undefined): string | undefined => {
	const url = img?.url;
	if (typeof url !== "string") return undefined;
	const m = /\/([A-Za-z0-9_-]+)\.(?:jpg|jpeg|png|webp)$/.exec(url);
	return m?.[1];
};

/** An IGDB CDN URL for an image id at a size (`t_cover_big_2x`, `t_1080p`, …). */
export const igdbUrl = (id: string, size: string): string =>
	`${IMAGES}/${size}/${id}.jpg`;

const readCapped = async (res: Response): Promise<string> => {
	const declared = Number(res.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > MAX_BYTES) {
		throw new Error(`body larger than ${MAX_BYTES} bytes`);
	}
	const buf = await res.arrayBuffer();
	if (buf.byteLength > MAX_BYTES) {
		throw new Error(`body larger than ${MAX_BYTES} bytes`);
	}
	return new TextDecoder().decode(buf);
};

const retryAfterMs = (header: string | null): number => {
	const s = Number(header);
	return Number.isFinite(s) && s > 0 ? s * 1000 : 60_000;
};

export const makeClient = (
	fetchImpl: Fetch = fetch,
	now: () => number = Date.now,
) => {
	const buckets = new Map<
		string,
		{ at: number; data: Record<string, { name?: unknown }> }
	>();
	const games = new Map<string, GameDbGame | null>();

	/** A file's JSON, or `null` for a 404: an unknown id or empty bucket is an answer. */
	const get = <T>(path: string): Effect.Effect<T | null, Failure> =>
		Effect.tryPromise({
			try: async () => {
				const res = await fetchImpl(`${BASE}${path}`, {
					redirect: "manual",
					signal: AbortSignal.timeout(TIMEOUT_MS),
				});
				return {
					status: res.status,
					retryAfter: res.headers.get("retry-after"),
					text: res.ok ? await readCapped(res) : "",
				};
			},
			catch: (cause) => new GameDbError({ path, cause }),
		}).pipe(
			Effect.flatMap((r): Effect.Effect<T | null, Failure> => {
				if (r.status === 429) {
					return Effect.fail(
						new SourceRateLimited({ retryAfterMs: retryAfterMs(r.retryAfter) }),
					);
				}
				if (r.status === 404) return Effect.succeed(null);
				if (r.status < 200 || r.status >= 300) {
					return Effect.fail(new GameDbError({ path, status: r.status }));
				}
				return Effect.try({
					try: () => JSON.parse(r.text) as T,
					catch: (cause) => new GameDbError({ path, cause }),
				});
			}),
		);

	const bucket = (key: string) => {
		const hit = buckets.get(key);
		if (hit && now() - hit.at < BUCKET_TTL_MS) return Effect.succeed(hit.data);
		return get<Record<string, { name?: unknown }>>(
			`/buckets/${encodeURIComponent(key)}.json`,
		).pipe(
			Effect.map((d) => {
				const data = d && typeof d === "object" ? d : {};
				buckets.set(key, { at: now(), data });
				return data;
			}),
		);
	};

	const game = (id: string): Effect.Effect<GameDbGame | null, Failure> => {
		if (!/^\d{1,10}$/.test(id)) return Effect.succeed(null);
		if (games.has(id)) return Effect.succeed(games.get(id) ?? null);
		return get<GameDbGame>(`/games/${id}.json`).pipe(
			Effect.map((g) => {
				const ok = g && typeof g.name === "string" ? g : null;
				if (games.size >= GAME_CACHE_MAX) {
					const first = games.keys().next().value;
					if (first !== undefined) games.delete(first);
				}
				games.set(id, ok);
				return ok;
			}),
		);
	};

	return {
		/**
		 * Every name that starts with the term. Without its spaces the term can sit in another
		 * bucket ("A Way Out" in `a`, "AWayOut" in `aw`), so both are read.
		 */
		search: (term: string): Effect.Effect<BucketHit[], Failure> => {
			if (!term.trim()) return Effect.succeed([]);
			const keys = [...new Set([term, squash(term) || term].map(bucketOf))];
			return Effect.forEach(keys, (k) => bucket(k), { concurrency: 2 }).pipe(
				Effect.map((bs) => {
					const seen = new Set<string>();
					return bs
						.flatMap((b) => prefixHits(b, term))
						.filter((h) => !seen.has(h.id) && seen.add(h.id) !== undefined);
				}),
			);
		},
		game,
	};
};

export type GameDbClient = ReturnType<typeof makeClient>;
