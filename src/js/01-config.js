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
  AIR_STEER: 1.6,      // how fast a jumping critter can bend its arc toward a held direction (1/s)
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
  // ---- more thrown things ----
  { id:'banana',   name:'Banana Bunch',   kind:'charge', cat:'throw', hint:'Splits into 5 bouncy bananas.', desc:'A banana that bursts after 3 s into five bouncing bananas, each with its own short fuse. Nobody knows where they will end up. That is the point.', stats:'35 dmg + 5 × 40 · very bouncy' },
  { id:'superbanana', name:'Mega Banana', kind:'charge', cat:'throw', hint:'Space again to detonate.', desc:'A huge banana you detonate by hand: press fire again when it is where you want it. Bursts into six big bananas.', stats:'55 dmg + 6 × 48 · remote' },
  { id:'holy',     name:'Holy Hand Acorn', kind:'charge', cat:'throw', hint:'Three… no, four… THREE!', desc:'Count to three. Lands dead, does not bounce, and then the heavens open. The biggest bang you can throw.', stats:'100 dmg · R 100 · fuse 3 s' },
  { id:'launcher', name:'Pinecone Launcher', kind:'charge', cat:'throw', hint:'Fast pinecone, 2 s fuse.', desc:'Fires a pinecone far faster and flatter than you could throw it, with a short two second fuse.', stats:'44 dmg · R 46 · fuse 2 s' },
  { id:'molotov',  name:'Hot Sauce Bottle', kind:'charge', cat:'throw', hint:'Shatters into fire.', desc:'A bottle of hot sauce that shatters on impact and sprays burning sauce everywhere. Fire sticks to terrain and critters.', stats:'16 dmg + fire 9/s' },
  { id:'gascan',   name:'Stink Canister', kind:'charge', cat:'throw', hint:'Bursts into poison gas.', desc:'A canister that pops after 2 s into a thick cloud of stink. Anyone who breathes it is poisoned and keeps losing HP every turn.', stats:'8 dmg + gas · poisons' },
  { id:'waterballoon', name:'Water Balloon', kind:'charge', cat:'throw', hint:'Splash! Shoves and douses fire.', desc:'Does no damage, but the splash shoves everyone nearby and puts out any fire or gas it lands in. Great for washing critters off ledges.', stats:'0 dmg · big shove · douses' },
  { id:'battery',  name:'Dodgy Battery',  kind:'charge', cat:'throw', hint:'Explodes three times. Unpredictably.', desc:'A phone battery of questionable origin. It goes off, jumps, goes off again, jumps again… three bangs in all, none where you expected.', stats:'3 × 16 dmg · R 24 · erratic' },
  { id:'starburst',name:'Starburst',      kind:'charge', cat:'throw', hint:'Firework: bursts into 6 falling stars.', desc:'A firework that bursts after a second into six burning stars that rain down over a wide area. Pretty, and hot.', stats:'12 dmg + 6 × 24' },
  { id:'fridge',   name:'Fridge Toss',    kind:'charge', cat:'throw', hint:'Heavy. Crushes whatever it rolls over.', desc:'Hurl a whole fridge. It crushes anyone it lands on or rolls into, then pops its compressor.', stats:'30–60 dmg crush · 30 burst' },
  { id:'molebomb', name:'Mole Bomb',      kind:'charge', cat:'throw', hint:'Digs into the ground, then explodes.', desc:'A bomb with a drill nose: when it hits the ground it keeps digging in the direction it was going for a while, then explodes deep inside.', stats:'50 dmg · R 50 · digs 120 px' },
  // ---- more things to fire ----
  { id:'bow',      name:'Thorn Bow',      kind:'instant',cat:'fire', hint:'Two arrows. They stick in walls.', desc:'Two quick arrows that fly in an arc. An arrow that misses sticks in the terrain and can be stood on.', stats:'2 × 15 dmg · sticks' },
  { id:'poisonarrow', name:'Nettle Arrow', kind:'instant', cat:'fire', hint:'One arrow. Poisons.', desc:'A single arrow dipped in nettle juice. Low damage, but the victim loses 5 HP at the start of each of their next three turns.', stats:'10 dmg + poison 3 turns' },
  { id:'handgun',  name:'Pea Pistol',     kind:'instant',cat:'fire', hint:'Five steady shots. Aim while firing.', desc:'Five accurate pea rounds, one after the other. You can keep adjusting your aim between shots.', stats:'5 × 7 dmg' },
  { id:'uzi',      name:'Pea Shooter',    kind:'instant',cat:'fire', hint:'Spray of 12 peas. Aim while firing.', desc:'Twelve peas in one noisy second, with a bit of spread. Each hit knocks the target a little further back.', stats:'12 × 4 dmg · spray' },
  { id:'minigun',  name:'Acorn Gatling',  kind:'instant',cat:'fire', hint:'25 rounds in two seconds!', desc:'A crank-powered acorn gatling. Twenty-five rounds in two seconds with plenty of spread, shoving the target along as it chews.', stats:'25 × 5 dmg · spray' },
  { id:'railgun',  name:'Rail Thorn',     kind:'instant',cat:'fire', hint:'Fires straight through terrain.', desc:'A thorn accelerated so hard it passes straight through any amount of terrain, hitting every critter along the line.', stats:'45 dmg · pierces everything' },
  { id:'magic',    name:'Magic Acorn',    kind:'instant',cat:'fire', hint:'Seeks the nearest enemy through walls.', desc:'An enchanted acorn that flies straight through terrain and hunts down the nearest enemy critter wherever they hide.', stats:'50 dmg · R 40 · homing' },
  { id:'virus',    name:'Sneeze Virus',   kind:'instant',cat:'fire', hint:'Infects the first critter hit. It spreads!', desc:'A sneeze aimed down the sights. The first critter hit catches a cold that costs 5 HP a turn for four turns, and passes it on to anyone standing nearby.', stats:'poison 4 turns · contagious' },
  { id:'dragon',   name:'Dragon Quill',   kind:'instant',cat:'fire', hint:'Short-range fireball. Big shove.', desc:'HA-DO-QUILL! Throws a fireball that flies flat and short. Modest damage, enormous knockback.', stats:'30 dmg · big shove · 130 px' },
  { id:'waterpistol', name:'Squirt Gun',  kind:'instant',cat:'fire', hint:'Push critters with water. Douses fire.', desc:'A jet of water. No damage, but it shoves critters in front of you and puts out fire and gas.', stats:'0 dmg · shove · douses' },
  { id:'dubstep',  name:'Wub Horn',       kind:'instant',cat:'fire', hint:'WUB WUB. Wide bass blast.', desc:'A horn that plays one enormous bass drop. Everyone in a wide cone in front of you is hurt a little and thrown a lot.', stats:'12 dmg · wide shove' },
  // ---- more melee ----
  { id:'axe',      name:'Lumber Axe',     kind:'instant',cat:'melee', hint:'Melee. Chops their HP in half!', desc:'A swing of the axe halves the victim\'s current HP, whatever it is. Best used on someone healthy.', stats:'halves HP · melee' },
  { id:'punch',    name:'Spiky Uppercut', kind:'instant',cat:'melee', hint:'Melee. Launches them sky-high.', desc:'A flaming uppercut that sends the target straight up. What goes up comes down, and the landing hurts too.', stats:'30 dmg · launches up' },
  { id:'prod',     name:'Nose Poke',      kind:'instant',cat:'melee', hint:'Melee. A tiny nudge. Mind the edge.', desc:'The gentlest attack in the game: a poke on the nose that nudges the target one step back. Devastating next to a cliff.', stats:'0 dmg · nudge' },
  { id:'chainsaw', name:'Hedge Trimmer',  kind:'instant',cat:'melee', hint:'Melee. Cuts critters and terrain.', desc:'Rev it up and swing: carves a short tunnel in the direction you aim and shreds any critter in the way.', stats:'25 dmg · cuts terrain' },
  { id:'kamikaze', name:'Kamikaze',       kind:'instant',cat:'melee', hint:'Fly through anything, then explode. You die.', desc:'Fling yourself along your aim straight through terrain and critters, then explode. Your critter does not survive this.', stats:'30 dmg on the way + 60 burst' },
  { id:'suicide',  name:'Last Hurrah',    kind:'instant',cat:'melee', hint:'Explode where you stand. You die.', desc:'Your critter goes out with a bang and a cloud of stink, taking whoever is standing close along for the ride.', stats:'50 dmg · R 60 · gas · you die' },
  // ---- more things from the sky ----
  { id:'napalm',   name:'Hot Sauce Strike', kind:'click', cat:'strike', hint:'Click a spot: a line of fire.', air:true, desc:'Click a spot. The pelican drops five bottles of hot sauce in a line, setting the whole area ablaze.', stats:'5 × 16 dmg + fire' },
  { id:'minestrike', name:'Mine Drop',    kind:'click',  cat:'strike', hint:'Click a spot: five live mines.', air:true, desc:'Click a spot. Five live mines rain down. Anyone standing nearby sets them off straight away.', stats:'5 mines × 42 dmg' },
  { id:'cratestrike', name:'Crate Drop',  kind:'click',  cat:'strike', hint:'Click a spot: three crates.', air:true, desc:'Click a spot and three supply crates parachute in. Grab them before the other team does. Some may be traps.', stats:'3 crates' },
  { id:'poisonstrike', name:'Stink Strike', kind:'click', cat:'strike', hint:'Click a spot: gas canisters.', air:true, desc:'Click a spot. Four stink canisters fall and burst into a wide poison cloud.', stats:'4 canisters · poisons' },
  { id:'waterstrike', name:'Rain Strike', kind:'click',  cat:'strike', hint:'Click a spot: a wall of water.', air:true, desc:'Click a spot. Five water balloons splash down, shoving everyone around and dousing any fire.', stats:'5 balloons · shoves' },
  { id:'frogstrike', name:'Frog Strike',  kind:'click',  cat:'strike', hint:'Click a spot: three hopper frogs.', air:true, desc:'Click a spot. Three hopper frogs are dropped from above and go looking for the nearest enemy.', stats:'3 frogs × 40 dmg' },
  { id:'homingstrike', name:'Homing Pelican', kind:'click', cat:'strike', hint:'Click a target: the eggs steer.', air:true, desc:'Click a target. The pelican drops four eggs that steer themselves toward the spot you clicked.', stats:'4 × 26 dmg · homing' },
  { id:'molestrike', name:'Mole Squadron', kind:'click', cat:'strike', hint:'Click a spot: three mole bombs.', air:true, desc:'Click a spot. Three mole bombs fall, dig into the ground and explode deep below. Ruins any bunker.', stats:'3 × 50 dmg · digging' },
  { id:'carpet',   name:'Rug Bombing',    kind:'click',  cat:'strike', hint:'Click a spot: bouncing rugs.', air:true, desc:'Click a spot. Four rolled-up rugs are dropped; they bounce about wildly before exploding.', stats:'4 × 36 dmg · bouncy' },
  { id:'comet',    name:'Rogue Comet',    kind:'click',  cat:'strike', hint:'Click a spot. One giant flaming rock.', air:true, desc:'Click a spot. A single enormous comet screams down from the sky, explodes and leaves burning rubble.', stats:'70 dmg · R 80 · fire' },
  { id:'ion',      name:'Orbital Sunbeam',kind:'click',  cat:'strike', hint:'Click a spot: a beam from orbit.', air:true, desc:'Click a spot. After a one-second charge, a beam from orbit burns a column straight down through everything to the water.', stats:'45 dmg · vertical column' },
  { id:'buster',   name:'Burrow Buster',  kind:'click',  cat:'strike', hint:'Click a spot: drills in, then booms.', air:true, desc:'Click a spot. A missile falls, drills into the ground and explodes below the surface, where the hiders are.', stats:'55 dmg · R 55 · digs 70 px' },
  { id:'nuke',     name:'Atomic Pinecone',kind:'instant',cat:'strike', hint:'Poisons EVERYONE and raises the water.', desc:'Sets off a pinecone of unusual size. Every critter on the map is poisoned for three turns and the water rises. Yes, yours too.', stats:'poison all · water +45 px' },
  { id:'abduct',   name:'Alien Abduction',kind:'click',  cat:'strike', hint:'Click a critter to beam it away.', desc:'Click any critter. A beam of light lifts them away and drops them somewhere random on the map. Hopefully somewhere worse.', stats:'no damage · random spot' },
  // ---- more critters to unleash ----
  { id:'squirrel', name:'Super Squirrel', kind:'place',  cat:'animal', hint:'Space to launch · ←→ steer · Space: boom', desc:'A flying squirrel in a cape. Steer it with ←→ for up to twelve seconds and press fire to detonate, or let it hit something.', stats:'70 dmg · R 65 · steerable' },
  { id:'cows',     name:'Stampede',       kind:'place',  cat:'animal', hint:'Three charging cows.', desc:'Releases three cows one after another. They charge ahead and explode on the first enemy they bump into.', stats:'3 × 45 dmg · R 48' },
  { id:'granny',   name:'Auntie Prickles',kind:'place',  cat:'animal', hint:'Slow, sweet and devastating.', desc:'A sweet old hedgehog shuffles forward with her handbag. She is slow, and when she reaches someone the handbag goes off.', stats:'85 dmg · R 85 · slow' },
  { id:'rhino',    name:'Rhino Beetle',   kind:'place',  cat:'animal', hint:'Rams everyone, bounces off walls.', desc:'A rhino beetle that charges at full tilt, flinging aside anyone it hits and bouncing off walls, until it tires.', stats:'35 dmg per ram · no bang' },
  { id:'ferrets',  name:'Ferret Trio',    kind:'place',  cat:'animal', hint:'Three fast, hoppy, explosive ferrets.', desc:'Three excitable ferrets that scamper and hop ahead and pop on the first enemy they reach.', stats:'3 × 28 dmg · R 34' },
  { id:'boar',     name:'Boar Rush',      kind:'place',  cat:'animal', hint:'Plows straight through terrain!', desc:'A boar that cannot be stopped: it plows a tunnel straight through hills and anyone in them, all the way across the map.', stats:'40 dmg per hit · digs' },
  // ---- more things to place ----
  { id:'megamine', name:'Mega Mine',      kind:'place',  cat:'place', hint:'Arms in 3 s. Then RUN.', desc:'A mine the size of a barrel. Arms three seconds after you place it, so walk away briskly.', stats:'85 dmg · R 90 · proximity' },
  { id:'c4',       name:'Fizz Brick',     kind:'place',  cat:'place', hint:'Place it, walk away, Space to detonate.', desc:'A brick of fizzing explosive. Place it, walk away, and press fire whenever you like to set it off. Goes off by itself when the turn ends.', stats:'70 dmg · R 72 · remote' },
  { id:'teapot',   name:'Priceless Teapot', kind:'place', cat:'place', hint:'Place it. Shatters into shards.', desc:'A priceless antique teapot. Put it down gently: in three seconds it explodes and sprays seven razor shards.', stats:'55 dmg + 7 × 20' },
  { id:'sentry',   name:'Sentry Turret',  kind:'place',  cat:'place', hint:'Shoots enemies who come near.', desc:'A turret that guards its spot. Any enemy who walks into its sights on their turn takes a shot that ends their move. Ten shots, and it can be blown up.', stats:'8 dmg per shot · 10 shots' },
  { id:'gaspump',  name:'Stink Pump',     kind:'place',  cat:'place', hint:'Pumps out gas for seven seconds.', desc:'A pump that fills the area with poison gas for seven seconds. Put it upwind of the enemy.', stats:'gas 7 s · poisons' },
  { id:'grapple',  name:'Grapple Hook',   kind:'tool',   hint:'Space: shoot rope.', util:true, desc:'Fire a rope at terrain. Swing with ←→, climb with ↑↓, release with fire.', stats:'rope 18–420 px' },
  { id:'jetpack',  name:'Jetpack',        kind:'tool',   hint:'Space: ignite.', util:true, desc:'Four seconds of fuel. Hold ↑ to thrust, ←→ to steer. No fall damage while flying.', stats:'fuel 4 s' },
  { id:'teleport', name:'Teleport Pad',   kind:'click',  hint:'Click a destination.', util:true, desc:'Click any open spot to blink there instantly. Ends your move.', stats:'unlimited range' },
  { id:'girder',   name:'Girder',         kind:'click',  hint:'↑↓ rotate · click to place', util:true, desc:'Place a steel girder: rotate with ↑↓, click to drop. Bridges, walls, roofs.', stats:'rotatable · permanent' },
  { id:'drill',    name:'Mole Drill',     kind:'instant',hint:'Space: dig a tunnel along your aim.', util:true, desc:'Burrow a tunnel in the direction you aim. Ends underground, safe and sneaky.', stats:'digs ~34 px wide' },
  { id:'pogo',     name:'Pogo Stick',     kind:'tool',   hint:'Space: BOING! No fall damage.', util:true, desc:'Hop around on a pogo stick. Big bounces, no fall damage, a little shove on landing.', stats:'no fall damage' },
  { id:'cannon',   name:'Critter Cannon', kind:'charge', hint:'Hold Space to charge, release to launch YOURSELF.', desc:'Climb into the cannon, charge, and fire yourself along your aim. No fall damage on landing, and your turn carries on.', stats:'self-launch · no fall dmg', util:true },
  { id:'parachute',name:'Dandelion Chute', kind:'tool',  cat:'util', hint:'Space while falling: open the chute.', util:true, desc:'Press fire while in the air to open a dandelion parachute. You drift down slowly on the wind, with no fall damage. Press fire again to close it.', stats:'slow fall · ←→ steer' },
  { id:'lowgrav',  name:'Moon Boots',     kind:'tool',   cat:'util', hint:'Space: low gravity this turn.', util:true, desc:'Everything falls at less than half speed for the rest of this turn: jumps go further, throws go higher.', stats:'gravity × 0.45 · this turn' },
  { id:'fastwalk', name:'Roller Skates',  kind:'tool',   cat:'util', hint:'Space: walk much faster this turn.', util:true, desc:'Strap on skates and cover more than twice the ground this turn.', stats:'walk × 2.3 · this turn' },
  { id:'laser',    name:'Laser Sight',    kind:'tool',   cat:'util', hint:'Space: show the aim line.', util:true, desc:'Shows exactly where your aim line hits for the rest of this turn. Handy for guns, rays and arrows.', stats:'aim line · this turn' },
  { id:'dbldmg',   name:'Double Damage',  kind:'tool',   cat:'util', hint:'Space: everything hits twice as hard.', util:true, desc:'Every bit of damage dealt this turn is doubled. Fire damage, gas, fall damage, all of it.', stats:'damage × 2 · this turn' },
  { id:'dbltime',  name:'Extra Time',     kind:'tool',   cat:'util', hint:'Space: more time on the clock.', util:true, desc:'Adds a full turn\'s worth of seconds to the clock. Think it over.', stats:'+1 turn of time' },
  { id:'cratespy', name:'Crate Spy',      kind:'tool',   cat:'util', hint:'Space: see what every crate holds.', util:true, desc:'From now on your team can see what is inside every crate on the map, including which ones are traps.', stats:'reveals crates · permanent' },
  { id:'crateshower', name:'Crate Shower', kind:'tool',  cat:'util', hint:'Space: four crates fall right now.', util:true, desc:'Calls in four crates at once, scattered over the map. First come, first served.', stats:'4 crates' },
  { id:'selectcritter', name:'Pick a Critter', kind:'click', cat:'util', hint:'Click one of your critters to control it.', util:true, desc:'Click any of your own critters to take this turn with them instead. Use it before you move.', stats:'switch critter' },
  { id:'hibernate',name:'Hibernate',      kind:'tool',   cat:'util', hint:'Space: curl up in ice until your next turn.', util:true, desc:'Curl up in a block of ice until your next turn: half damage, and nothing can knock you off your perch. Ends your move.', stats:'half dmg · immovable · ends turn' },
  { id:'skip',     name:'Skip Turn',      kind:'tool',   hint:'Space: snooze.', util:true, desc:'Take a nap and pass the turn. Sometimes the best move.', stats:'ends turn' },
];
const WEAP = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
// Picker groups. Order matters: it is the order the picker lists them in.
const WCATS = [['throw', 'Thrown'], ['fire', 'Fired'], ['melee', 'Melee'], ['strike', 'Sky & map'], ['animal', 'Critters'], ['place', 'Placed'], ['util', 'Utilities']];
const WCAT0 = { bomb:'throw', rocket:'fire', bee:'fire', scatter:'fire', melon:'throw', robot:'animal', kazoo:'melee', pelican:'strike', anvil:'strike', volcano:'place',
  dynamite:'place', sticky:'throw', rifle:'fire', skunk:'throw', slap:'melee', thunder:'strike', acorn:'throw', bowling:'throw', boomerang:'throw', mortar:'fire',
  sunbeam:'fire', vortex:'throw', chili:'melee', stomp:'melee', shower:'strike', swap:'util', frog:'animal', zap:'fire', freeze:'fire', balloon:'strike', quake:'strike',
  flood:'strike', spitter:'throw', karma:'strike', cannon:'util' };
