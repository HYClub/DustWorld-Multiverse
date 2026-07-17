'use strict';

var TerrainGenerator = require('./terrain.js');
var SettlementEvolver = require('./settlement.js');
var EventGenerator = require('./events.js');

function WorldEngine(config, state) {
  this.config = JSON.parse(JSON.stringify(config));;
  this.state = JSON.parse(JSON.stringify(state));;
  this.history = [];
  this.settlementEvolver = new SettlementEvolver(config);
  this.eventGenerator = new EventGenerator(config);
}

WorldEngine.prototype.evolve = function () {
  this.evolveResources();
  this.evolveSettlements();
  this.evolveTechnology();
  var newEvents = this.generateEvents();
  this.processInterventions();
  this.updateStats();
  this.updateEra();
  this.state.year++;

  for (var i = 0; i < newEvents.length; i++) {
    this.addHistoryEvent(newEvents[i].type, newEvents[i].description);
  }

  return this.state;
};

WorldEngine.prototype.addHistoryEvent = function (type, description) {
  this.history.push({ year: this.state.year, type: type, description: description });
};

WorldEngine.prototype.evolveResources = function () {
  if (!this.state.terrain.resources) return;
  var abundance = this.config.resource_abundance || 'normal';
  var growthRates = { scarce: 1, normal: 2, abundant: 3 };
  var growthRate = growthRates[abundance] !== undefined ? growthRates[abundance] : 2;
  if (abundance === 'random') growthRate = Math.floor(Math.random() * 3) + 1;

  for (var i = 0; i < this.state.terrain.resources.length; i++) {
    var r = this.state.terrain.resources[i];
    r.amount = Math.min(100, r.amount + growthRate);
    if (Math.random() < 0.05) {
      r.amount = Math.max(0, r.amount - Math.floor(Math.random() * 10) + 10);
    }
  }

  if (Math.random() < 0.03 && this.state.settlements && this.state.settlements.length > 0) {
    var types = ['wood', 'ore', 'food', 'water'];
    var s = this.state.settlements[Math.floor(Math.random() * this.state.settlements.length)];
    this.state.terrain.resources.push({
      type: types[Math.floor(Math.random() * types.length)],
      x: Math.max(0, Math.min(this.state.map_size.width - 1, s.x + Math.floor(Math.random() * 10 - 5))),
      y: Math.max(0, Math.min(this.state.map_size.height - 1, s.y + Math.floor(Math.random() * 10 - 5))),
      amount: Math.floor(Math.random() * 50) + 30
    });
  }
};

WorldEngine.prototype.evolveSettlements = function () {
  if (!this.state.settlements || this.state.settlements.length === 0) return;

  var result = this.settlementEvolver.evolveAll(
    this.state.settlements,
    this.state.terrain,
    this.state.terrain.resources,
    this.state.year
  );

  this.state.settlements = result.settlements;

  for (var i = 0; i < result.events.length; i++) {
    var evt = result.events[i];
    this.addHistoryEvent(evt.type, evt.description);
  }

  if (result.newSettlements.length > 0) {
    for (var ni = 0; ni < result.newSettlements.length; ni++) {
      this.state.settlements.push(result.newSettlements[ni]);
    }
  }
};

WorldEngine.prototype.evolveTechnology = function () {
  if (!this.state.settlements || this.state.settlements.length === 0) return;
  var techSpeed = this.config.tech_speed || 'normal';
  var prob = techSpeed === 'fast' ? 0.08 : techSpeed === 'slow' ? 0.01 : 0.04;
  if (techSpeed === 'random') prob = Math.random() * 0.1;

  for (var i = 0; i < this.state.settlements.length; i++) {
    var s = this.state.settlements[i];
    if (Math.random() < prob && s.population > 20) {
      s.tech_level = (s.tech_level || 0) + 1;
      this.addHistoryEvent('breakthrough', s.name + ' achieved a technological advancement (Tech +1).');
    }
  }
};

WorldEngine.prototype.generateEvents = function () {
  var events = this.eventGenerator.generate(this.state.settlements, this.state.year);
  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    this.state.settlements = this.state.settlements.map(function (s) {
      if (evt.type === 'war') {
        if (s.id === evt.loser_id) {
          var updated = JSON.parse(JSON.stringify(s));;
          updated.population = Math.max(0, updated.population - evt.pop_loss);
          return updated;
        }
      }
      if (evt.type === 'disaster') {
        if (s.id === evt.settlement_id) {
          var updated = JSON.parse(JSON.stringify(s));;
          updated.population = Math.max(0, updated.population - evt.pop_loss);
          updated.tech_level = Math.max(0, (updated.tech_level || 0) - evt.tech_loss);
          return updated;
        }
      }
      if (evt.type === 'culture') {
        if (s.id === evt.settlement_id) {
          var updated = JSON.parse(JSON.stringify(s));;
          updated.population += evt.pop_bonus;
          return updated;
        }
      }
      return s;
    });
  }
  return events;
};

WorldEngine.prototype.processInterventions = function () {
  try {
    var fs = require('fs');
    var path = require('path');
    var queuePath = path.join(__dirname, '..', '..', 'data', 'interventions', 'queue.json');

    if (!fs.existsSync(queuePath)) return;

    var queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    if (!queue || queue.length === 0) return;

    var worldId = this.state.id || (this.config.name ? this.config.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : null);
    if (!worldId) return;

    var pending = queue.filter(function (i) { return i.world_id === worldId || !i.world_id; });
    if (pending.length === 0) return;

    for (var i = 0; i < pending.length; i++) {
      try {
        this.applyIntervention(pending[i]);
        this.addHistoryEvent('intervention', 'Intervention by ' + pending[i].creator + ': ' + (pending[i].type || 'unknown'));
      } catch (e) {
        console.error('Failed to apply intervention:', e.message);
      }
    }

    var remaining = queue.filter(function (i) { return i.world_id !== worldId && i.world_id; });
    fs.writeFileSync(queuePath, JSON.stringify(remaining, null, 2));
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      console.warn('processInterventions:', e.message);
    }
  }
};

