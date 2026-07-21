'use strict';

const TECH_NAMES = ['原始','农耕','青铜','铁器','蒸汽','电力','信息'];
const LEVEL_NAMES = ['营地','村落','城镇','城市','大都会','核心城','巨型城市'];
const MAX_POP_BASE = [50, 200, 500, 1000, 3000, 8000, 20000];
const LEVEL_UP_POP = [35, 150, 400, 800, 2500, 6000, 15000];

function pf(v, def) { return v !== undefined && v !== null ? v : def; }

const NAME_POOLS = {
  antiquity: ['河畔城','铁壁堡','风语村','星落镇','云隐村','石崖关','月影城','日光原','冰谷镇','火羽村','山脊堡','绿野镇','金沙城','黑岩村','碧水镇'],
  exploration: ['大商港','远帆城','王国都','新大陆','殖民堡','要塞镇','传教站','贸易站','前哨基','边陲村','金山城','翡翠港','香料镇','丝绸堡','瓷器村'],
  modern: ['都会区','高新区','产业园','金融城','科技谷','自由港','枢纽站','智造城','数据岛','生态城','创新园','国际港','智慧镇','绿能城','未来都']
};
function pickName(era, rng, taken) {
  var pool = NAME_POOLS[era] || NAME_POOLS.antiquity;
  var avail = pool.filter(function(n) { return taken.indexOf(n) === -1; });
  if (avail.length === 0) { return '聚落' + (taken.length + 1); }
  return avail[Math.floor(rng() * avail.length)];
}
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function log10(x) { return Math.log(x) / Math.LN10; }

function cfg(s, key, def) {
  if (!s || !s.config) return def;
  var v = s.config[key];
  return v !== undefined && v !== null ? v : def;
}

function WorldEngine(config, state) {
  this.config = config || {};
  this.state = state || this._createState();
  if (!this.state.history) this.state.history = [];
  if (!this.state.stats) this.state.stats = { total_population: 0, total_settlements: 0, extinct_settlements: 0, total_wars: 0, tech_breakthroughs: 0, golden_ages: 0, dark_ages: 0 };
  this._pendingNotifications = [];
  this._milestones = {};
  this._initialized = false;
  this._rng = this._makeRNG(this.config.seed || Date.now());
}

WorldEngine.prototype._createState = function() {
  return {
    world_id: 'w' + Date.now().toString(36) + Math.random().toString(36).substr(2,4),
    name: this.config.name || '未命名世界',
    era: 'antiquity', year: 0,
    civilization: { antiquity: null, exploration: null, modern: null },
    active_civ: null, active_leader: null,
    map_size: { width: 60, height: 60 },
    terrain: { tiles: [], resources: [] },
    settlements: [], active_events: [], trade_routes: [],
    legacy: { military: 0, economic: 0, cultural: 0, scientific: 0 },
    milestones: [],
    stats: { total_population: 0, total_settlements: 0, extinct_settlements: 0, total_wars: 0, tech_breakthroughs: 0, golden_ages: 0, dark_ages: 0 },
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };
};

WorldEngine.prototype.initialize = function() {
  if (this._initialized) return this.state;
  this._setupTerrain();
  this._setupSettlements();
  this._updateStats();
  var st = parseInt(cfg(this, 'starting_tech', 0));
  if (st > 0) {
    (this.state.settlements || []).forEach(function(s) { s.tech_level = Math.min(st, 6); });
  }
  this._initialized = true;
  this._notify('世界诞生', this.state.name + '诞生了。', 'milestone');
  return this.state;
};

WorldEngine.prototype.setCivilization = function(eraId, civId, leaderId, civData) {
  this.state.civilization[eraId] = { civ: civId, leader: leaderId, data: civData };
  this.state.active_civ = civData;
  this.state.active_leader = (civData && civData.leader_name) || leaderId;
  this._notify('文明确立', '以' + (civData ? civData.name : civId) + '文明崛起。', 'milestone');
};

