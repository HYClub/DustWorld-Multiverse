var path = require('path');
var fs = require('fs');
var base = path.join(__dirname, '..');
var WorldEngine = require(path.join(base, 'assets/js/engine/world.js'));

var LOG = [];
function log(msg) { console.log(msg); LOG.push(msg); }

function runWorld(seed, config, years) {
  var cfg = Object.assign({ seed: seed, name: 'Test-' + seed }, config);
  var engine = new WorldEngine(cfg);
  engine.initialize();

  var snapshots = [];
  for (var y = 0; y < years; y++) {
    engine.evolve();
    if (y % 50 === 0 || y === years - 1) {
      var s = engine.getState();
      snapshots.push({
        year: s.year, era: s.era,
        settlements: (s.settlements || []).length,
        population: s.stats.total_population || 0,
        tech: s.stats.tech_breakthroughs || 0,
        wars: s.stats.total_wars || 0,
        golden_ages: s.stats.golden_ages || 0,
        trade_routes: (s.trade_routes || []).length,
        max_tech: Math.max(0, ...(s.settlements || []).map(function(st) { return st.tech_level || 0; })),
        history: (s.history || []).length
      });
    }
  }
  var final = engine.getState();
  return { final: final, snapshots: snapshots, engine: engine };
}

// ===============================================================
// TEST SUITE 1: 30 seeds × standard config × 200 years
// ===============================================================
log('\n======================================================================');
log('SUITE 1: 30 seeds, standard config, 200 years');
log('======================================================================');
var results1 = [];
for (var s = 0; s < 30; s++) {
  var seed = 1000 + s * 47;
  var r = runWorld(seed, { map_size: 'medium', tech_speed: 'normal', war_tendency: 'normal', disaster_freq: 'medium' }, 200);
  results1.push(r);
  var f = r.final;
  log('  S' + seed + ' | Y' + f.year + ' ' + (f.era === 'antiquity' ? '●' : f.era === 'exploration' ? '◆' : '▲') +
    ' | Pop:' + String((f.stats.total_population || 0)).padStart(5) +
    ' | Sett:' + ((f.settlements || []).length) +
    ' | Tech:' + String(f.stats.tech_breakthroughs || 0).padStart(2) +
    ' | War:' + String(f.stats.total_wars || 0).padStart(2) +
    ' | GA:' + String(f.stats.golden_ages || 0).padStart(2));
}

// Stats
var pops = results1.map(function(r) { return r.final.stats.total_population || 0; });
var setts = results1.map(function(r) { return (r.final.settlements || []).length; });
var techs = results1.map(function(r) { return r.final.stats.tech_breakthroughs || 0; });
var wars = results1.map(function(r) { return r.final.stats.total_wars || 0; });
var eras = results1.map(function(r) { return r.final.era; });
var explorationCount = eras.filter(function(e) { return e === 'exploration' || e === 'modern'; }).length;

function avg(arr) { return (arr.reduce(function(a,b) { return a+b; }, 0) / arr.length).toFixed(1); }
function min(arr) { return Math.min.apply(null, arr); }
function max(arr) { return Math.max.apply(null, arr); }
function stddev(arr) {
  var m = parseFloat(avg(arr));
  var sq = arr.map(function(v) { return (v - m) * (v - m); });
  return Math.sqrt(sq.reduce(function(a,b) { return a+b; }, 0) / arr.length).toFixed(1);
}

log('');
log('--- SUITE 1 SUMMARY ---');
log('Seeds tested: ' + results1.length);
log('Era progress rate: ' + explorationCount + '/' + results1.length + ' (' + (explorationCount/results1.length*100).toFixed(0) + '%)');
log('Population: avg=' + avg(pops) + ' min=' + min(pops) + ' max=' + max(pops) + ' std=' + stddev(pops));
log('Settlements: avg=' + avg(setts) + ' min=' + min(setts) + ' max=' + max(setts));
log('Tech breakthroughs: avg=' + avg(techs) + ' min=' + min(techs) + ' max=' + max(techs));
log('Wars: avg=' + avg(wars) + ' min=' + min(wars) + ' max=' + max(wars));

