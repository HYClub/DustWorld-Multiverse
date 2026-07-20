var path = require('path');
var base = path.join(__dirname, '..');
var WorldEngine = require(path.join(base, 'assets/js/engine/world.js'));

function runTest(seed, name, iterations) {
  var config = {
    seed: seed,
    name: name || 'Test World',
    map_size: 'medium',
    tech_speed: 'normal',
    war_tendency: 'normal',
    disaster_freq: 'medium'
  };
  var engine = new WorldEngine(config);
  engine.initialize();

  for (var i = 0; i < iterations; i++) {
    engine.evolve();
  }

  var s = engine.getState();
  // Merge engine.history into state.history
  if (engine.history && engine.history.length > 0) {
    if (!s.history) s.history = [];
    s.history = s.history.concat(engine.history);
  }
  return s;
}

function logResult(s, label) {
  console.log('');
  console.log('=== ' + label + ' ===');
  console.log('Seed: ' + (s.config ? s.config.seed : '?'));
  console.log('Years: ' + s.year + ' | Era: ' + s.era);
  console.log('Settlements: ' + (s.settlements ? s.settlements.length : 0) + ' | Pop: ' + (s.stats.total_population || 0));
  console.log('Tech Breakthroughs: ' + (s.stats.tech_breakthroughs || 0) + ' | Wars: ' + (s.stats.total_wars || 0));
  if (s.settlements) {
    var maxTech = 0;
    s.settlements.forEach(function(st) { if (st.tech_level > maxTech) maxTech = st.tech_level; });
    console.log('Max Tech Level: ' + maxTech);
  }
  if (s.active_events) {
    console.log('Active Events: ' + s.active_events.length);
    s.active_events.forEach(function(e) { console.log('  - ' + e.description); });
  }
  var hist = s.history || [];
  console.log('History entries: ' + hist.length);
  if (hist.length > 0) {
    console.log('Last 3 events:');
    for (var i = Math.max(0, hist.length - 3); i < hist.length; i++) {
      console.log('  Y' + hist[i].year + ' [' + (hist[i].type || hist[i].title) + '] ' + (hist[i].description || ''));
    }
  }
  // Check era transition conditions
  var totalPop = s.stats.total_population || 0;
  if (s.era === 'antiquity') {
    console.log('To reach exploration: need pop>300 and tech>=3');
    console.log('  Current pop: ' + totalPop + ', need: ' + (300 - totalPop) + ' more');
  }
}

// Test 1: Default seed, 200 years
console.log('======================================================================');
console.log('TEST 1: Default seed 42, 200 years');
console.log('======================================================================');
var r1 = runTest(42, 'Default World', 200);
logResult(r1, 'RESULT 1 - 200 years');

// Test 2: Fast tech, high war, 500 years
console.log('\n\n======================================================================');
console.log('TEST 2: Fast tech + high war, 500 years');
console.log('======================================================================');
var config2 = { seed: 12345, name: 'War World', tech_speed: 'fast', war_tendency: 'aggressive', disaster_freq: 'low' };
var engine2 = new WorldEngine(config2);
engine2.initialize();
for (var i2 = 0; i2 < 500; i2++) {
  engine2.evolve();
}
var r2 = engine2.getState();
if (engine2.history && engine2.history.length > 0) {
  if (!r2.history) r2.history = [];
  r2.history = r2.history.concat(engine2.history);
}
logResult(r2, 'RESULT 2 - 500 years, fast tech, aggressive');

// Test 3: Multiple seeds for consistency
console.log('\n\n======================================================================');
console.log('TEST 3: Multi-seed comparison (10 seeds, 100 years each)');
console.log('======================================================================');
for (var si = 0; si < 10; si++) {
  var seed3 = 1000 + si * 137;
  var r3 = runTest(seed3, 'Seed ' + seed3, 100);
  var pop3 = r3.stats.total_population || 0;
  var sett3 = r3.settlements ? r3.settlements.length : 0;
  var tech3 = r3.stats.tech_breakthroughs || 0;
  var war3 = r3.stats.total_wars || 0;
  var h3 = (r3.history || []).length;
  console.log('  Seed ' + seed3 + ': Y' + r3.year + ' ' + r3.era + ' | Pop:' + pop3 + ' S:' + sett3 + ' T:' + tech3 + ' W:' + war3 + ' H:' + h3);
}

console.log('\n\n======================================================================');
console.log('TEST 4: Extended run - 1000 years');
console.log('======================================================================');
var r4 = runTest(42, 'Extended', 1000);
logResult(r4, 'RESULT 4 - 1000 years');

console.log('\n\n======================================================================');
console.log('All tests complete.');