WorldEngine.prototype.bonus = function(key, def) {
  var civ = this.state.active_civ;
  if (!civ || !civ.bonuses) return pf(def, 1.0);
  var v = civ.bonuses[key];
  return v !== undefined ? v : pf(def, 1.0);
};

// ===== TERRAIN =====
WorldEngine.prototype._setupTerrain = function() {
  var ms = cfg(this, 'map_size', 'medium');
  var size = { small: 30, medium: 60, large: 80 }[ms] || 60;
  this.state.map_size = { width: size, height: size };
  var rng = this._makeRNG(this.config.seed || Date.now());
  var tiles = [];
  var oceanRatio = parseFloat(cfg(this, 'ocean_ratio', 50)) / 100;
  var shape = cfg(this, 'world_shape', 'continent');
  var lat = cfg(this, 'latitude', 'temperate');
  var arableFactor = { arctic: 0.3, cold: 0.6, temperate: 0.85, tropical: 0.7, random: 0.5 + rng() * 0.5 }[lat] || 0.85;
  for (var y = 0; y < size; y++) {
    tiles[y] = [];
    for (var x = 0; x < size; x++) {
      var isOcean = false;
      if (shape === 'archipelago') {
        var cx = size / 2, cy = size / 2;
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (size * 0.5);
        isOcean = (d > 0.3 + rng() * 0.3 && rng() < oceanRatio * 1.2);
      } else if (shape === 'pangaea') {
        var c2 = size / 2;
        var d2 = Math.sqrt((x - c2) * (x - c2) + (y - c2) * (y - c2)) / (size * 0.5);
        isOcean = d2 > 0.7 + rng() * 0.2 || (rng() < oceanRatio * 0.5 && d2 > 0.4);
      } else {
        isOcean = rng() < oceanRatio;
      }
      tiles[y][x] = isOcean ? 0 : 1;
    }
  }
  var abun = cfg(this, 'resource_abundance', 'normal');
  var abunMul = { scarce: 0.5, normal: 1.0, abundant: 2.0, random: 0.5 + rng() * 1.5 }[abun] || 1.0;
  var stratFreq = cfg(this, 'strategic_resource_freq', 'normal');
  var stratMul = { none: 0, low: 0.3, normal: 1.0, high: 2.0 }[stratFreq] || 1.0;
  var temp = cfg(this, 'temperature', 'moderate');
  var rain = cfg(this, 'rainfall', 'moderate');
  var tempFactor = { cold: 0.5, cool: 0.75, moderate: 1.0, warm: 1.1, hot: 0.8 }[temp] || 1.0;
  var rainFactor = { arid: 0.3, dry: 0.6, moderate: 1.0, wet: 1.2, tropical: 1.3 }[rain] || 1.0;
  var foodFactor = arableFactor * tempFactor * rainFactor;

  var rc = Math.floor((15 + rng() * 25) * abunMul);
  var types = ['food','food','food','wood','wood','wood','ore','ore','water','water','luxury','strategic'];
  var resources = [];
  for (var i = 0; i < rc; i++) {
    var x = Math.floor(rng() * size), y = Math.floor(rng() * size);
    if (tiles[y][x] === 0) continue;
    var type = types[i % types.length];
    if (type === 'strategic' && rng() > stratMul) continue;
    var amount = Math.floor((50 + rng() * 50) * (type === 'food' ? foodFactor : 1.0));
    resources.push({ type: type, x: x, y: y, amount: Math.max(10, amount) });
  }
  this.state.terrain = { tiles: tiles, resources: resources, foodFactor: foodFactor };
};

