// The GameDB source: IGDB covers, artwork and details from LizardByte's GameDB, without an account
// or API key. It finds a game by the operator's pin, then by its title: the same name first, else
// the shortest one that adds a subtitle to it ("Monkey Island 2" → "Monkey Island 2: LeChuck's Revenge").
import {
	type Candidate,
	defineMetadataPlugin,
	type Image,
	type LibraryEntry,
	type Match,
} from "@punktfunk/plugin-kit/metadata";
import { Effect, Schema } from "effect";
import {
	type BucketHit,
	type GameDbGame,
	igdbUrl,
	imageId,
	makeClient,
	squash,
} from "./gamedb.js";
import { genreName, type Lang, resolveLang, systemLang, t } from "./i18n.js";

export const Config = Schema.Struct({
	language: Schema.Literals(["auto", "en", "es"])
		.annotate({
			title: t(systemLang, "languageTitle"),
			description: t(systemLang, "languageDescription"),
		})
		.pipe(
			Schema.withDecodingDefaultKey(Effect.succeed("auto" as const), {
				encodingStrategy: "omit",
			}),
		),
});
type Config = typeof Config.Type;

const langOf = (cfg: Config | undefined): Lang => resolveLang(cfg?.language);

/** Hits shown by "Wrong game?", each with a cover thumbnail. */
const SEARCH_LIMIT = 24;

/** Years a game came out in, earliest first. */
export const yearOf = (g: GameDbGame): number | undefined => {
	const ys = (g.release_dates ?? [])
		.map((d) => d.y)
		.filter((y): y is number => typeof y === "number" && y > 1900);
	return ys.length ? Math.min(...ys) : undefined;
};

/** Search order: the same name, then names extending the term, shortest first. */
export const rank = (
	hits: ReadonlyArray<BucketHit>,
	term: string,
): BucketHit[] => {
	const want = squash(term);
	const score = (h: BucketHit) => (squash(h.name) === want ? 0 : 1);
	return [...hits].sort(
		(a, b) =>
			score(a) - score(b) ||
			a.name.length - b.name.length ||
			Number(a.id) - Number(b.id),
	);
};

