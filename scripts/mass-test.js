var path = require('path');
var fs = require('fs');
var base = path.join(__dirname, '..');
var WorldEngine = require(path.join(base, 'assets/js/engine/world.js'));

var LOG = [];
function log(m) { console.log(m); LOG.push(m); }
function avg(a) { return a.length === 0 ? 0 : (a.reduce(function(x,y) { return x+y; }, 0) / a.length); }
function min(a) { return a.length === 0 ? 0 : Math.min.apply(null, a); }
function max(a) { return a.length === 0 ? 0 : Math.max.apply(null, a); }
function pct(a, fn) { return a.filter(fn).length / a.length * 100; }

function runWorld(seed, config, years) {
  var cfg = Object.assign({ seed: seed, name: 'W' + seed }, config);
  var engine = new WorldEngine(cfg);
  engine.initialize();
  for (var y = 0; y < years; y++) engine.evolve();
  var s = engine.getState();
  return {
    seed: seed, year: s.year, era: s.era,
    pop: s.stats.total_population || 0,
    setts: (s.settlements || []).length,
    tech: s.stats.tech_breakthroughs || 0,
    wars: s.stats.total_wars || 0,
    gold: s.stats.golden_ages || 0,
    maxTech: Math.max(0, ...(s.settlements || []).map(function(st) { return st.tech_level || 0; })),
    history: (s.history || []).length,
    legacy: s.legacy || {},
    trade: (s.trade_routes || []).length
  };
}

// ==========================================================
// CONFIG TEMPLATES
// ==========================================================
var STANDARD = { map_size: 'medium', ocean_ratio: 50, world_shape: 'continent', latitude: 'temperate',
  climate_type: 'varied', temperature: 'moderate', rainfall: 'moderate', seasonality: 'moderate',
  disaster_freq: 'medium', resource_abundance: 'normal', strategic_resource_freq: 'normal',
  initial_population: 15, population_growth_rate: 1.0, max_population_cap: 'normal',
  initial_settlements: 3, settlement_split_rate: 0.5,
  tech_speed: 'normal', tech_diffusion: 'normal', starting_tech: 0,
  trade_openness: 'normal', economic_system: 'mercantile', tax_rate: 'moderate',
  cultural_identity: 'diverse', religion_type: 'secular', religion_spread: 'normal', artistic_flourish: 'normal',
  government_type: 'chiefdom', war_tendency: 'normal', military_spending: 'normal', diplomacy_style: 'pragmatic' };

var EGYPT = Object.assign({}, STANDARD, { resource_abundance: 'abundant', climate_type: 'mild', population_growth_rate: 1.5 });

var MONGOL = Object.assign({}, STANDARD, { war_tendency: 'aggressive', military_spending: 'high', government_type: 'empire', diplomacy_style: 'expansionist' });

var PEACE = Object.assign({}, STANDARD, { war_tendency: 'pacifist', diplomacy_style: 'diplomatic', government_type: 'democracy', military_spending: 'low' });

var FROZEN = Object.assign({}, STANDARD, { latitude: 'arctic', temperature: 'cold', rainfall: 'arid', climate_type: 'harsh', resource_abundance: 'scarce' });

var TROPIC = Object.assign({}, STANDARD, { latitude: 'tropical', temperature: 'hot', rainfall: 'tropical', climate_type: 'mild', resource_abundance: 'abundant' });

var FAST = Object.assign({}, STANDARD, { tech_speed: 'fast', trade_openness: 'global', economic_system: 'capitalist', population_growth_rate: 1.5 });

var SURVIVAL = Object.assign({}, STANDARD, { disaster_freq: 'constant', war_tendency: 'aggressive', climate_type: 'harsh', resource_abundance: 'scarce', seasonality: 'extreme' });

var CONFIGS = [
  { name: 'STANDARD 标准', cfg: STANDARD },
  { name: 'EGYPT 埃及富饶', cfg: EGYPT },
  { name: 'MONGOL 蒙古好战', cfg: MONGOL },
  { name: 'PEACE 和平民主', cfg: PEACE },
  { name: 'FROZEN 冰封极地', cfg: FROZEN },
  { name: 'TROPIC 热带雨林', cfg: TROPIC },
  { name: 'FAST 科技飞跃', cfg: FAST },
  { name: 'SURVIVAL 生存地狱', cfg: SURVIVAL },
];

// ==========================================================
// RUN
// ==========================================================
var YEARS = 300;
var SEEDS_PER_CONFIG = 12;
var allResults = [];

log('======================================================================');
log('大规模交叉测试: ' + CONFIGS.length + ' 配置 × ' + SEEDS_PER_CONFIG + ' 种子 × ' + YEARS + ' 年');
log('======================================================================\n');

CONFIGS.forEach(function(config) {
  log('--- ' + config.name + ' ---');
  var pops = [], setts = [], techs = [], wars = [], eras = [], trades = [];
  for (var s = 0; s < SEEDS_PER_CONFIG; s++) {
    var seed = 100000 + (CONFIGS.indexOf(config) * 1000) + s * 37;
    var r = runWorld(seed, config.cfg, YEARS);
    pops.push(r.pop); setts.push(r.setts); techs.push(r.tech); wars.push(r.wars);
    eras.push(r.era); trades.push(r.trade);
    allResults.push(r);
    var es = r.era === 'antiquity' ? '●' : r.era === 'exploration' ? '◆' : '▲';
    log('  ' + String(s+1).padStart(2) + ' ' + es + ' Pop:' + String(r.pop).padStart(5) + ' S:' + r.setts + ' T:' + String(r.tech).padStart(2) + ' W:' + String(r.wars).padStart(2) + ' GA:' + r.gold + ' MxT:' + r.maxTech + ' Tr:' + r.trade);
  }
  var eraPct = pct(eras, function(e) { return e !== 'antiquity'; });
  var modernPct = pct(eras, function(e) { return e === 'modern'; });
  log('  ─────────────────────────────────────────────');
  log('  Era≥探索: ' + eraPct.toFixed(0) + '%  | 现代:' + modernPct.toFixed(0) + '%  | Pop avg:' + avg(pops).toFixed(0) + ' min:' + min(pops) + ' max:' + max(pops));
  log('  Sett avg:' + avg(setts).toFixed(1) + '  Tech avg:' + avg(techs).toFixed(1) + '  War avg:' + avg(wars).toFixed(1) + '  Trade avg:' + avg(trades).toFixed(1));
  log('');
});

