'use strict';

var WAR_NAMES = [
  'the War of Burning Fields', 'the Conflict of Ashes', 'the Battle of the Broken Spear',
  'the Great Schism', 'the War of Three Kings', 'the Rebellion of the Lost',
  'the Siege of the Ancient Wall', 'the Crimson Campaign', 'the War of Whispers',
  'the Clash of Iron and Stone'
];

var DISASTER_NAMES = [
  'a Great Flood', 'a Devastating Wildfire', 'a Massive Earthquake',
  'a Terrible Drought', 'a Violent Storm', 'a Volcanic Eruption',
  'a Catastrophic Landslide', 'a Great Famine', 'a Pestilence of Locusts',
  'a Deadly Tsunami'
];

var BREAKTHROUGH_NAMES = [
  'developed advanced irrigation techniques',
  'discovered bronze smelting',
  'invented the wheel',
  'mastered ironworking',
  'created the steam engine',
  'harnessed electricity',
  'developed computing machines',
  'unlocked nuclear fission',
  'pioneered space flight',
  'achieved artificial intelligence'
];

var CULTURE_NAMES = [
  'a Golden Age of Art', 'the Great Library', 'the Festival of Lights',
  'the Unification Ceremony', 'the Harmonic Convergence',
  'the Grand Theater', 'the Academy of Wisdom',
  'the Monument of Ages', 'the Code of Laws', 'the Epic Poem'
];

function EventGenerator(config) {
  this.config = config;
}