/** A name without its subtitle: "Monkey Island 2: LeChuck's Revenge" → "Monkey Island 2". */
export const headOf = (name: string): string =>
	name.split(/\s*:\s|\s+[-–—]\s+|\s+\(/)[0] ?? name;

/**
 * The automatic match for a title: an exact name, else the shortest name that is the title plus
 * a subtitle. Spaces and punctuation don't count ("Little Big Planet 3" is "LittleBigPlanet 3",
 * not "Little Big Planet 3: Dark Souls 3 Costume pack"). Ties go to the entry's year when it has
 * one. Anything looser is a guess, so the operator picks it with "Wrong game?" instead.
 */
export const bestHit = (
	hits: ReadonlyArray<BucketHit>,
	title: string,
	yearFor?: (id: string) => number | undefined,
	year?: number | null,
): BucketHit | undefined => {
	const want = squash(title);
	if (!want) return undefined;
	const exact = hits.filter((h) => squash(h.name) === want);
	const pool = exact.length
		? exact
		: hits.filter((h) => squash(headOf(h.name)) === want);
	if (!pool.length) return undefined;
	if (year != null && yearFor) {
		const same = pool.find((h) => yearFor(h.id) === year);
		if (same) return same;
	}
	return rank(pool, title)[0];
};

const labelOf = (g: GameDbGame): string => {
	const y = yearOf(g);
	return y ? `${g.name} (${y})` : g.name;
};

const toMatch = (g: GameDbGame): Match => ({
	key: String(g.id),
	label: labelOf(g),
});

const coverId = (g: GameDbGame) => imageId(g.cover);
const artworkIds = (g: GameDbGame) =>
	(g.artworks ?? []).map(imageId).filter((x): x is string => !!x);
const screenshotIds = (g: GameDbGame) =>
	(g.screenshots ?? []).map(imageId).filter((x): x is string => !!x);

/** What a record fills: the cover, a wide artwork (screenshot otherwise) and the details. */
export const found = (g: GameDbGame, lang: Lang = "en") => {
	const cover = coverId(g);
	const wide = artworkIds(g)[0] ?? screenshotIds(g)[0];
	const developer = (g.involved_companies ?? []).find((c) => c.developer)
		?.company?.name;
	const genres = (g.genres ?? [])
		.map((x) => x.name)
		.filter((x): x is string => typeof x === "string" && x.length > 0)
		.map((x) => genreName(lang, x));
	return {
		art: {
			portrait: cover ? igdbUrl(cover, "t_cover_big_2x") : undefined,
			hero: wide ? igdbUrl(wide, "t_1080p") : undefined,
		},
		meta: {
			description: g.summary?.trim() || undefined,
			developer: developer || undefined,
			release_year: yearOf(g),
			genres: genres.length ? genres : undefined,
		},
	};
};

const client = makeClient();

/** The record for a pin or a title, or `null` when nothing fits well enough. */
const lookup = (entry: LibraryEntry, pin: string | undefined) =>
	Effect.gen(function* () {
		if (pin) return yield* client.game(pin);
		const hits = yield* client.search(entry.title);
		const hit = bestHit(hits, entry.title);
		if (!hit) return null;
		const year = entry.release_year;
		if (year != null) {
			// Same-name remakes: fetch each exact hit and prefer the entry's year.
			const want = squash(entry.title);
			const same = hits.filter((h) => squash(h.name) === want).slice(0, 6);
			if (same.length > 1) {
				const games = yield* Effect.forEach(same, (h) => client.game(h.id), {
					concurrency: 3,
				});
				const byYear = games.find((g) => g && yearOf(g) === year);
				if (byYear) return byYear;
			}
		}
		return yield* client.game(hit.id);
	});

/** "Wrong game?": every name starting with the term, each with its cover, like Vibepollo's picker. */
export const searchCandidates = (term: string) =>
	Effect.gen(function* () {
		const hits = rank(yield* client.search(term), term).slice(0, SEARCH_LIMIT);
		const games = yield* Effect.forEach(
			hits,
			(h) => client.game(h.id).pipe(Effect.orElseSucceed(() => null)),
			{ concurrency: 6 },
		);
		return hits.map((h, i): Candidate => {
			const g = games[i];
			const cover = g ? coverId(g) : undefined;
			return {
				key: h.id,
				label: g ? labelOf(g) : h.name,
				thumb: cover ? igdbUrl(cover, "t_cover_big") : null,
			};
		});
	});

/** One cover image of a game, labelled with the game, the way Vibepollo's picker shows it. */
const coverImage = (g: GameDbGame): Image | undefined => {
	const c = coverId(g);
	return c
		? {
				url: igdbUrl(c, "t_cover_big_2x"),
				thumb: igdbUrl(c, "t_cover_big"),
				label: labelOf(g),
			}
		: undefined;
};

/**
 * "Choose…": for the cover, the matched game's and every edition sharing its name, like
 * Vibepollo; for a wide slot, the game's artwork, and its screenshots only when it has none.
 */
export const imagesFor = (match: Match, kind: string, lang: Lang = "en") =>
	Effect.gen(function* () {
		const g = yield* client.game(match.key);
		if (!g) return [] as Image[];
		if (kind === "portrait") {
			const term = headOf(g.name);
			const hits = rank(yield* client.search(term), term)
				.filter((h) => h.id !== String(g.id))
				.slice(0, SEARCH_LIMIT - 1);
			const others = yield* Effect.forEach(
				hits,
				(h) => client.game(h.id).pipe(Effect.orElseSucceed(() => null)),
				{ concurrency: 6 },
			);
			return [g, ...others]
				.map((x) => (x ? coverImage(x) : undefined))
				.filter((x): x is Image => !!x);
		}
		if (kind === "hero" || kind === "header") {
			const art = artworkIds(g);
			const ids = art.length ? art : screenshotIds(g);
			const label = t(lang, art.length ? "artwork" : "screenshot");
			return ids.map(
				(id): Image => ({
					url: igdbUrl(id, "t_1080p"),
					thumb: igdbUrl(id, "t_screenshot_med"),
					label,
				}),
			);
		}
		return [] as Image[];
	});

export const plugin = defineMetadataPlugin({
	name: "gamedb",
	title: t(systemLang, "title"),
	configSchema: Config,
	matching: "search",
	offers: {
		art: ["portrait", "hero"],
		meta: ["description", "developer", "release_year", "genres"],
	},
	concurrency: 2,
	commands: {
		search: {
			summary: t(systemLang, "searchSummary"),
			offline: true,
			run: (argv) =>
				searchCandidates(argv.join(" ")).pipe(
					Effect.flatMap((c) =>
						Effect.sync(() => console.log(JSON.stringify(c, null, 2))),
					),
				),
		},
	},
	match: (entry, _cfg, pin) =>
		lookup(entry, pin).pipe(Effect.map((g) => (g ? toMatch(g) : null))),
	fetch: (match, _entry, cfg) =>
		client
			.game(match.key)
			.pipe(Effect.map((g) => (g ? found(g, langOf(cfg)) : {}))),
	search: (term) => searchCandidates(term),
	images: (match, kind, cfg) => imagesFor(match, kind, langOf(cfg)),
});