// ==========================================================
// SUMMARY TABLE
// ==========================================================
log('======================================================================');
log('对比总表 (' + YEARS + '年 × ' + SEEDS_PER_CONFIG + '种子)');
log('======================================================================');
log('');
log(' 配置                     时代率  现代率  平均人口  平均聚落  平均科技  平均战争  平均贸易');
log('─────────────────────────────────────────────────────────────────────────────');
CONFIGS.forEach(function(config, ci) {
  var pops = [], setts = [], techs = [], wars = [], eras = [], trades = [];
  for (var s = 0; s < SEEDS_PER_CONFIG; s++) {
    var seed = 100000 + ci * 1000 + s * 37;
    var r = runWorld(seed, config.cfg, YEARS);
    pops.push(r.pop); setts.push(r.setts); techs.push(r.tech); wars.push(r.wars);
    eras.push(r.era); trades.push(r.trade);
  }
  var eraPct = pct(eras, function(e) { return e !== 'antiquity'; });
  var modPct = pct(eras, function(e) { return e === 'modern'; });
  log('  ' + config.name.padEnd(22) +
    String(eraPct.toFixed(0)).padStart(5) + '%' +
    String(modPct.toFixed(0)).padStart(6) + '%' +
    String(avg(pops).toFixed(0)).padStart(9) +
    String(avg(setts).toFixed(1)).padStart(8) +
    String(avg(techs).toFixed(1)).padStart(8) +
    String(avg(wars).toFixed(1)).padStart(8) +
    String(avg(trades).toFixed(1)).padStart(8));
});

// ==========================================================
// CORRELATION ANALYSIS
// ==========================================================
log('\n\n======================================================================');
log('关联分析 (基于全部 ' + (CONFIGS.length * SEEDS_PER_CONFIG) + ' 个世界)');
log('======================================================================\n');

// Group by key parameters
var allPops = allResults.map(function(r) { return r.pop; });
var allSetts = allResults.map(function(r) { return r.setts; });
var allTechs = allResults.map(function(r) { return r.tech; });
var allWars = allResults.map(function(r) { return r.wars; });

log('全局范围: 人口 ' + min(allPops) + '~' + max(allPops) + '  聚落 ' + min(allSetts) + '~' + max(allSetts) +
  '  科技 ' + min(allTechs) + '~' + max(allTechs) + '  战争 ' + min(allWars) + '~' + max(allWars));

// Top 10 by population
var sortedByPop = allResults.slice().sort(function(a,b) { return b.pop - a.pop; });
log('\n人口 TOP 10:');
for (var i = 0; i < 10; i++) {
  var r = sortedByPop[i];
  log('  #' + (i+1) + ' S' + r.seed + ' Pop:' + r.pop + ' S:' + r.setts + ' T:' + r.tech + ' W:' + r.wars + ' Era:' + r.era);
}

// Bottom 10 by population
var sortedByPopAsc = allResults.slice().sort(function(a,b) { return a.pop - b.pop; });
log('\n人口 BOTTOM 10:');
for (var i = 0; i < 10; i++) {
  var r = sortedByPopAsc[i];
  log('  #' + (i+1) + ' S' + r.seed + ' Pop:' + r.pop + ' S:' + r.setts + ' T:' + r.tech + ' W:' + r.wars + ' Era:' + r.era);
}

// War impact analysis
log('\n战争影响分析:');
var lowWar = allResults.filter(function(r) { return r.wars <= 5; });
var highWar = allResults.filter(function(r) { return r.wars >= 15; });
if (lowWar.length > 0 && highWar.length > 0) {
  log('  低战争(≤5): ' + lowWar.length + '个世界  avgPop=' + avg(lowWar.map(function(r) { return r.pop; })).toFixed(0) + '  avgTech=' + avg(lowWar.map(function(r) { return r.tech; })).toFixed(1));
  log('  高战争(≥15): ' + highWar.length + '个世界  avgPop=' + avg(highWar.map(function(r) { return r.pop; })).toFixed(0) + '  avgTech=' + avg(highWar.map(function(r) { return r.tech; })).toFixed(1));
}

// Era progression analysis
log('\n时代推进分析:');
var ant = allResults.filter(function(r) { return r.era === 'antiquity'; });
var exp = allResults.filter(function(r) { return r.era === 'exploration'; });
var mod = allResults.filter(function(r) { return r.era === 'modern'; });
log('  停留在古典: ' + ant.length + '/' + allResults.length + ' (' + (ant.length/allResults.length*100).toFixed(1) + '%)');
log('  进入探索: ' + exp.length + '/' + allResults.length + ' (' + (exp.length/allResults.length*100).toFixed(1) + '%)');
log('  进入现代: ' + mod.length + '/' + allResults.length + ' (' + (mod.length/allResults.length*100).toFixed(1) + '%)');

// Save log
var logPath = path.join(base, 'scripts', 'mass-test-' + Date.now() + '.log');
fs.writeFileSync(logPath, LOG.join('\n'), 'utf8');
log('\n\nLog: ' + logPath);
log('Done.');
