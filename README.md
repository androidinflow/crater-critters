# Crater Critters

A turn-based artillery brawl (hedgehog-like critters, destructible islands, 105 weapons),
hot-seat or online for up to 8 players. Live at https://critters.charsi.cc.

## Layout

```
src/index.html      page template (markup; <!--STYLE--> and <!--SCRIPT--> placeholders)
src/style.css       all styles
src/js/NN-*.js      game modules, concatenated in filename order into one classic script:
                    header · config · util · audio · terrain · physics · fx · entities ·
                    arsenal entities · weapons · arsenal icons · ai · input · render · ui ·
                    game · net · chat · profile · boot
build.js            bundles src/ into crater-critters.html (no dependencies)
crater-critters.html  the built, deployable single file (committed; the Dockerfile serves it)
```

The modules share one script scope, so a module may use anything declared by an earlier
one (and functions from later ones at call time). Keep the numbering in dependency order.

## Develop

```
node build.js --watch     # rebuild on every change under src/
python3 -m http.server 8765
open http://localhost:8765/crater-critters.html
```

Commit the rebuilt `crater-critters.html` together with the `src/` change.

## Adding a weapon

1. `01-config.js`: a `WEAPONS` entry (`id`, `name`, `kind`, `cat`, `hint`, `desc`, `stats`) and ammo in `MORE_AMMO` / `MORE_POOL`.
2. Thrown things are usually just a `PROJ` row in `07-entities.js` (fuse/impact, cluster, fire, gas, remote…);
   anything else gets a `case` in `fireInstant` / `doClickAction` (`08-weapons.js`) and maybe a class in `07a-arsenal.js`.
3. An icon `case` in `08a-arsenal-icons.js`, drawing code in `11-render.js` if it is a new entity, and a `NET_KINDS`
   row in `14-net.js` so online guests can see it.
4. Optionally teach the AI about it in `09-ai.js`.

## Online + leaderboard

Rooms use Supabase Realtime broadcast (host-authoritative snapshots); profiles and the
leaderboard use two Postgres RPCs (`cc_set_name`, `cc_report_match`) and the
`cc_leaderboard` view, all reachable with the public anon key in `src/js/14-net.js`.

If the host disappears (tab closed, laptop shut) the guests hold an election after ~12 s of
silence (or at once after a goodbye): the present player with the lowest team number
promotes itself, rebuilds the world from its mirrored state (`rehydrate` in `14-net.js`),
bumps the epoch so stale host packets are ignored and re-sends `init`. The old host's team
is played by the AI until they rejoin with the same profile name.

## Custom maps (beta)

Map → "Custom image" lets a player pick a PNG/JPEG/WebP. Transparent pixels are air (in an
image with no transparency, white is air); everything else is ground drawn in the image's
own colours, fitted above the water line. The image is kept in localStorage on that device.
Local games only for now: an online host with a custom map gets a random map instead.