// ===== SETTLEMENTS =====
WorldEngine.prototype._setupSettlements = function() {
  var rng = this._makeRNG((this.config.seed || Date.now()) + 2);
  var tiles = this.state.terrain.tiles, resources = this.state.terrain.resources;
  var h = tiles.length, w = tiles[0].length;
  var target = parseInt(cfg(this, 'initial_settlements', 3));
  var initPop = parseInt(cfg(this, 'initial_population', 15));
  var setts = [], taken = [];
  var scored = [];
  for (var y = 3; y < h - 3; y++) {
    for (var x = 3; x < w - 3; x++) {
      if (tiles[y][x] === 0) continue;
      var score = rng() * 15;
      for (var ri = 0; ri < (resources || []).length; ri++) {
        var r = resources[ri];
        var d = Math.sqrt((x - r.x) * (x - r.x) + (y - r.y) * (y - r.y));
        if (d < 5) { score += 15 - d * 2; if (r.type === 'food') score += 8; }
      }
      scored.push({ x: x, y: y, score: score });
    }
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  for (var s = 0; s < Math.min(target, scored.length); s++) {
    var pt = scored[s];
    if (s > 0) {
      var tooClose = false;
      for (var si = 0; si < setts.length; si++) {
        if (Math.sqrt((pt.x - setts[si].x) * (pt.x - setts[si].x) + (pt.y - setts[si].y) * (pt.y - setts[si].y)) < 8)
          { tooClose = true; break; }
      }
      if (tooClose) continue;
    }
    var name = pickName('antiquity', rng, taken);
    taken.push(name);
    setts.push({
      id: 'SET' + String(s + 1).padStart(3, '0'), name: name,
      x: pt.x, y: pt.y, level: 1, population: initPop + Math.floor(rng() * 10),
      max_population: MAX_POP_BASE[0], tech_level: 0, culture: 0, influence: 0,
      health: 0.8, stability: 0.7,
      resources: { food: 60, wood: 30, ore: 8, water: 40, gold: 0 },
      buildings: [], specialization: null,
      bonus_duration: 0, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0,
      tech_bonus: 0, inspiration_duration: 0,
      immune: false, sanctuary_duration: 0, resource_depletion_years: 0,
      status: '发展', trade_partners: []
    });
  }
  this.state.settlements = setts;
};

// ===== EVOLVE =====
WorldEngine.prototype.evolve = function() {
  if (!this._initialized) this.initialize();
  this.state.year++;
  this._evolveResources();
  this._evolveTrade();
  this._evolveSettlements();
  this._evolveTech();
  this._evolveEvents();
  this._evolveLegacy();
  this._checkEra();
  this._checkMilestones();
  this._updateStats();
  this.state.updated_at = new Date().toISOString();
  return this.state;
};

// ===== RESOURCES =====
WorldEngine.prototype._evolveResources = function() {
  var res = this.state.terrain.resources;
  if (!res) return;
  for (var i = 0; i < res.length; i++) res[i].amount = Math.min(100, (res[i].amount || 0) + 1);
};

// ===== TRADE =====
WorldEngine.prototype._evolveTrade = function() {
  var setts = this.state.settlements;
  if (!setts || setts.length < 2) return;
  var openness = cfg(this, 'trade_openness', 'normal');
  var openMul = { closed: 0, low: 0.3, normal: 1.0, high: 2.0, global: 3.0 }[openness] || 1.0;
  var ecoSys = cfg(this, 'economic_system', 'mercantile');
  var ecoMul = { barter: 0.5, tributary: 0.7, mercantile: 1.0, capitalist: 1.5, planned: 0.8 }[ecoSys] || 1.0;
  var tax = cfg(this, 'tax_rate', 'moderate');
  var taxRate = { none: 0, low: 0.05, moderate: 0.1, high: 0.2, oppressive: 0.35 }[tax] || 0.1;
  this.state.trade_routes = [];
  for (var i = 0; i < setts.length; i++) {
    var a = setts[i];
    if (!a.trade_partners) a.trade_partners = [];
    for (var j = i + 1; j < setts.length; j++) {
      var b = setts[j];
      var dist = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
      if (dist > 15) continue;
      if (a.level >= 2 && b.level >= 2) {
        if (a.trade_partners.indexOf(b.id) === -1) a.trade_partners.push(b.id);
        if (b.trade_partners.indexOf(a.id) === -1) b.trade_partners.push(a.id);
        var baseGold = 1 + (a.level + b.level) / 2;
        var tradeGold = Math.floor(baseGold * openMul * ecoMul);
        var taxGold = Math.floor(tradeGold * taxRate);
        a.resources.gold = (a.resources.gold || 0) + tradeGold - taxGold;
        b.resources.gold = (b.resources.gold || 0) + tradeGold - taxGold;
        var foodShare = Math.min(4, (a.resources.food || 0) * 0.04);
        a.resources.food = (a.resources.food || 0) + foodShare * 0.4;
        b.resources.food = (b.resources.food || 0) + foodShare * 0.4;
        this.state.trade_routes.push({ from: a.id, to: b.id, gold: tradeGold });
      }
    }
  }
};

// ===== SETTLEMENTS =====
WorldEngine.prototype._evolveSettlements = function() {
  var self = this;
  var setts = this.state.settlements, resources = this.state.terrain.resources;
  if (!setts) return;
  var toAdd = [];
  var growthRate = parseFloat(cfg(this, 'population_growth_rate', 1.0));
  var popCapMode = cfg(this, 'max_population_cap', 'normal');
  var popCapMul = { low: 0.6, normal: 1.0, high: 1.5, unlimited: 3.0 }[popCapMode] || 1.0;
  var splitRate = parseFloat(cfg(this, 'settlement_split_rate', 0.5));

  setts.forEach(function(s) {
    if ((s.population || 0) <= 0) return;
    if (!s.resources) s.resources = { food: 0, wood: 0, ore: 0, water: 0, gold: 0 };
    if (!s.trade_partners) s.trade_partners = [];

    if (resources) {
      for (var ri = 0; ri < resources.length; ri++) {
        var r = resources[ri];
        if (Math.sqrt((s.x - r.x) * (s.x - r.x) + (s.y - r.y) * (s.y - r.y)) > 6) continue;
        var harvest = Math.min(r.amount, (s.population || 0) * 0.06);
        r.amount -= harvest;
        var fb = (r.type === 'food') ? self.bonus('food_multiply', 1.0) : 1.0;
        var amt = harvest * fb;
        if (r.type === 'food') s.resources.food = (s.resources.food || 0) + amt;
        else if (r.type === 'wood') s.resources.wood = (s.resources.wood || 0) + amt;
        else if (r.type === 'ore') s.resources.ore = (s.resources.ore || 0) + amt;
        else if (r.type === 'water') s.resources.water = (s.resources.water || 0) + amt;
        else if (r.type === 'luxury') s.culture = (s.culture || 0) + 0.5;
      }
    }

    var climate = cfg(self, 'climate_type', 'varied');
    var climateMul = { mild: 1.2, varied: 1.0, harsh: 0.7, random: 0.8 + self._rng() * 0.4 }[climate] || 1.0;
    var seasonality = cfg(self, 'seasonality', 'moderate');
    var seasonVar = { none: 1.0, mild: 0.95 + self._rng() * 0.1, moderate: 0.85 + self._rng() * 0.2, extreme: 0.7 + self._rng() * 0.4 }[seasonality] || 1.0;
    s.resources.food = (s.resources.food || 0) * climateMul * seasonVar;

    var pop = s.population || 0;
    var foodCon = pop * 0.07, waterCon = pop * 0.05;
    s.resources.food = Math.max(0, (s.resources.food || 0) - foodCon);
    s.resources.water = Math.max(0, (s.resources.water || 0) - waterCon);

    var lvlBonus = (s.level || 1) * 0.3;
    var foodSurplus = (s.resources.food || 0);
    var grow = Math.max(0, (1 + foodSurplus * 0.12 + lvlBonus) * growthRate);
    var popMul = self.bonus('growth_rate', 1.0);
    grow *= popMul;

    if (s.resources.food <= 0 || s.resources.water <= 0) {
      var starve = Math.ceil(Math.abs(Math.min(0, s.resources.food || 0)) * 0.15 + Math.abs(Math.min(0, s.resources.water || 0)) * 0.1);
      s.population = Math.max(1, pop - Math.max(1, starve));
    } else {
      s.population = Math.min(Math.floor(MAX_POP_BASE[Math.min(s.level || 1, 7) - 1] * popCapMul), Math.round(pop + Math.max(0, grow)));
    }

    var lvlIdx = Math.min((s.level || 1) - 1, 6);
    if (lvlIdx < 6 && s.population >= Math.floor(LEVEL_UP_POP[lvlIdx] * popCapMul)) {
      s.level = lvlIdx + 2;
      s.max_population = Math.floor(MAX_POP_BASE[Math.min(s.level - 1, 6)] * popCapMul);
      if (s.level === 3 && !s.specialization) {
        var specs = ['agriculture','mining','trade'];
        s.specialization = specs[Math.floor(self._rng() * specs.length)];
      }
      self._notify('聚落升级', s.name + '升级为' + LEVEL_NAMES[Math.min(s.level - 1, 6)] + (s.specialization ? '(' + s.specialization + ')' : ''), 'settlement');
    }

    var cap = Math.floor(MAX_POP_BASE[Math.min((s.level || 1) - 1, 6)] * popCapMul);
    if (s.population > cap * 0.65 && s.population > 30) {
      var sp = ((s.population / cap) - 0.65) * 0.5 + 0.05;
      if (self._rng() < sp * splitRate) {
        var child = self._createChild(s);
        if (child) toAdd.push(child);
      }
    }

    ['bonus_duration','curse_duration','exploration_duration','inspiration_duration','sanctuary_duration'].forEach(function(k) {
      if (s[k] > 0) s[k]--;
    });
  });

  toAdd.forEach(function(ch) {
    ch.id = 'SET' + String(setts.length + 1).padStart(3, '0');
    setts.push(ch);
    self._notify('聚落建立', ch.name + '建立。', 'settlement');
  });
};

WorldEngine.prototype._createChild = function(parent) {
  var tiles = this.state.terrain.tiles;
  var h = tiles.length, w = tiles[0].length;
  var resources = this.state.terrain.resources;
  var spots = [];
  for (var ri = 0; ri < (resources || []).length; ri++) {
    var r = resources[ri];
    if (r.amount < 25) continue;
    for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) {
      if (dx === 0 && dy === 0) continue;
      var nx = r.x + dx, ny = r.y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (tiles[ny][nx] === 0) continue;
      var dist = Math.sqrt((parent.x - nx) * (parent.x - nx) + (parent.y - ny) * (parent.y - ny));
      if (dist < 5) continue;
      spots.push({ x: nx, y: ny, score: r.amount * 0.5 + dist * 0.3 + this._rng() * 20 });
    }
  }
  if (spots.length === 0) {
    for (var r2 = 5; r2 <= 15; r2 += 2) for (var a = 0; a < 8; a++) {
      var nx = Math.round(parent.x + r2 * Math.cos(Math.PI * 2 * a / 8));
      var ny = Math.round(parent.y + r2 * Math.sin(Math.PI * 2 * a / 8));
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (tiles[ny][nx] === 0) continue;
      spots.push({ x: nx, y: ny, score: this._rng() * 30 });
    }
  }
  if (spots.length === 0) return null;
  spots.sort(function(a, b) { return b.score - a.score; });
  var best = spots[0];
  var childPop = Math.max(5, Math.floor((parent.population || 0) * 0.25));
  parent.population = Math.max(1, (parent.population || 0) - childPop);
  return {
    name: pickName(this.state.era, this._rng, this.state.settlements.map(function(s) { return s.name; })),
    x: best.x, y: best.y, level: 1, population: childPop,
    max_population: MAX_POP_BASE[0], tech_level: Math.max(0, (parent.tech_level || 0) - 1),
    culture: 0, influence: 0, health: 0.7, stability: 0.6,
    resources: { food: 40, wood: 20, ore: 5, water: 25, gold: 0 },
    buildings: [], specialization: null,
    bonus_duration: 0, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0,
    tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0,
    resource_depletion_years: 0, status: '发展', trade_partners: [], founded_from: parent.name
  };
};

