// English and Spanish. The language is the plugin setting, else the host's system language.

export type Lang = "en" | "es";
export type LangSetting = "auto" | Lang;

/** The system language from the environment or ICU: `es` for any Spanish locale, else `en`. */
export const detectLang = (
	env: Record<string, string | undefined> = process.env,
	intlLocale: () => string = () =>
		Intl.DateTimeFormat().resolvedOptions().locale,
): Lang => {
	const fromEnv = env.LC_ALL || env.LC_MESSAGES || env.LANG || env.LANGUAGE;
	let locale = fromEnv && fromEnv !== "C" && fromEnv !== "POSIX" ? fromEnv : "";
	if (!locale) {
		try {
			locale = intlLocale();
		} catch {
			locale = "";
		}
	}
	return /^es(?:[-_.@]|$)/i.test(locale) ? "es" : "en";
};

export const systemLang: Lang = detectLang();

export const resolveLang = (setting: LangSetting | undefined): Lang =>
	setting === "en" || setting === "es" ? setting : systemLang;

const strings = {
	en: {
		title: "GameDB (IGDB covers, no key)",
		languageTitle: "Language",
		languageDescription:
			"Language for this source's labels and genres. Auto follows the host's system language. Descriptions stay in English: IGDB has no others.",
		artwork: "Artwork",
		screenshot: "Screenshot",
		searchSummary:
			"search GameDB by name and print the candidates (search <name>)",
	},
	es: {
		title: "GameDB (carátulas IGDB, sin clave)",
		languageTitle: "Idioma",
		languageDescription:
			"Idioma de las etiquetas y los géneros de esta fuente. Auto sigue el idioma del sistema. Las descripciones siguen en inglés: IGDB no tiene otras.",
		artwork: "Ilustración",
		screenshot: "Captura",
		searchSummary:
			"busca en GameDB por nombre y muestra los candidatos (search <nombre>)",
	},
} as const;

export type Key = keyof (typeof strings)["en"];

export const t = (
	lang: Lang,
	key: Key,
	vars: Record<string, string> = {},
): string =>
	strings[lang][key].replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);

/** IGDB's genre names in Spanish. Unknown ones stay as IGDB names them. */
const GENRES_ES: Readonly<Record<string, string>> = {
	"Point-and-click": "Point and click",
	Fighting: "Lucha",
	Shooter: "Disparos",
	Music: "Música",
	Platform: "Plataformas",
	Puzzle: "Puzle",
	Racing: "Carreras",
	"Real Time Strategy (RTS)": "Estrategia en tiempo real (RTS)",
	"Role-playing (RPG)": "Rol (RPG)",
	Simulator: "Simulación",
	Sport: "Deportes",
	Strategy: "Estrategia",
	"Turn-based strategy (TBS)": "Estrategia por turnos (TBS)",
	Tactical: "Táctica",
	"Hack and slash/Beat 'em up": "Hack and slash / Beat 'em up",
	"Quiz/Trivia": "Preguntas y respuestas",
	Pinball: "Pinball",
	Adventure: "Aventura",
	Indie: "Indie",
	Arcade: "Arcade",
	"Visual Novel": "Novela visual",
	"Card & Board Game": "Cartas y tablero",
	MOBA: "MOBA",
};

export const genreName = (lang: Lang, name: string): string =>
	lang === "es" ? (GENRES_ES[name] ?? name) : name;