// ===============================================================
// TEST SUITE 2: Config sweep - 10 seeds × 3 configs × 200 years
// ===============================================================
log('\n\n======================================================================');
log('SUITE 2: Config sweep (10 seeds × 3 configs × 200 years)');
log('======================================================================');
var configs = [
  { label: 'SLOW/PEACE/DRY', config: { map_size: 'medium', tech_speed: 'slow', war_tendency: 'peaceful', disaster_freq: 'low' } },
  { label: 'FAST/WAR/HIGH',  config: { map_size: 'medium', tech_speed: 'fast', war_tendency: 'aggressive', disaster_freq: 'high' } },
  { label: 'SMALL',           config: { map_size: 'small', tech_speed: 'normal', war_tendency: 'normal', disaster_freq: 'medium' } },
];
configs.forEach(function(cfg) {
  log('\n--- Config: ' + cfg.label + ' ---');
  var pops2 = [], setts2 = [], techs2 = [], wars2 = [], eras2 = [];
  for (var s = 0; s < 10; s++) {
    var seed = 5000 + s * 73;
    var r = runWorld(seed, cfg.config, 200);
    var f = r.final;
    pops2.push(f.stats.total_population || 0);
    setts2.push((f.settlements || []).length);
    techs2.push(f.stats.tech_breakthroughs || 0);
    wars2.push(f.stats.total_wars || 0);
    eras2.push(f.era);
    log('  S' + seed + ' | ' + (f.era === 'antiquity' ? '●' : '◆') + ' | Pop:' + (f.stats.total_population || 0) + ' | S:' + (f.settlements || []).length + ' | T:' + (f.stats.tech_breakthroughs || 0) + ' | W:' + (f.stats.total_wars || 0));
  }
  var er2 = eras2.filter(function(e) { return e !== 'antiquity'; }).length;
  log('  -> Era: ' + er2 + '/10 | Pop avg:' + avg(pops2) + ' | Sett avg:' + avg(setts2) + ' | Tech avg:' + avg(techs2) + ' | War avg:' + avg(wars2));
});

// ===============================================================
// TEST SUITE 3: Extended run - 10 seeds × 500 years
// ===============================================================
log('\n\n======================================================================');
log('SUITE 3: Extended run (10 seeds × 500 years, standard config)');
log('======================================================================');
var milestones = {};
for (var s = 0; s < 10; s++) {
  var seed = 10000 + s * 137;
  var r = runWorld(seed, { map_size: 'medium', tech_speed: 'normal', war_tendency: 'normal', disaster_freq: 'medium' }, 500);
  var f = r.final;
  var eraSym = f.era === 'antiquity' ? '●' : f.era === 'exploration' ? '◆' : '▲';
  var maxTech = Math.max(0, ...(f.settlements || []).map(function(st) { return st.tech_level || 0; }));
  log('  S' + seed + ' ' + eraSym + ' | Y' + f.year + ' ' + f.era +
    ' | Pop:' + String((f.stats.total_population || 0)).padStart(6) +
    ' | Sett:' + ((f.settlements || []).length) +
    ' | MaxTech:' + maxTech +
    ' | T:' + String(f.stats.tech_breakthroughs || 0).padStart(2) +
    ' | W:' + String(f.stats.total_wars || 0).padStart(2));

  // Track milestones
  (f.milestones || []).forEach(function(m) {
    if (!milestones[m.id]) milestones[m.id] = { count: 0, firstYear: m.year };
    milestones[m.id].count++;
    if (m.year < milestones[m.id].firstYear) milestones[m.id].firstYear = m.year;
  });
}