// ===== TECH =====
WorldEngine.prototype._evolveTech = function() {
  var self = this;
  var speedMul = { glacial: 0.3, slow: 0.6, normal: 1.0, fast: 1.8, instant: 5.0 }[cfg(this, 'tech_speed', 'normal')] || 1.0;
  var diffMul = { none: 0, low: 0.5, normal: 1.0, high: 2.0 }[cfg(this, 'tech_diffusion', 'normal')] || 1.0;
  var civTech = this.bonus('tech_multiply', 1.0);
  this.state.settlements.forEach(function(s) {
    if (s.tech_level >= 6) return;
    var base = 0.04 / (s.tech_level + 1);
    if (s.tech_level >= 3 && (s.level || 1) < 3) return;
    if (s.tech_level >= 5 && (s.level || 1) < 4) return;
    var popB = log10(Math.max(1, s.population || 1)) * 0.04;
    var neighborB = (s.trade_partners || []).length * 0.005 * diffMul;
    var chance = base * speedMul * civTech * (1 + popB + neighborB);
    if (s.tech_bonus > 0) chance += 0.03;
    if (self._rng() < chance) {
      s.tech_level++;
      self.state.stats.tech_breakthroughs++;
      self._notify('科技突破', s.name + '进入' + TECH_NAMES[Math.min(s.tech_level, 6)] + '！', 'tech');
    }
  });
};

