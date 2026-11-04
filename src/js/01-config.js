// ============================== CONFIG ==============================
const CFG = {
  W: 2400, H: 1200, DT: 1 / 60,
  G: 520,              // gravity, px/s²
  WIND_ACC: 230,       // wind acceleration at |wind| = 1, scaled per-projectile by windF
  MAX_POWER: 980,      // launch speed at full charge, px/s
  CHARGE_TIME: 1.1,    // seconds to fill the power bar
  CR: 10,              // critter radius
  WALK: 58,            // walk speed px/s
  CLIMB: 3,            // max px climbed per px walked (≈72° slope limit)
  JUMP: [150, -270], FLIP: [-75, -400],
  FALL_SAFE: 480,      // impact speed (px/s) before fall damage kicks in (~220px drop)
  FALL_DIV: 9,
  RETREAT: 3,
  PER_TEAM: 4, HP: 100,
  WATER0: 1120,
  GIRDER_RANGE: 260,
};
const TEAM_COLORS = ['#ff4d6d', '#3a86ff', '#ffbe0b', '#2ec4b6', '#9d4edd', '#fb5607', '#8ac926', '#ff8fab'];
const MAX_TEAMS = 8;
const NAMES = ['Pip','Bramble','Nibs','Spud','Tuft','Prickle','Mochi','Waffles','Bean','Noodle','Biscuit','Sprout',
  'Tater','Fizz','Pebble','Doodle','Gizmo','Puddle','Crumb','Bonk','Wobbles','Zest','Toffee','Squeak','Pogo','Nugget',
  'Pickle','Munch','Dizzy','Scoot','Fudge','Twig','Blip','Snug','Rascal','Pudding','Ziggy','Mellow','Scamp','Nibble'];
const QUIPS = {
  hit: ['Ow, my quills!','Not the face!','Rude!','Right in the snoot!','Totally meant that.','My spines!','Who ordered THAT?',
    'Ouchie wawa!','I\'m too round for this!','Hey! I just got fluffed!','That tickled… NOT!','Mommy?!','Boing?!'],
  lose: ['Uhh… which button?','Zzz…','I forgot my snack.','Wait, my turn?','Bloop.','Thinking… still thinking…'],
  turn: ['Let\'s roll!','Spike time!','Hold my acorn.','Here goes nothing!','Tactical waddle!','Watch this!','Hehehe.'],
  death: ['Tell mum I was spiky!','Worth it…','I regret nothing!','Bye-bye!','Curl up… and…','Avenge meeee!'],
  fire: ['Fire in the hole!','Catch!','Special delivery!','Yoink!','Ta-daa!'],
  burn: ['Hot hot hot!','Spicy!','My toesies!'],
  gas: ['Pee-yew!','It stinks!','My nose!','Who did that?!','*cough* *cough*'],
};

