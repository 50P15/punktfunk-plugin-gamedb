#!/usr/bin/env bun
// `punktfunk-plugin-gamedb lookup <library id>` prints what GameDB has for one game;
// `uninstall` removes everything this source filled.
import { plugin } from "./plugin.js";

await plugin.cli();
