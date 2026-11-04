# Crater Critters

A turn-based artillery brawl (hedgehog-like critters, destructible islands, 33 weapons),
hot-seat or online for up to 8 players. Live at https://critters.charsi.cc.

## Layout

```
src/index.html      page template (markup; <!--STYLE--> and <!--SCRIPT--> placeholders)
src/style.css       all styles
src/js/NN-*.js      game modules, concatenated in filename order into one classic script:
                    header · config · util · audio · terrain · physics · fx · entities ·
                    weapons · ai · input · render · ui · game · net · chat · profile · boot
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

## Online + leaderboard

Rooms use Supabase Realtime broadcast (host-authoritative snapshots); profiles and the
leaderboard use two Postgres RPCs (`cc_set_name`, `cc_report_match`) and the
`cc_leaderboard` view, all reachable with the public anon key in `src/js/14-net.js`.