// ===== EVENTS =====
WorldEngine.prototype._evolveEvents = function() {
  var self = this;
  var remaining = [];
  (this.state.active_events || []).forEach(function(evt) {
    evt.remaining_years--;
    if (evt.remaining_years <= 0) { self._notify('事件结束', evt.description + ' 结束。', 'event'); return; }
    self._applyEvent(evt);
    remaining.push(evt);
  });
  this.state.active_events = remaining;
  if (this._rng() < 0.25) {
    var evt = this._genEvent();
    if (evt) this.state.active_events.push(evt);
  }
};

WorldEngine.prototype._applyEvent = function(evt) {
  var smap = {};
  this.state.settlements.forEach(function(s) { smap[s.id] = s; });
  (evt.participants || []).forEach(function(pid) {
    var s = smap[pid];
    if (!s) return;
    var pop = s.population || 0;
    var milSpend = cfg(this, 'military_spending', 'normal');
    var defMul = { none: 0.3, low: 0.6, normal: 1.0, high: 1.5, total: 2.0 }[milSpend] || 1.0;
    switch (evt.type) {
      case 'war':
        if (this._rng() < 0.2 / defMul) s.population = Math.max(1, pop - Math.floor(pop * (0.02 + this._rng() * 0.03)));
        break;
      case 'natural_disaster':
        if (this._rng() < 0.3) s.population = Math.max(1, pop - Math.floor(pop * (0.03 + this._rng() * 0.05)));
        break;
      case 'plague':
        if (pop > 200 && this._rng() < 0.4) s.population = Math.max(1, pop - Math.floor(pop * (0.05 + this._rng() * 0.08)));
        break;
      case 'cultural_boom':
        var artMul = { none: 0, low: 0.5, normal: 1.0, high: 2.0 }[cfg(this, 'artistic_flourish', 'normal')] || 1.0;
        s.population = Math.min(s.max_population || 5000, pop + Math.floor((3 + this._rng() * 6) * artMul));
        s.culture = (s.culture || 0) + 10 * artMul;
        break;
      case 'golden_age':
        s.population = Math.min(s.max_population || 5000, pop + Math.floor(5 + this._rng() * 10));
        s.culture = (s.culture || 0) + 20;
        break;
    }
  }.bind(this));
};

