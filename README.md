# @sopis/plugin-gamedb

[Español](README.es.md)

A Punktfunk Art & Metadata source that finds covers the way Sunshine, Apollo and Vibepollo do:
from [LizardByte GameDB](https://github.com/LizardByte/GameDB), a static mirror of
[IGDB](https://www.igdb.com). **No account or API key.**

- Fills the portrait cover, a hero image (IGDB artwork, else a screenshot), description,
  developer, release year and genres.
- Matches a title automatically only when the name is the same, or the same plus a subtitle
  (`Monkey Island 2` → `Monkey Island 2: LeChuck's Revenge`). Anything else: open the game,
  **Wrong game?**, type a name and pick a cover — the same picker as Vibepollo.
- Spaces and punctuation don't count when matching or searching: `Little Big Planet` finds
  `LittleBigPlanet`.
- **Choose…** on the cover lists the covers of every edition sharing the game's name.

## Install

Available in **Punktfunk's official catalog** as **GameDB** (Punktfunk 0.47.0 or later).

### a) From the web console

1. Open **Plugins → Browse**.
2. Search for **GameDB**, open its card and click **Install**.
3. Once installed, turn it on under **Library → Sources → Art & Metadata**.

The catalog installation is reviewed and does not require **Install from package spec…**
or the unverified-code confirmation.

### b) From a terminal (direct npm installation)

On the host, from an elevated terminal (Windows) or as the host user (Linux):

```sh
punktfunk-host plugins add @sopis/plugin-gamedb --allow-public-registry
```

Then turn it on under **Library → Sources → Art & Metadata**.

This command installs directly from npm, outside the reviewed catalog flow, and may show as
**Unverified**. Prefer the web console above to install the catalog's reviewed version.

### If it shows "Stopped"

Restart the plugin runner (**Plugins → Installed → Plugin runner**, or):

```sh
punktfunk-host plugins disable
punktfunk-host plugins enable
```

### From a local build

`bun install && bun run build && bun pm pack`, copy the `.tgz` into the plugins folder
(`%ProgramData%\punktfunk\plugins` on Windows, `~/.config/punktfunk/plugins` on Linux) and run
`punktfunk-host plugins add ./sopis-plugin-gamedb-1.0.2.tgz --allow-public-registry` there. Keep
the `./`: a path without a `/` is read as a plugin name.

## Language

English and Spanish. The source's setting **Language** picks one; **auto** follows the host's
system language. It translates the console title, image labels and genres. Descriptions stay in
English, the only language IGDB has them in. After changing it, refresh the source so details
already filled pick up the new genres.

## CLI

```sh
punktfunk-plugin-gamedb search Rayman Origins   # offline: list candidates with cover URLs
punktfunk-plugin-gamedb lookup <library id>
punktfunk-plugin-gamedb uninstall
```

## Credits

Game data and images © [IGDB](https://www.igdb.com), via LizardByte GameDB. This plugin only
links to them; it ships no data.

License: MIT OR Apache-2.0.