log('\n--- Milestone frequency (out of 10) ---');
Object.keys(milestones).sort().forEach(function(k) {
  log('  ' + k + ': ' + milestones[k].count + '/10 (first at Y' + milestones[k].firstYear + ')');
});

// ===============================================================
// TEST SUITE 4: Civilization influence
// ===============================================================
log('\n\n======================================================================');
log('SUITE 4: Civilization bonuses (Egypt vs Mongolia, 5 seeds × 200 years)');
log('======================================================================');

var CIVS = {
  egypt: { id: 'egypt', name: '埃及', leader: 'cleopatra', leader_name: '克利奥帕特拉',
    bonuses: { food_multiply: 1.3, growth_rate: 1.2, culture_output: 1.5, great_person_rate: 1.25 },
    unique_unit: '战车射手', unique_building: '金字塔',
    agenda: { name: '文化庇护', weights: { culture: 1.4, war: 0.6 } } },
  mongolia: { id: 'mongolia', name: '蒙古', leader: 'genghis', leader_name: '成吉思汗',
    bonuses: { military_multiply: 1.5, expansion_rate: 1.3, movement_speed: 1.3 },
    unique_unit: '蒙古弓骑', unique_building: '驿站',
    agenda: { name: '征服世界', weights: { military: 1.6, war: 1.5 } } }
};

Object.keys(CIVS).forEach(function(civKey) {
  var civ = CIVS[civKey];
  log('\n--- ' + civ.name + ' ---');
  var pops4 = [];
  for (var s = 0; s < 5; s++) {
    var seed = 20000 + s * 97;
    var cfg = { seed: seed, map_size: 'medium', tech_speed: 'normal', war_tendency: 'normal', disaster_freq: 'medium' };
    var engine = new WorldEngine(cfg);
    engine.initialize();
    engine.setCivilization('antiquity', civ.id, civ.leader, civ);
    for (var y = 0; y < 200; y++) engine.evolve();
    var f = engine.getState();
    pops4.push(f.stats.total_population || 0);
    log('  S' + seed + ' | Pop:' + (f.stats.total_population || 0) + ' | Sett:' + (f.settlements || []).length + ' | T:' + (f.stats.tech_breakthroughs || 0) + ' | W:' + (f.stats.total_wars || 0));
  }
  log('  -> Pop avg: ' + avg(pops4));
});

// ===============================================================
// TEST SUITE 5: Longevity - 3 seeds × 3000 years
// ===============================================================
log('\n\n======================================================================');
log('SUITE 5: Longevity test (3 seeds × 3000 years)');
log('======================================================================');
for (var s = 0; s < 3; s++) {
  var seed = 50000 + s * 199;
  var r = runWorld(seed, { map_size: 'medium', tech_speed: 'normal', war_tendency: 'normal', disaster_freq: 'medium' }, 3000);
  var f = r.final;
  var milestones_reached = (f.milestones || []).length;
  log('  S' + seed + ' ' + f.era + ' | Y' + f.year + ' | Pop:' + (f.stats.total_population || 0) +
    ' | Sett:' + (f.settlements || []).length + ' | T:' + (f.stats.tech_breakthroughs || 0) +
    ' | W:' + (f.stats.total_wars || 0) + ' | Milestones:' + milestones_reached);
  // Show milestone timeline
  (f.milestones || []).forEach(function(m) {
    log('    Y' + m.year + ': ' + m.name);
  });
}

// ===============================================================
// FINAL REPORT
// ===============================================================
log('\n\n======================================================================');
log('FINAL REPORT');
log('======================================================================');
log('Tests completed: ' + (30 + 30 + 10 + 10 + 3) + ' runs across 5 suites');
log('');

// Save log
var logPath = path.join(base, 'scripts', 'test-results-' + Date.now() + '.log');
fs.writeFileSync(logPath, LOG.join('\n'), 'utf8');
console.log('Log saved to: ' + logPath);
console.log('\nAll tests complete.');
