'use strict';

var SETTLEMENT_NAMES = [
  'Riverside', 'Ironwall', 'Windvale', 'Starfall', 'Cloudhaze',
  'Stonegate', 'Moonhold', 'Sunfield', 'Icevale', 'Fireplume',
  'Ridgefort', 'Greenfield', 'Goldsend', 'Blackrock', 'Azureford',
  'Redleaf', 'Whitestone', 'Pinetown', 'Yellowfort', 'Purplesmoke',
  'Dewdale', 'Duskmere', 'Silvertarn', 'Copperkeep', 'Emeraldwind',
  'Frostpass', 'Thunderglen', 'Raintown', 'Forestheart', 'Dunehollow'
];

var MAX_POP_BY_LEVEL = [50, 200, 500, 1000, 3000, 8000, 20000];

function SettlementEvolver(config) {
  this.config = config;
}

SettlementEvolver.prototype.evolveAll = function (settlements, terrain, resources, year) {
  if (!settlements || settlements.length === 0) return { settlements: [], newSettlements: [], extinctIds: [], events: [] };

  var results = [];
  var newSettlements = [];
  var extinctIds = [];
  var events = [];

  for (var i = 0; i < settlements.length; i++) {
    var s = settlements[i];
    var result = this.evolveOne(s, terrain, resources);
    if (result.extinct) {
      extinctIds.push(s.id);
      events.push({ type: 'extinction', settlement_id: s.id, settlement_name: s.name, year: year, description: s.name + ' has collapsed and been abandoned.' });
    } else {
      result.settlement.last_evolved = year;
      results.push(result.settlement);
    }
    if (result.newSettlement) {
      newSettlements.push(result.newSettlement);
      events.push({ type: 'founded', settlement_id: result.newSettlement.id, settlement_name: result.newSettlement.name, year: year, description: result.newSettlement.name + ' has been founded by settlers from ' + s.name + '.' });
    }
  }

  for (var ni = 0; ni < newSettlements.length; ni++) {
    results.push(newSettlements[ni]);
  }

  return { settlements: results, newSettlements: newSettlements, extinctIds: extinctIds, events: events };
};

SettlementEvolver.prototype.evolveOne = function (settlement, terrain, resources) {
  var s = JSON.parse(JSON.stringify(settlement));
  var result = { settlement: s, extinct: false, newSettlement: null };

  var maxPop = MAX_POP_BY_LEVEL[Math.min(s.tech_level || 0, 6)] || 20000;
  var growth = this.calculateGrowth(s, maxPop);

  s.population = Math.max(0, s.population + growth);

  if (this.config.climate_type === 'harsh' && Math.random() < 0.1) {
    var loss = Math.floor(s.population * (0.02 + Math.random() * 0.05));
    s.population = Math.max(0, s.population - loss);
  }

  if (s.population <= 0) {
    return { settlement: s, extinct: true, newSettlement: null };
  }

  if (s.population > maxPop * 0.9 && s.population >= 30) {
    result.newSettlement = this.createChild(s, terrain);
  }

  return result;
};

SettlementEvolver.prototype.calculateGrowth = function (settlement, maxPop) {
  var base = 2;
  var abundance = this.config.resource_abundance || 'normal';
  var resourceBonus = abundance === 'abundant' ? 0.2 : abundance === 'scarce' ? -0.2 : 0;
  var techBonus = (settlement.tech_level || 0) * 0.5;
  var crowding = settlement.population / maxPop;
  var growth = base * (1 + resourceBonus + techBonus);

  if (this.config.climate_type === 'harsh') growth *= 0.5;
  if (crowding > 0.8) growth *= 0.5;
  if (crowding >= 1) growth = -Math.abs(growth * crowding);

  var result = Math.round(growth);
  return Math.max(-settlement.population + 1, result);
};

SettlementEvolver.prototype.createChild = function (parentSettlement, terrain) {
  var tiles = terrain.tiles;
  var height = tiles.length;
  var width = tiles[0].length;

  var rng = function () { return Math.random(); };

  for (var radius = 2; radius <= 8; radius++) {
    for (var attempt = 0; attempt < 20; attempt++) {
      var angle = rng() * Math.PI * 2;
      var dist = radius + rng() * 2;
      var nx = Math.round(parentSettlement.x + Math.cos(angle) * dist);
      var ny = Math.round(parentSettlement.y + Math.sin(angle) * dist);
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && tiles[ny][nx] !== 0) {
        var name = this.generateName();
        var id = 'SET' + String(Date.now()).slice(-6) + String(Math.floor(rng() * 100)).padStart(2, '0');
        return {
          id: id,
          name: name,
          x: nx,
          y: ny,
          population: Math.max(5, Math.floor(parentSettlement.population * 0.15 * (0.5 + rng() * 0.5))),
          tech_level: parentSettlement.tech_level || 0,
          founded: Date.now(),
          parent: parentSettlement.id
        };
      }
    }
  }
  return null;
};

SettlementEvolver.prototype.generateName = function () {
  var rng = function () { return Math.random(); };
  var availableNames = SETTLEMENT_NAMES.slice();
  var name = availableNames[Math.floor(rng() * availableNames.length)];
  return name;
};

SettlementEvolver.prototype.getMaxPopulation = function (techLevel) {
  return MAX_POP_BY_LEVEL[Math.min(techLevel || 0, 6)] || 20000;
};

SettlementEvolver.prototype.shouldExtinct = function (settlement) {
  return settlement.population <= 0;
};

module.exports = SettlementEvolver;