EventGenerator.prototype.generate = function (settlements, year) {
  if (!settlements || settlements.length === 0) return [];

  var events = [];
  var rng = function () { return Math.random(); };
  var disasterFreq = this.config.disaster_frequency || 'medium';
  var warTendency = this.config.war_tendency || 'normal';
  var techSpeed = this.config.tech_speed || 'normal';
  var miracleChance = this.config.miracle_chance || 'medium';

  var disasterProb = disasterFreq === 'high' ? 0.15 : disasterFreq === 'low' ? 0.03 : disasterFreq === 'random' ? rng() * 0.15 : 0.07;
  var warProb = warTendency === 'aggressive' ? 0.12 : warTendency === 'peaceful' ? 0.01 : warTendency === 'random' ? rng() * 0.12 : 0.05;
  var techProb = techSpeed === 'fast' ? 0.1 : techSpeed === 'slow' ? 0.02 : techSpeed === 'random' ? rng() * 0.1 : 0.05;
  var cultureProb = 0.06;
  var miracleProb = miracleChance === 'medium' ? 0.02 : miracleChance === 'low' ? 0.005 : miracleChance === 'very_low' ? 0.001 : 0.03;

  if (rng() < warProb && settlements.length >= 2) {
    var attacker = settlements[Math.floor(rng() * settlements.length)];
    var defender = settlements[Math.floor(rng() * settlements.length)];
    if (attacker.id !== defender.id) {
      var warName = WAR_NAMES[Math.floor(rng() * WAR_NAMES.length)];
      var atkPop = attacker.population;
      var defPop = defender.population;
      var atkRoll = rng() * (atkPop + (attacker.tech_level || 0) * 10);
      var defRoll = rng() * (defPop + (defender.tech_level || 0) * 10);
      var victor = atkRoll > defRoll ? attacker : defender;
      var loser = atkRoll > defRoll ? defender : attacker;
      var popLoss = Math.floor(loser.population * (0.1 + rng() * 0.3));

      events.push({
        type: 'war',
        year: year,
        attacker_id: attacker.id,
        attacker_name: attacker.name,
        defender_id: defender.id,
        defender_name: defender.name,
        victor_id: victor.id,
        victor_name: victor.name,
        loser_id: loser.id,
        loser_name: loser.name,
        pop_loss: popLoss,
        description: warName + ' — ' + victor.name + ' defeated ' + loser.name + ', causing ' + popLoss + ' casualties.'
      });

      var loserIdx = settlements.findIndex(function (s) { return s.id === loser.id; });
      if (loserIdx !== -1) {
        settlements[loserIdx].population = Math.max(0, settlements[loserIdx].population - popLoss);
      }
    }
  }

  if (rng() < disasterProb && settlements.length > 0) {
    var target = settlements[Math.floor(rng() * settlements.length)];
    var disasterName = DISASTER_NAMES[Math.floor(rng() * DISASTER_NAMES.length)];
    var severity = 0.1 + rng() * 0.3;
    var popLoss2 = Math.floor(target.population * severity);
    var techLoss = Math.floor((target.tech_level || 0) * severity);

    events.push({
      type: 'disaster',
      year: year,
      settlement_id: target.id,
      settlement_name: target.name,
      severity: severity,
      pop_loss: popLoss2,
      tech_loss: techLoss,
      description: disasterName + ' struck ' + target.name + ', killing ' + popLoss2 + ' and setting back technology.'
    });

    var tIdx = settlements.findIndex(function (s) { return s.id === target.id; });
    if (tIdx !== -1) {
      settlements[tIdx].population = Math.max(0, settlements[tIdx].population - popLoss2);
      settlements[tIdx].tech_level = Math.max(0, (settlements[tIdx].tech_level || 0) - techLoss);
    }
  }

  if (rng() < techProb && settlements.length > 0) {
    var techTarget = settlements[Math.floor(rng() * settlements.length)];
    var breakthrough = BREAKTHROUGH_NAMES[Math.floor(rng() * BREAKTHROUGH_NAMES.length)];
    var techGain = 1 + Math.floor(rng() * 2);

    events.push({
      type: 'breakthrough',
      year: year,
      settlement_id: techTarget.id,
      settlement_name: techTarget.name,
      tech_gain: techGain,
      description: techTarget.name + ' ' + breakthrough + ' (Tech +' + techGain + ').'
    });

    var tIdx2 = settlements.findIndex(function (s) { return s.id === techTarget.id; });
    if (tIdx2 !== -1) {
      settlements[tIdx2].tech_level = (settlements[tIdx2].tech_level || 0) + techGain;
    }
  }

  if (rng() < cultureProb && settlements.length > 0) {
    var cultureTarget = settlements[Math.floor(rng() * settlements.length)];
    var cultureName = CULTURE_NAMES[Math.floor(rng() * CULTURE_NAMES.length)];
    var popBonus = Math.floor(cultureTarget.population * (0.02 + rng() * 0.05));

    events.push({
      type: 'culture',
      year: year,
      settlement_id: cultureTarget.id,
      settlement_name: cultureTarget.name,
      pop_bonus: popBonus,
      description: cultureName + ' flourished in ' + cultureTarget.name + ', attracting ' + popBonus + ' new residents.'
    });

    var tIdx3 = settlements.findIndex(function (s) { return s.id === cultureTarget.id; });
    if (tIdx3 !== -1) {
      settlements[tIdx3].population += popBonus;
    }
  }

  if (rng() < miracleProb && settlements.length > 0) {
    var miracleTarget = settlements[Math.floor(rng() * settlements.length)];
    events.push({
      type: 'miracle',
      year: year,
      settlement_id: miracleTarget.id,
      settlement_name: miracleTarget.name,
      description: 'A miraculous event occurred in ' + miracleTarget.name + ', boosting the morale and fortune of the people.'
    });
  }

  return events;
};

EventGenerator.prototype.getEra = function (maxTechLevel) {
  if (maxTechLevel >= 6) return 'info';
  if (maxTechLevel >= 5) return 'electric';
  if (maxTechLevel >= 4) return 'steam';
  if (maxTechLevel >= 3) return 'iron';
  if (maxTechLevel >= 2) return 'bronze';
  if (maxTechLevel >= 1) return 'agriculture';
  return 'primitive';
};

module.exports = EventGenerator;