WorldEngine.prototype._genEvent = function() {
  var s = this.state.settlements;
  if (!s || s.length === 0) return null;
  var warW = 2, disasterW = 2.5, plagueW = 1.5, cultureW = 5, goldW = 2;

  var civ = this.state.active_civ;
  if (civ && civ.agenda && civ.agenda.weights) {
    warW *= (civ.agenda.weights.military || 1.0);
    cultureW *= (civ.agenda.weights.culture || 1.0);
  }
  var warTend = cfg(this, 'war_tendency', 'normal');
  var warMul = { pacifist: 0.1, peaceful: 0.3, normal: 1.0, aggressive: 2.0, conquest: 3.0 }[warTend] || 1.0;
  var disFreq = cfg(this, 'disaster_freq', 'medium');
  var disMul = { none: 0, low: 0.5, medium: 1.0, high: 2.0, constant: 4.0 }[disFreq] || 1.0;
  var dipStyle = cfg(this, 'diplomacy_style', 'pragmatic');
  var dipWar = { isolationist: 1.2, pragmatic: 1.0, diplomatic: 0.5, expansionist: 1.5 }[dipStyle] || 1.0;
  var govType = cfg(this, 'government_type', 'chiefdom');
  var govWar = { tribal: 1.5, chiefdom: 1.2, kingdom: 1.0, empire: 1.3, republic: 0.7, democracy: 0.5, theocracy: 0.9 }[govType] || 1.0;

  warW *= warMul * dipWar * govWar;
  disasterW *= disMul;
  cultureW *= (parseFloat(cfg(this, 'artistic_flourish', 1.0)) || 1.0);

  var total = warW + disasterW + plagueW + cultureW + goldW;
  var roll = this._rng() * total;
  var type;
  if (roll < warW) type = 'war';
  else if (roll < warW + disasterW) type = 'natural_disaster';
  else if (roll < warW + disasterW + plagueW) type = 'plague';
  else if (roll < warW + disasterW + plagueW + cultureW) type = 'cultural_boom';
  else type = 'golden_age';

  if (type === 'plague') {
    var bigPop = s.filter(function(x) { return (x.population || 0) > 200; });
    if (bigPop.length === 0) type = 'cultural_boom';
  }
  var target = s[Math.floor(this._rng() * s.length)];
  var target2 = target;
  if (s.length > 1) {
    do { target2 = s[Math.floor(this._rng() * s.length)]; } while (target2.id === target.id);
  }
  if (type === 'war' && target2.id === target.id) {
    type = this._rng() < 0.5 ? 'cultural_boom' : 'golden_age';
  }
  var data = { id: 'EVT' + Math.floor(this._rng() * 100000), type: type, participants: [target.id], remaining_years: 3 + Math.floor(this._rng() * 8), duration: 3 + Math.floor(this._rng() * 8) };
  switch (type) {
    case 'war':
      data.participants.push(target2.id);
      data.description = target.name + '与' + target2.name + '爆发战争！';
      this.state.stats.total_wars++;
      break;
    case 'natural_disaster': data.description = target.name + '遭受自然灾害。'; break;
    case 'plague': data.description = target.name + '爆发瘟疫。'; break;
    case 'cultural_boom': data.description = target.name + '迎来文化繁荣。'; break;
    case 'golden_age': data.description = target.name + '进入黄金时代！'; this.state.stats.golden_ages++; break;
  }
  this._notify('新事件', data.description, data.type);
  return data;
};