// Map shapes and colour themes. A theme colours the ground strata, sky, water and
// background hills, and picks which decorations sprout on the surface.
const MAP_STYLES = ['Island', 'Archipelago', 'Skylands', 'Canyon', 'Cavern'];
const THEMES = {
  Meadow:   { tip:[128,214,76], grass:[74,168,64], soil:[96,64,36], bands:[[160,104,62],[146,94,56],[170,114,70]], pebble:[120,112,104], root:[92,60,38],
              sky:['#5fa8e8','#bfe3ff','#fff3d6'], layers:['#a9c6ea','#86b1d9','#6fa587'], water:['#2f6fb0','rgba(70,150,220,0.82)','rgba(20,50,110,0.95)'], foam:'rgba(255,255,255,0.7)',
              sun:'#fff4b8', cloud:'rgba(255,255,255,0.85)', dirt:['#8a5a34','#6b4426','#a0703f','#4caf50','#2a1c12'], decor:['tree','tree','bush','mushroom','flower','flower','rock'], density:0.6 },
  Snow:     { tip:[246,250,255], grass:[222,234,246], soil:[150,160,178], bands:[[122,122,142],[106,109,130],[134,132,152]], pebble:[90,95,110], root:[82,86,102],
              sky:['#4a6fa5','#b9d4ec','#eef5fb'], layers:['#c7d9ec','#9fb8d6','#7e9bbd'], water:['#2a5f8f','rgba(90,160,210,0.85)','rgba(15,45,90,0.95)'], foam:'rgba(255,255,255,0.8)',
              sun:'#fdfdf5', cloud:'rgba(255,255,255,0.75)', dirt:['#dfe8f1','#b9c6d3','#8a94a6','#ffffff','#5c6578'], decor:['pine','pine','pine','rock','snowman','bush'], density:0.55, flakes:true },
  Desert:   { tip:[240,206,120], grass:[226,186,96], soil:[196,146,76], bands:[[214,150,84],[196,128,70],[226,168,98]], pebble:[150,100,70], root:[150,96,54],
              sky:['#f7a65b','#ffd9a0','#fff4dc'], layers:['#f0b47a','#d9905a','#b86f44'], water:['#2b8a8f','rgba(60,190,190,0.82)','rgba(10,80,90,0.95)'], foam:'rgba(255,255,255,0.65)',
              sun:'#fff0c0', cloud:'rgba(255,255,255,0.6)', dirt:['#d9a066','#b8814c','#f0c080','#8a5a34','#5c3a20'], decor:['cactus','cactus','rock','rock','skull','tumble'], density:0.45 },
  Volcanic: { tip:[92,82,82], grass:[72,62,64], soil:[54,46,48], bands:[[76,60,60],[62,50,52],[88,68,66]], pebble:[190,74,30], root:[42,32,32],
              sky:['#2a1420','#6b2a2a','#c9623c'], layers:['#4a2a30','#36202a','#241620'], water:['#8a2a00','rgba(255,110,20,0.88)','rgba(120,30,0,0.95)'], foam:'rgba(255,220,120,0.8)',
              sun:'#ff9d4d', cloud:'rgba(70,50,60,0.75)', dirt:['#5a4040','#3a2a2a','#ff7b39','#2a1c12','#8a3a1a'], decor:['deadtree','deadtree','rock','rock','skull','crystal'], density:0.4, embers:true, lava:true },
};
const THEME_NAMES = Object.keys(THEMES);

