(function () {
  'use strict';

  var CIV_DATA = null;
  var LOADED = false;

  function load() {
    if (LOADED) return;
    try {
      if (typeof CIVILIZATIONS !== 'undefined') {
        CIV_DATA = CIVILIZATIONS;
        LOADED = true;
        return;
      }
    } catch(e) {}
    // Will be loaded async from data/civilizations.json
    LOADED = false;
  }

  function getEraName(eraId) {
    var map = { antiquity: '古典', exploration: '探索', modern: '现代' };
    return map[eraId] || eraId;
  }

  function getAllEras() { return ['antiquity', 'exploration', 'modern']; }

  function getCivsByEra(eraId) {
    load();
    if (!CIV_DATA || !CIV_DATA[eraId]) return [];
    return CIV_DATA[eraId];
  }

  function getCiv(eraId, civId) {
    var civs = getCivsByEra(eraId);
    for (var i = 0; i < civs.length; i++) {
      if (civs[i].id === civId) return civs[i];
    }
    return null;
  }

  function getLeader(eraId, leaderId) {
    var civs = getCivsByEra(eraId);
    for (var i = 0; i < civs.length; i++) {
      if (civs[i].leader === leaderId) return {
        id: civs[i].leader,
        name: civs[i].leader_name,
        civ: civs[i].id,
        civ_name: civs[i].name,
        ability: civs[i].ability,
        agenda: civs[i].agenda
      };
    }
    return null;
  }

  function getNextEra(eraId) {
    var eras = getAllEras();
    var idx = eras.indexOf(eraId);
    if (idx >= 0 && idx < eras.length - 1) return eras[idx + 1];
    return null;
  }

  // Calculate bonuses for a civilization on a specific stat
  function calcBonus(civData, statName) {
    if (!civData || !civData.bonuses) return 1.0;
    var bonus = civData.bonuses[statName];
    return bonus !== undefined ? bonus : 1.0;
  }

  // Apply civ bonus to a base value
  function applyBonus(baseValue, civData, statName) {
    return baseValue * calcBonus(civData, statName);
  }

  // Agenda weight for event probability
  function getAgendaWeight(civData, category) {
    if (!civData || !civData.agenda || !civData.agenda.weights) return 1.0;
    var w = civData.agenda.weights[category];
    return w !== undefined ? w : 1.0;
  }

  // Generate a description of the civilization's abilities
  function getCivSummary(civData) {
    if (!civData) return '';
    return civData.name + ' — ' + civData.ability.split('—')[0].trim() +
      ' | 特色单位: ' + civData.unique_unit.split('—')[0].trim() +
      ' | 元首: ' + civData.leader_name;
  }

  // Get available next-era civilizations (for transition)
  function getAvailableNextCivs(currentEra, currentCivId) {
    var nextEra = getNextEra(currentEra);
    if (!nextEra) return [];
    var civs = getCivsByEra(nextEra);
    return civs;
  }

  // Set civilization data (for async loading)
  function setCivData(data) {
    CIV_DATA = data;
    LOADED = true;
  }

  globalThis.CivEngine = {
    load: load,
    getEraName: getEraName,
    getAllEras: getAllEras,
    getCivsByEra: getCivsByEra,
    getCiv: getCiv,
    getLeader: getLeader,
    getNextEra: getNextEra,
    calcBonus: calcBonus,
    applyBonus: applyBonus,
    getAgendaWeight: getAgendaWeight,
    getCivSummary: getCivSummary,
    getAvailableNextCivs: getAvailableNextCivs,
    setCivData: setCivData
  };
})();
