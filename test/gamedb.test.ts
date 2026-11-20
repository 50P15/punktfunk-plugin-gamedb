import { describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import {
	bucketOf,
	type Fetch,
	imageId,
	makeClient,
	prefixHits,
} from "../src/gamedb.js";
import { detectLang, genreName, resolveLang, t } from "../src/i18n.js";
import { bestHit, found, normalize, rank } from "../src/plugin.js";

describe("buckets", () => {
	test("first two characters, letters and digits only, like Vibepollo", () => {
		expect(bucketOf("Rayman Origins")).toBe("ra");
		expect(bucketOf("A Way Out")).toBe("a");
		expect(bucketOf("P.T.")).toBe("p");
		expect(bucketOf("!!")).toBe("@");
	});

	test("prefix hits treat whitespace as dots", () => {
		const b = {
			"1": { name: "Monkey Island" },
			"2": { name: "Monkey  Island 2" },
			"3": { name: "Monk" },
		};
		expect(prefixHits(b, "monkey island").map((h) => h.id)).toEqual(["1", "2"]);
		expect(prefixHits(b, "  ")).toEqual([]);
	});

	test("image ids from GameDB urls", () => {
		expect(
			imageId({
				url: "//images.igdb.com/igdb/image/upload/t_thumb/co1v7k.jpg",
			}),
		).toBe("co1v7k");
		expect(imageId({ url: "nope" })).toBeUndefined();
		expect(imageId(undefined)).toBeUndefined();
	});
});

describe("matching", () => {
	const hits = [
		{ id: "61", name: "Monkey Island 2: LeChuck's Revenge" },
		{ id: "66", name: "Monkey Island 2 Special Edition: LeChuck's Revenge" },
		{ id: "324164", name: "Monkey Island 2.5: El Parque de las Pesadillas" },
	];

	test("normalize drops marks, accents and punctuation", () => {
		expect(normalize("Life Is Strange:  Double Exposure")).toBe(
			"life is strange double exposure",
		);
		expect(normalize("Rayman® Origins")).toBe("rayman origins");
		expect(normalize("Pokémon")).toBe("pokemon");
	});

	test("the title plus a subtitle", () => {
		expect(bestHit(hits, "Monkey Island 2")?.id).toBe("61");
	});

	test("an exact name wins over a shorter extension", () => {
		expect(
			bestHit(
				[...hits, { id: "9", name: "Monkey Island 2" }],
				"Monkey Island 2",
			)?.id,
		).toBe("9");
	});

	test("no loose guesses", () => {
		expect(bestHit(hits, "Monkey")).toBeUndefined();
		expect(bestHit(hits, "Something else")).toBeUndefined();
		expect(bestHit(hits, "")).toBeUndefined();
	});

	test("the entry's year breaks a tie", () => {
		const twins = [
			{ id: "1", name: "Prey" },
			{ id: "2", name: "Prey" },
		];
		expect(
			bestHit(twins, "Prey", (id) => (id === "2" ? 2017 : 2006), 2017)?.id,
		).toBe("2");
	});

	test("search ranks the same name first, then shorter names", () => {
		expect(rank(hits, "Monkey Island 2").map((h) => h.id)).toEqual([
			"61",
			"324164",
			"66",
		]);
	});
});

describe("found", () => {
	test("cover, artwork and details", () => {
		const f = found({
			id: 981,
			name: "Rayman Origins",
			cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/co1v7k.jpg" },
			artworks: [
				{ url: "//images.igdb.com/igdb/image/upload/t_thumb/ar5jq0.jpg" },
			],
			summary: " Bubble Dreamer ",
			genres: [{ name: "Platform" }],
			involved_companies: [
				{ company: { name: "Ubisoft Entertainment" }, developer: false },
				{ company: { name: "Ubisoft Montpellier" }, developer: true },
			],
			release_dates: [{ y: 2012 }, { y: 2011 }],
		});
		expect(f.art.portrait).toBe(
			"https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1v7k.jpg",
		);
		expect(f.art.hero).toBe(
			"https://images.igdb.com/igdb/image/upload/t_1080p/ar5jq0.jpg",
		);
		expect(f.meta).toEqual({
			description: "Bubble Dreamer",
			developer: "Ubisoft Montpellier",
			release_year: 2011,
			genres: ["Platform"],
		});
	});

	test("a bare record fills nothing", () => {
		const f = found({ id: 1, name: "X" });
		expect(f.art).toEqual({ portrait: undefined, hero: undefined });
		expect(f.meta.genres).toBeUndefined();
	});
});

describe("client", () => {
	const fake =
		(
			routes: Record<string, { status: number; body?: unknown }>,
			calls: string[] = [],
		): Fetch =>
		async (url) => {
			calls.push(url);
			const path = url.replace(
				/^https:\/\/[^/]+\/LizardByte\/GameDB\/gh-pages/,
				"",
			);
			const r = routes[path] ?? { status: 404 };
			return new Response(r.body === undefined ? "" : JSON.stringify(r.body), {
				status: r.status,
			});
		};

	test("searches the bucket once and caches it", async () => {
		const calls: string[] = [];
		const c = makeClient(
			fake(
				{
					"/buckets/ra.json": {
						status: 200,
						body: { "981": { name: "Rayman Origins" } },
					},
				},
				calls,
			),
		);
		const a = await Effect.runPromise(c.search("Rayman"));
		const b = await Effect.runPromise(c.search("Ray"));
		expect(a).toEqual([{ id: "981", name: "Rayman Origins" }]);
		expect(b.length).toBe(1);
		expect(calls.length).toBe(1);
	});

	test("an unknown id is null; a non-numeric id is never fetched", async () => {
		const calls: string[] = [];
		const c = makeClient(fake({}, calls));
		expect(await Effect.runPromise(c.game("5"))).toBeNull();
		expect(await Effect.runPromise(c.game("../x"))).toBeNull();
		expect(calls.length).toBe(1);
	});

	test("429 stops the round as rate limited; 500 is an error", async () => {
		const c = makeClient(
			fake({
				"/games/1.json": { status: 429 },
				"/games/2.json": { status: 500 },
			}),
		);
		const r1 = await Effect.runPromiseExit(c.game("1"));
		const r2 = await Effect.runPromiseExit(c.game("2"));
		expect(
			Exit.isFailure(r1) &&
				JSON.stringify(r1.cause).includes("SourceRateLimited"),
		).toBe(true);
		expect(
			Exit.isFailure(r2) && JSON.stringify(r2.cause).includes("GameDbError"),
		).toBe(true);
	});
});

const live = process.env.GAMEDB_LIVE === "1";
describe.skipIf(!live)("live GameDB", () => {
	const titles: Array<[string, string]> = [
		["A Way Out", "36897"],
		["Rayman Origins", "981"],
		["The Last Guardian", "117"],
		["Monkey Island 2", "61"],
		["Unravel Two", "19241"],
		["Return to Monkey Island", "195517"],
	];
	for (const [title, id] of titles) {
		test(`matches ${title}`, async () => {
			const c = makeClient();
			const hits = await Effect.runPromise(c.search(title));
			expect(bestHit(hits, title)?.id).toBe(id);
		}, 30_000);
	}
});

describe("i18n", () => {
	test("detects Spanish from the environment or ICU, English otherwise", () => {
		expect(detectLang({ LANG: "es_ES.UTF-8" })).toBe("es");
		expect(detectLang({ LANG: "es" })).toBe("es");
		expect(detectLang({ LANG: "C" }, () => "es-MX")).toBe("es");
		expect(detectLang({}, () => "en-US")).toBe("en");
		expect(detectLang({ LANG: "et_EE" })).toBe("en");
		expect(
			detectLang({}, () => {
				throw new Error("no ICU");
			}),
		).toBe("en");
	});

	test("a setting wins over the system language", () => {
		expect(resolveLang("es")).toBe("es");
		expect(resolveLang("en")).toBe("en");
	});

	test("labels and genres in both languages", () => {
		expect(t("es", "artwork")).toBe("Ilustración");
		expect(t("en", "artwork")).toBe("Artwork");
		expect(genreName("es", "Platform")).toBe("Plataformas");
		expect(genreName("es", "Something New")).toBe("Something New");
		expect(genreName("en", "Platform")).toBe("Platform");
		const g = {
			id: 1,
			name: "X",
			genres: [{ name: "Platform" }, { name: "Adventure" }],
		};
		expect(found(g, "es").meta.genres).toEqual(["Plataformas", "Aventura"]);
		expect(found(g).meta.genres).toEqual(["Platform", "Adventure"]);
	});
});