// ===== ERA =====
WorldEngine.prototype._checkEra = function() {
  var setts = this.state.settlements;
  if (!setts || setts.length === 0) return;
  var maxTech = 0, totalPop = 0;
  setts.forEach(function(s) { if (s.tech_level > maxTech) maxTech = s.tech_level; totalPop += s.population || 0; });
  var sCount = setts.length, era = this.state.era;
  var isSmall = this.state.map_size.width < 40;

  if (era === 'antiquity' && maxTech >= 3 && totalPop > 300 && sCount >= (isSmall ? 2 : 3)) {
    this.state.era = 'exploration';
    this._notify('时代飞升', '进入探索时代！', 'milestone');
    this.state.legacy.military += (this.state.stats.total_wars || 0) * 5;
    this.state.legacy.economic += Math.floor(totalPop / 10);
    this.state.legacy.cultural += (this.state.stats.golden_ages || 0) * 20;
    this.state.legacy.scientific += (this.state.stats.tech_breakthroughs || 0) * 10;
    setts.forEach(function(s) { s.resources.food = (s.resources.food || 0) + 50; s.population = Math.min(s.max_population || 5000, (s.population || 0) + 20); });
  } else if (era === 'exploration' && maxTech >= 5 && totalPop > 5000 && sCount >= 5) {
    this.state.era = 'modern';
    this._notify('时代飞升', '进入现代时代！', 'milestone');
    this.state.legacy.military += (this.state.stats.total_wars || 0) * 3;
    this.state.legacy.economic += Math.floor(totalPop / 20);
    this.state.legacy.cultural += (this.state.stats.golden_ages || 0) * 10;
    this.state.legacy.scientific += (this.state.stats.tech_breakthroughs || 0) * 5;
    setts.forEach(function(s) { s.resources.gold = (s.resources.gold || 0) + 100; s.population = Math.min(s.max_population || 5000, (s.population || 0) + 30); });
  }
};