// Weapon & utility definitions. kind: charge (power bar) | instant | place | click | tool
const WEAPONS = [
  { id:'bomb',     name:'Pinecone Bomb',  kind:'charge', hint:'Fuse: {fuse}s  (keys 1–5)', desc:'Lob a pinecone over the hill. It bounces, then bursts on a fuse you set with keys 1–5.', stats:'48 dmg · R 48 · fuse 1–5 s' },
  { id:'rocket',   name:'Bottle Rocket',  kind:'charge', hint:'Wind-affected. Hold Space.', desc:'Straight-line rocket that explodes on impact. Reads the wind gauge before you fire.', stats:'50 dmg · R 50 · wind: full' },
  { id:'bee',      name:'Seeker Bee',     kind:'charge', hint:'{bee}', desc:'Click a target, then launch. The bee steers toward it and stings on contact.', stats:'45 dmg · R 42 · homing' },
  { id:'scatter',  name:'Scattershot',    kind:'instant',hint:'Two shots. Space to fire.', desc:'Two quick hitscan shots along your aim. Each one shoves the victim away from you.', stats:'20 dmg × 2 · knockback' },
  { id:'melon',    name:'Melon Cluster',  kind:'charge', hint:'Splits into 5 bits.', desc:'A melon that pops after 3 s into five fragments that spray forward.', stats:'30 dmg + 5 × 22 · R 38' },
  { id:'robot',    name:'Wind-up Robot',  kind:'place',  hint:'Space again to detonate.', desc:'Plants a walking robot that marches ahead, shoving critters. Press fire again to detonate.', stats:'55 dmg · R 56 · walks' },
  { id:'kazoo',    name:'Kazoo Blast',    kind:'instant',hint:'Close-range shove!', desc:'A short blast of sound. Little damage, enormous shove: great near cliffs and water.', stats:'8 dmg · huge knockback' },
  { id:'pelican',  name:'Pelican Drop',   kind:'click',  hint:'Click a spot to bomb.', air:true, desc:'Click a spot. A pelican flies over and drops a line of eggs on it. Not in caverns.', stats:'5 eggs × 26 dmg · R 34' },
  { id:'anvil',    name:'Anvil Rain',     kind:'click',  hint:'Click a spot. Big!', air:true, desc:'Click a spot. An anvil falls from the sky, flattening whatever it lands on.', stats:'65 dmg · R 72 · drops anything hit' },
  { id:'volcano',  name:'Pocket Volcano', kind:'place',  hint:'Space to plant. Lava!', desc:'Plant a tiny volcano at your feet. It erupts lava that sticks and burns for seconds.', stats:'lava: 9 dmg/s · 3.6 s eruption' },
  { id:'dynamite', name:'Dynamite Stick', kind:'place',  hint:'Drop it and RUN.', desc:'Drop it where you stand, then run. Five second fuse, the biggest bang you carry.', stats:'75 dmg · R 78 · fuse 5 s' },
  { id:'sticky',   name:'Sticky Mine',    kind:'charge', hint:'Sticks, arms in 2s.', desc:'Throw a mine that sticks to the first thing it touches and arms after 2 s.', stats:'45 dmg · R 46 · proximity' },
  { id:'rifle',    name:'Acorn Rifle',    kind:'instant',hint:'One precise shot, any range.', desc:'One precise hitscan round at any range, with a laser sight to line it up.', stats:'38 dmg · pinpoint' },
  { id:'skunk',    name:'Skunk Bomb',     kind:'charge', hint:'Stink cloud that drifts on the wind.', desc:'Lobs a skunk that bursts into a stink cloud. The gas drifts with the wind and poisons.', stats:'10 dmg + gas 7 dmg/s' },
  { id:'slap',     name:'Fish Slap',      kind:'instant',hint:'Melee. Huge shove toward the water!', desc:'Melee. A wet fish to the face sends the target flying sideways. Aim at water.', stats:'30 dmg · massive shove' },
  { id:'thunder',  name:'Thundercloud',   kind:'click',  hint:'Click a spot: 3 lightning bolts.', air:true, desc:'Click a spot. A storm cloud forms and fires three lightning bolts at the ground below.', stats:'3 bolts × 34 dmg · R 34' },
  { id:'acorn',    name:'Giant Acorn',    kind:'charge', hint:'Enormous bouncing bomb, 4s fuse.', desc:'Throw a giant bouncing acorn with a 4 s fuse. Slow, heavy, devastating.', stats:'90 dmg · R 95 · fuse 4 s' },
  { id:'bowling',  name:'Hedge Bowling',  kind:'charge', hint:'Rolls along the ground, bowling critters over.', desc:'Rolls along the ground and bowls over every critter it meets, then pops.', stats:'14–30 dmg per hit · 20 dmg burst' },
  { id:'boomerang',name:'Twig Boomerang', kind:'charge', hint:'Curves back to you. Catch it or duck!', desc:'Flies out, curves back to you. Hits an enemy and it explodes; reaches you and you catch it.', stats:'32 dmg · R 36 · returns' },
  { id:'mortar',   name:'Acorn Mortar',   kind:'charge', hint:'Three shells in a burst.', desc:'Three shells fired in a quick burst along the same arc. Spreads a little.', stats:'3 × 22 dmg · R 30' },
  { id:'sunbeam',  name:'Sunbeam',        kind:'instant',hint:'Laser that burns through anything.', desc:'A laser that burns a straight tunnel through terrain and anyone standing in it.', stats:'26 dmg per critter · pierces' },
  { id:'vortex',   name:'Gravity Acorn',  kind:'charge', hint:'Sucks everything nearby toward it.', desc:'Lands and becomes a tiny black hole for 3 s, dragging critters, mines and barrels in.', stats:'18 dmg · R 30 · pulls' },
  { id:'chili',    name:'Chili Breath',   kind:'instant',hint:'Breathe fire! Short range.', desc:'Breathe a cone of fire in front of you. Burns critters and melts terrain.', stats:'lava: 9 dmg/s · short range' },
  { id:'stomp',    name:'Thunder Stomp',  kind:'instant',hint:'Launch everyone around you skyward.', desc:'Slam the ground: everyone nearby is launched skyward. No fall damage for them.', stats:'6–20 dmg · launches' },
  { id:'shower',   name:'Star Shower',    kind:'click',  hint:'Click: meteors rain over a wide area.', air:true, desc:'Click a spot. Seven meteors rain across a wide area. Not in caverns.', stats:'7 × 34 dmg · R 40 · wide' },
  { id:'swap',     name:'Switcheroo',     kind:'click',  hint:'Click a critter to swap places with it.', desc:'Click any critter to trade places with it. Steal their perch, leave them your cliff edge.', stats:'no damage · instant' },
  { id:'frog',     name:'Hopper Frog',    kind:'charge', hint:'Lands, then hops after the nearest enemy.', desc:'Throw a frog bomb. Once it lands it hops toward the nearest enemy, up to four hops, and bursts when it reaches one.', stats:'40 dmg · R 42 · 4 hops' },
  { id:'zap',      name:'Static Jar',     kind:'instant',hint:'Lightning that chains between critters.', desc:'Hitscan lightning. The first critter hit takes the full jolt, then it arcs to up to three more critters standing within 120 px of each other.', stats:'24 dmg + 3 × 16 · chains' },
  { id:'freeze',   name:'Freeze Ray',     kind:'instant',hint:'Freeze a critter solid: it skips a turn.', desc:'A beam that encases the first critter hit in ice. Frozen critters skip their next turn, take half damage and cannot be knocked around.', stats:'skips 1 turn · half dmg' },
  { id:'balloon',  name:'Party Balloon',  kind:'click',  hint:'Click a critter to float it away.', desc:'Click any critter (even yourself). A balloon lifts them into the sky and drifts with the wind for four seconds, then pops. Mind the drop.', stats:'4 s flight · fall damage' },
  { id:'quake',    name:'Earthquake',     kind:'instant',hint:'Shake the whole island.', desc:'Shakes the entire map for three seconds. Everyone is jostled off their feet, loose objects roll, and the ground crumbles in random places.', stats:'9 dmg to all · map-wide' },
  { id:'flood',    name:'Flood',          kind:'instant',hint:'The water rises 60 px.', desc:'Raises the water level by 60 px right away. Anyone standing low enough goes for a swim.', stats:'water +60 px · permanent' },
  { id:'spitter',  name:'Mine Spitter',   kind:'charge', hint:'Spits three seeds that grow into mines.', desc:'Fires three seeds in a spread. Wherever they come to rest, a live mine sprouts. Area denial for the patient.', stats:'3 mines × 42 dmg · R 46' },
  { id:'karma',    name:'Karma Jar',      kind:'instant',hint:'Everyone gets the average HP.', desc:'Opens a jar of fairness: every living critter is set to the average HP of all survivors. A comeback in a bottle, or a terrible idea.', stats:'HP → average · everyone' },
  { id:'grapple',  name:'Grapple Hook',   kind:'tool',   hint:'Space: shoot rope.', util:true, desc:'Fire a rope at terrain. Swing with ←→, climb with ↑↓, release with fire.', stats:'rope 18–420 px' },
  { id:'jetpack',  name:'Jetpack',        kind:'tool',   hint:'Space: ignite.', util:true, desc:'Four seconds of fuel. Hold ↑ to thrust, ←→ to steer. No fall damage while flying.', stats:'fuel 4 s' },
  { id:'teleport', name:'Teleport Pad',   kind:'click',  hint:'Click a destination.', util:true, desc:'Click any open spot to blink there instantly. Ends your move.', stats:'unlimited range' },
  { id:'girder',   name:'Girder',         kind:'click',  hint:'↑↓ rotate · click to place', util:true, desc:'Place a steel girder: rotate with ↑↓, click to drop. Bridges, walls, roofs.', stats:'rotatable · permanent' },
  { id:'drill',    name:'Mole Drill',     kind:'instant',hint:'Space: dig a tunnel along your aim.', util:true, desc:'Burrow a tunnel in the direction you aim. Ends underground, safe and sneaky.', stats:'digs ~34 px wide' },
  { id:'pogo',     name:'Pogo Stick',     kind:'tool',   hint:'Space: BOING! No fall damage.', util:true, desc:'Hop around on a pogo stick. Big bounces, no fall damage, a little shove on landing.', stats:'no fall damage' },
  { id:'cannon',   name:'Critter Cannon', kind:'charge', hint:'Hold Space to charge, release to launch YOURSELF.', desc:'Climb into the cannon, charge, and fire yourself along your aim. No fall damage on landing, and your turn carries on.', stats:'self-launch · no fall dmg', util:true },
  { id:'skip',     name:'Skip Turn',      kind:'tool',   hint:'Space: snooze.', util:true, desc:'Take a nap and pass the turn. Sometimes the best move.', stats:'ends turn' },
];
const WEAP = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// Scheme presets: starting ammo (-1 = infinite), crates and map clutter
const SCHEMES = {
  'Classic': {
    ammo: { bomb:-1, rocket:-1, bee:1, scatter:-1, melon:2, robot:1, kazoo:-1, pelican:1, anvil:0, volcano:1, dynamite:2, sticky:2,
            rifle:2, skunk:1, slap:-1, thunder:1, acorn:0, bowling:1, boomerang:2, mortar:2, sunbeam:1, vortex:1, chili:1, stomp:2, shower:0, swap:1,
            frog:2, zap:2, freeze:1, balloon:1, quake:1, flood:0, spitter:1, karma:0,
            grapple:5, jetpack:2, teleport:2, girder:3, drill:2, pogo:2, cannon:2, skip:-1 },
    crateChance: 0.5, crates: 1, mines: 8, barrels: 5, trap: 0.1,
    pool: ['rocket','bee','melon','robot','pelican','anvil','volcano','dynamite','sticky','grapple','jetpack','teleport','girder','rifle','skunk','thunder','acorn','drill','pogo',
           'bowling','boomerang','mortar','sunbeam','vortex','chili','stomp','shower','swap','frog','zap','freeze','balloon','quake','flood','spitter','karma','cannon'],
  },
  'Melee Only': {
    ammo: { kazoo:-1, slap:-1, stomp:-1, chili:2, swap:2, bowling:2, vortex:1, dynamite:3, volcano:1, robot:1, sticky:1, skunk:1, freeze:1, balloon:1, quake:1, spitter:1, karma:1, grapple:-1, jetpack:3, teleport:1, girder:5, drill:3, pogo:3, cannon:3, skip:-1 },
    crateChance: 0.4, crates: 1, mines: 6, barrels: 6, trap: 0.1,
    pool: ['dynamite','volcano','robot','sticky','skunk','jetpack','teleport','girder','drill','pogo','chili','swap','bowling','vortex','freeze','balloon','quake','spitter','cannon'],
  },
  'Chaos Crates': {
    ammo: { bomb:-1, rocket:3, bee:2, scatter:-1, melon:3, robot:2, kazoo:-1, pelican:2, anvil:1, volcano:2, dynamite:3, sticky:3,
            rifle:3, skunk:2, slap:-1, thunder:2, acorn:1, bowling:2, boomerang:3, mortar:3, sunbeam:2, vortex:2, chili:2, stomp:3, shower:1, swap:2,
            frog:3, zap:3, freeze:2, balloon:2, quake:2, flood:1, spitter:2, karma:1,
            grapple:-1, jetpack:3, teleport:3, girder:5, drill:3, pogo:3, cannon:3, skip:-1 },
    crateChance: 1, crates: 2, mines: 14, barrels: 10, trap: 0.2,
    pool: ['rocket','bee','melon','robot','pelican','anvil','anvil','volcano','dynamite','sticky','jetpack','teleport','rifle','skunk','thunder','acorn','acorn','drill','pogo',
           'bowling','boomerang','mortar','sunbeam','vortex','chili','stomp','shower','shower','swap','frog','frog','zap','freeze','balloon','quake','flood','spitter','karma','cannon'],
  },
  'Artillery': {   // long range only: no melee, no mines, big booms
    ammo: { bomb:-1, rocket:-1, rifle:-1, mortar:-1, melon:3, acorn:1, thunder:2, pelican:2, anvil:1, skunk:2, bee:2, boomerang:3, sunbeam:2, vortex:2, shower:1, frog:3, zap:2, spitter:2, flood:1, balloon:1, grapple:3, teleport:1, girder:2, pogo:2, cannon:2, skip:-1 },
    crateChance: 0.6, crates: 1, mines: 0, barrels: 3, trap: 0.05,
    pool: ['melon','acorn','thunder','pelican','anvil','skunk','bee','teleport','girder','pogo','boomerang','sunbeam','vortex','shower','frog','zap','spitter','balloon','cannon'],
  },
};