WorldEngine.prototype.applyIntervention = function (intervention) {
  var type = intervention.type;
  var target = intervention.target;

  switch (type) {
    case 'bless':
      if (target && this.state.settlements) {
        for (var i = 0; i < this.state.settlements.length; i++) {
          if (this.state.settlements[i].id === target || this.state.settlements[i].name === target) {
            this.state.settlements[i].population = Math.floor(this.state.settlements[i].population * 1.3);
            break;
          }
        }
      } else if (this.state.settlements && this.state.settlements.length > 0) {
        var randomS = this.state.settlements[Math.floor(Math.random() * this.state.settlements.length)];
        randomS.population = Math.floor(randomS.population * 1.3);
      }
      break;

    case 'plague':
      if (target && this.state.settlements) {
        for (var j = 0; j < this.state.settlements.length; j++) {
          if (this.state.settlements[j].id === target || this.state.settlements[j].name === target) {
            this.state.settlements[j].population = Math.floor(this.state.settlements[j].population * 0.5);
            break;
          }
        }
      } else if (this.state.settlements && this.state.settlements.length > 0) {
        var allSettlements = this.state.settlements;
        for (var k = 0; k < allSettlements.length; k++) {
          allSettlements[k].population = Math.floor(allSettlements[k].population * (0.6 + Math.random() * 0.3));
        }
      }
      break;

    case 'discover':
      if (this.state.terrain && this.state.terrain.resources) {
        var newRes = {
          type: ['wood', 'ore', 'food', 'water'][Math.floor(Math.random() * 4)],
          x: Math.floor(Math.random() * this.state.map_size.width),
          y: Math.floor(Math.random() * this.state.map_size.height),
          amount: Math.floor(Math.random() * 50) + 50
        };
        this.state.terrain.resources.push(newRes);
      }
      break;

    case 'enlighten':
    case 'shelter':
      if (target && this.state.settlements) {
        for (var l = 0; l < this.state.settlements.length; l++) {
          if (this.state.settlements[l].id === target || this.state.settlements[l].name === target) {
            this.state.settlements[l].tech_level = (this.state.settlements[l].tech_level || 0) + 2;
            break;
          }
        }
      }
      break;

    case 'sow':
      if (this.state.terrain && this.state.terrain.tiles && this.state.settlements) {
        var rng = function () { return Math.random(); };
        var w = this.state.map_size.width;
        var h = this.state.map_size.height;
        for (var att = 0; att < 50; att++) {
          var sx = Math.floor(rng() * w);
          var sy = Math.floor(rng() * h);
          if (this.state.terrain.tiles[sy] && this.state.terrain.tiles[sy][sx] !== 0) {
            var occupied = false;
            for (var si = 0; si < this.state.settlements.length; si++) {
              if (this.state.settlements[si].x === sx && this.state.settlements[si].y === sy) {
                occupied = true;
                break;
              }
            }
            if (!occupied) {
              var name = 'New ' + String.fromCharCode(65 + Math.floor(rng() * 26));
              this.state.settlements.push({
                id: 'SET' + String(Date.now()).slice(-6) + String(Math.floor(rng() * 100)).padStart(2, '0'),
                name: name,
                x: sx,
                y: sy,
                population: 15 + Math.floor(rng() * 20),
                tech_level: 0,
                founded: Date.now()
              });
              break;
            }
          }
        }
      }
      break;
  }
};

WorldEngine.prototype.updateStats = function () {
  if (!this.state.stats) this.state.stats = {};
  var stats = this.state.stats;

  if (!this.state.settlements || this.state.settlements.length === 0) {
    stats.total_population = 0;
    stats.total_settlements = 0;
    stats.average_tech_level = 0;
    stats.max_tech_level = 0;
    return;
  }

  var totalPop = 0;
  var totalTech = 0;
  var maxTech = 0;

  for (var i = 0; i < this.state.settlements.length; i++) {
    var s = this.state.settlements[i];
    totalPop += s.population || 0;
    totalTech += s.tech_level || 0;
    if ((s.tech_level || 0) > maxTech) maxTech = s.tech_level || 0;
  }

  stats.total_population = totalPop;
  stats.total_settlements = this.state.settlements.length;
  stats.average_tech_level = Math.round(totalTech / this.state.settlements.length);
  stats.max_tech_level = maxTech;

  if (this.state.stats.total_wars === undefined) this.state.stats.total_wars = 0;
  if (this.state.stats.total_breakthroughs === undefined) this.state.stats.total_breakthroughs = 0;
  if (this.state.stats.likes === undefined) this.state.stats.likes = 0;
};

WorldEngine.prototype.updateEra = function () {
  var maxTech = this.state.stats ? this.state.stats.max_tech_level : 0;
  this.state.era = this.eventGenerator.getEra(maxTech || 0);
};

WorldEngine.prototype.getMaxPopulation = function (techLevel) {
  return [50, 200, 500, 1000, 3000, 8000, 20000][Math.min(techLevel || 0, 6)] || 20000;
};

WorldEngine.prototype.shouldExtinct = function (settlement) {
  return (settlement.population || 0) <= 0;
};

module.exports = WorldEngine;