// ===== LEGACY =====
WorldEngine.prototype._evolveLegacy = function() {
  this.state.legacy.military += (this.state.active_events || []).filter(function(e) { return e.type === 'war'; }).length * 0.1;
  this.state.legacy.economic += (this.state.trade_routes || []).length * 0.05;
  this.state.legacy.cultural += (this.state.stats.golden_ages || 0) * 0.1;
  this.state.legacy.scientific += (this.state.stats.tech_breakthroughs || 0) * 0.05;
};

// ===== MILESTONES =====
WorldEngine.prototype._checkMilestones = function() {
  var s = this.state;
  var checks = [
    { id: 'pop_1000', name: '繁荣', ok: (s.stats.total_population || 0) >= 1000 },
    { id: 'pop_10000', name: '城邦', ok: (s.stats.total_population || 0) >= 10000 },
    { id: 'pop_100000', name: '王国', ok: (s.stats.total_population || 0) >= 100000 },
    { id: 'setts_3', name: '扩张', ok: (s.settlements || []).length >= 3 },
    { id: 'setts_10', name: '联邦', ok: (s.settlements || []).length >= 10 },
    { id: 'era_exploration', name: '远洋', ok: s.era === 'exploration' || s.era === 'modern' },
    { id: 'era_modern', name: '现代', ok: s.era === 'modern' },
    { id: 'year_500', name: '五百年', ok: (s.year || 0) >= 500 },
    { id: 'year_1000', name: '千年', ok: (s.year || 0) >= 1000 },
  ];
  checks.forEach(function(c) {
    if (c.ok && !this._milestones[c.id]) {
      this._milestones[c.id] = true;
      if (!s.milestones) s.milestones = [];
      s.milestones.push({ id: c.id, name: c.name, year: s.year });
      this._notify('里程碑', '达成: ' + c.name, 'milestone');
    }
  }, this);
};

// ===== HELPERS =====
WorldEngine.prototype._updateStats = function() {
  var tp = 0;
  (this.state.settlements || []).forEach(function(s) { tp += s.population || 0; });
  this.state.stats.total_population = tp;
  this.state.stats.total_settlements = (this.state.settlements || []).length;
};
WorldEngine.prototype._notify = function(title, desc, type) {
  this._pendingNotifications.push({ title: title, description: desc, type: type || 'info', year: this.state.year });
  if (!this.state.history) this.state.history = [];
  this.state.history.push({ year: this.state.year, type: type || 'info', title: title, description: desc });
  if (this.state.history.length > 500) this.state.history = this.state.history.slice(-500);
};
WorldEngine.prototype.getNotifications = function() { var n = this._pendingNotifications.slice(); this._pendingNotifications = []; return n; };
WorldEngine.prototype.getState = function() { return this.state; };
WorldEngine.prototype._makeRNG = function(seed) { var s = seed >>> 0; return function() { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

export default WorldEngine;