for (const w of WEAPONS) w.cat ||= WCAT0[w.id] || (w.util ? 'util' : 'throw');

// Scheme presets: starting ammo (-1 = infinite), crates and map clutter
// Starting ammo for the newer half of the arsenal, merged into each scheme below
const MORE_AMMO = {
  Classic: { banana:1, superbanana:0, holy:1, launcher:2, molotov:2, gascan:1, waterballoon:2, battery:1, starburst:2, fridge:1, molebomb:2,
    bow:3, poisonarrow:1, handgun:-1, uzi:-1, minigun:1, railgun:1, magic:0, virus:1, dragon:2, waterpistol:1, dubstep:1,
    axe:2, punch:2, prod:-1, chainsaw:1, kamikaze:1, suicide:1,
    napalm:1, minestrike:1, cratestrike:0, poisonstrike:1, waterstrike:1, frogstrike:1, homingstrike:1, molestrike:1, carpet:1, comet:0, ion:0, buster:1, nuke:0, abduct:1,
    squirrel:1, cows:1, granny:1, rhino:1, ferrets:1, boar:0, megamine:1, c4:1, teapot:0, sentry:1, gaspump:1,
    parachute:3, lowgrav:2, fastwalk:2, laser:3, dbldmg:1, dbltime:1, cratespy:1, crateshower:1, selectcritter:2, hibernate:1 },
  'Melee Only': { axe:3, punch:3, prod:-1, chainsaw:2, kamikaze:1, suicide:1, dragon:2, waterpistol:2, dubstep:2, cows:1, granny:1, rhino:2, ferrets:1, boar:1, megamine:1, c4:1, teapot:1, sentry:1, gaspump:1,
    parachute:3, lowgrav:2, fastwalk:3, dbldmg:1, dbltime:1, selectcritter:2, hibernate:1, abduct:1 },
  'Chaos Crates': { banana:2, superbanana:1, holy:1, launcher:3, molotov:3, gascan:2, waterballoon:3, battery:2, starburst:3, fridge:2, molebomb:3,
    bow:-1, poisonarrow:2, handgun:-1, uzi:-1, minigun:2, railgun:2, magic:1, virus:2, dragon:3, waterpistol:2, dubstep:2,
    axe:3, punch:3, prod:-1, chainsaw:2, kamikaze:2, suicide:2,
    napalm:2, minestrike:2, cratestrike:1, poisonstrike:2, waterstrike:2, frogstrike:2, homingstrike:2, molestrike:2, carpet:2, comet:1, ion:1, buster:2, nuke:1, abduct:2,
    squirrel:2, cows:2, granny:2, rhino:2, ferrets:2, boar:1, megamine:2, c4:2, teapot:1, sentry:2, gaspump:2,
    parachute:5, lowgrav:3, fastwalk:3, laser:5, dbldmg:2, dbltime:2, cratespy:1, crateshower:2, selectcritter:3, hibernate:2 },
  Artillery: { banana:2, holy:1, launcher:-1, molotov:2, gascan:2, waterballoon:2, battery:2, starburst:3, molebomb:2, bow:-1, poisonarrow:2, railgun:2, magic:1, virus:1,
    napalm:1, minestrike:1, poisonstrike:1, waterstrike:1, frogstrike:1, homingstrike:2, molestrike:1, carpet:2, comet:1, ion:1, buster:2, nuke:0, abduct:1,
    parachute:2, lowgrav:2, laser:-1, dbldmg:1, dbltime:1, cratespy:1, crateshower:1, selectcritter:2, hibernate:1 },
};
const MORE_POOL = {
  Classic: ['banana','holy','launcher','molotov','gascan','waterballoon','battery','starburst','fridge','molebomb','bow','poisonarrow','minigun','railgun','magic','virus','dragon','dubstep','axe','punch','chainsaw',
    'napalm','minestrike','cratestrike','poisonstrike','waterstrike','frogstrike','homingstrike','molestrike','carpet','comet','ion','buster','abduct','squirrel','cows','granny','rhino','ferrets','boar','megamine','c4','teapot','sentry','gaspump',
    'parachute','lowgrav','fastwalk','laser','dbldmg','dbltime','crateshower','superbanana'],
  'Melee Only': ['axe','punch','chainsaw','dragon','waterpistol','dubstep','cows','granny','rhino','ferrets','boar','megamine','c4','teapot','sentry','gaspump','parachute','lowgrav','fastwalk','dbldmg','abduct','kamikaze'],
  'Chaos Crates': ['banana','superbanana','holy','holy','launcher','molotov','gascan','waterballoon','battery','starburst','fridge','molebomb','bow','poisonarrow','minigun','railgun','magic','virus','dragon','dubstep','axe','punch','chainsaw','kamikaze',
    'napalm','minestrike','cratestrike','poisonstrike','waterstrike','frogstrike','homingstrike','molestrike','carpet','comet','comet','ion','buster','nuke','abduct','squirrel','cows','granny','rhino','ferrets','boar','megamine','c4','teapot','sentry','gaspump',
    'parachute','lowgrav','fastwalk','laser','dbldmg','dbltime','crateshower'],
  Artillery: ['banana','holy','molotov','gascan','waterballoon','battery','starburst','molebomb','poisonarrow','railgun','magic','virus','napalm','minestrike','poisonstrike','waterstrike','frogstrike','homingstrike','molestrike','carpet','comet','ion','buster','abduct','parachute','lowgrav','dbldmg','dbltime'],
};
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
for (const k of Object.keys(SCHEMES)) { Object.assign(SCHEMES[k].ammo, MORE_AMMO[k] || {}); SCHEMES[k].pool.push(...(MORE_POOL[k] || [])); }
