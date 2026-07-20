(function () {
    'use strict';

    var MAX_POP_BY_TECH = [50, 200, 500, 1000, 3000, 8000, 20000];

    function SettlementEvolver() {}

    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    SettlementEvolver.prototype.calculatePopulationGrowth = function (settlement, config) {
        var maxPop = settlement.max_population || MAX_POP_BY_TECH[Math.min(settlement.tech_level || 0, 6)] || 50;
        var baseGrowth = 2;
        var resourceBonus = 0;
        if (settlement.resource_bonus && settlement.resource_bonus > 0) {
            resourceBonus = baseGrowth * 0.2;
        }
        var techBonus = (settlement.tech_level || 0) * 0.5;
        var growth = baseGrowth + resourceBonus + techBonus;
        if (config && config.climate_type) {
            var harshClimates = ['arctic', 'desert', 'tundra'];
            for (var i = 0; i < harshClimates.length; i++) {
                if (config.climate_type === harshClimates[i]) {
                    growth *= 0.5;
                    break;
                }
            }
        }
        var pop = settlement.population || 0;
        var capacity = maxPop * 0.8;
        if (pop > maxPop) {
            var overcrowding = (pop - maxPop) / maxPop;
            growth -= growth * overcrowding * 2;
        } else if (pop > capacity) {
            growth *= 0.5;
        }
        if (settlement.curse_duration && settlement.curse_duration > 0) {
            growth *= 0.5;
        }
        if (settlement.inspiration_duration && settlement.inspiration_duration > 0) {
            growth *= 1.5;
        }
        settlement.population = Math.max(1, Math.round(pop + growth));
        return { growth: Math.round(growth), newPopulation: settlement.population };
    };

    function getMaxPop(settlement) {
        return MAX_POP_BY_TECH[Math.min(settlement.tech_level || 0, 6)] || 50;
    }

    SettlementEvolver.prototype.consumeResources = function (settlement, resources) {
        if (!resources || !resources.length) return;
        var pop = settlement.population || 0;
        if (!settlement.resources) {
            settlement.resources = { food: 0, wood: 0, ore: 0, water: 0 };
        }
        var sRes = settlement.resources;
        var foodConsumed = pop * 0.1;
        var woodConsumed = pop * 0.05;
        var oreConsumed = pop * 0.02;
        var waterConsumed = pop * 0.08;

        var range = 8;
        var availableFood = 0, availableWood = 0, availableOre = 0, availableWater = 0;
        var sx = settlement.x, sy = settlement.y;
        var toRemove = [];

        for (var i = 0; i < resources.length; i++) {
            var res = resources[i];
            if (distance(sx, sy, res.x, res.y) > range) continue;
            var harvest = Math.min(res.amount, pop * 0.3);
            if (res.type === 'food') {
                availableFood += harvest;
                res.amount -= harvest;
            } else if (res.type === 'wood') {
                availableWood += harvest;
                res.amount -= harvest;
            } else if (res.type === 'ore') {
                availableOre += harvest;
                res.amount -= harvest;
            } else if (res.type === 'water') {
                availableWater += harvest;
                res.amount -= harvest;
            }
            if (res.amount <= 0) {
                toRemove.push(i);
            }
        }

        for (var ri = toRemove.length - 1; ri >= 0; ri--) {
            resources.splice(toRemove[ri], 1);
        }

        var foodShortfall = foodConsumed - availableFood;
        var waterShortfall = waterConsumed - availableWater;

        sRes.food = Math.max(0, sRes.food + availableFood - foodConsumed);
        sRes.wood = Math.max(0, sRes.wood + availableWood - woodConsumed);
        sRes.ore = Math.max(0, sRes.ore + availableOre - oreConsumed);
        sRes.water = Math.max(0, sRes.water + availableWater - waterConsumed);

        if (foodShortfall > 0 || waterShortfall > 0) {
            var deficit = Math.max(0, foodShortfall) + Math.max(0, waterShortfall);
            var popLoss = Math.min(pop - 1, Math.ceil(deficit));
            settlement.population = Math.max(1, pop - popLoss);
        }

        if (availableFood <= 0 && availableWater <= 0) {
            settlement.resource_depletion_years = (settlement.resource_depletion_years || 0) + 1;
        } else {
            settlement.resource_depletion_years = 0;
        }
    };

    SettlementEvolver.prototype.splitSettlement = function (settlement, tiles) {
        if (!tiles || !tiles.length) return null;
        var height = tiles.length, width = tiles[0].length;
        var maxPop = getMaxPop(settlement);
        if ((settlement.population || 0) < maxPop * 0.9) return null;
        if (Math.random() > 0.3) return null;

        var sx = settlement.x, sy = settlement.y;
        var bestSpot = null;
        var bestDist = 0;

        for (var radius = 3; radius <= 10; radius++) {
            for (var dy = -radius; dy <= radius; dy++) {
                for (var dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    var nx = sx + dx, ny = sy + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (tiles[ny][nx] === 0) continue;
                    var dist = distance(sx, sy, nx, ny);
                    if (dist > bestDist) {
                        bestDist = dist;
                        bestSpot = { x: nx, y: ny };
                    }
                }
            }
            if (bestSpot) break;
        }

        if (!bestSpot) return null;

        var childPop = Math.max(1, Math.floor(settlement.population * 0.3));
        settlement.population = Math.max(1, settlement.population - childPop);

        var namePrefixes = ['新', '小', '北', '南', '东', '西', '上', '下', '大'];
        var prefix = namePrefixes[Math.floor(Math.random() * namePrefixes.length)];
        if (settlement.name.length <= 2) {
            prefix = '';
        }

        return {
            id: null,
            name: prefix + settlement.name,
            x: bestSpot.x,
            y: bestSpot.y,
            population: childPop,
            tech_level: settlement.tech_level || 0,
            resources: { food: 10, wood: 10, ore: 5, water: 10 },
            resource_bonus: 0, bonus_duration: 0,
            disaster_risk: 0, curse_duration: 0,
            discovery_bonus: 0, exploration_duration: 0,
            tech_bonus: 0, inspiration_duration: 0,
            immune: false, sanctuary_duration: 0,
            resource_depletion_years: 0,
            max_population: getMaxPop(settlement)
        };
    };

    SettlementEvolver.prototype.shouldExtinct = function (settlement) {
        if (!settlement) return true;
        if ((settlement.population || 0) <= 0) return true;
        if ((settlement.resource_depletion_years || 0) >= 3) return true;
        return false;
    };

    SettlementEvolver.prototype.evolve = function (settlements, config, events, terrain, resources) {
        if (!settlements || !settlements.length) return [];
        var results = [];
        var toAdd = [];

        for (var i = 0; i < settlements.length; i++) {
            var s = settlements[i];
            s.max_population = getMaxPop(s);

            this.calculatePopulationGrowth(s, config);
            this.consumeResources(s, resources);

            var extinct = this.shouldExtinct(s);
            var splitResult = null;
            if (!extinct) {
                splitResult = this.splitSettlement(s, terrain);
            }

            results.push({
                index: i,
                settlement: s,
                extinct: extinct,
                split: !!splitResult
            });

            if (splitResult) {
                toAdd.push(splitResult);
            }

            if (s.bonus_duration !== undefined && s.bonus_duration > 0) s.bonus_duration--;
            if (s.curse_duration !== undefined && s.curse_duration > 0) s.curse_duration--;
            if (s.exploration_duration !== undefined && s.exploration_duration > 0) s.exploration_duration--;
            if (s.inspiration_duration !== undefined && s.inspiration_duration > 0) s.inspiration_duration--;
            if (s.sanctuary_duration !== undefined && s.sanctuary_duration > 0) s.sanctuary_duration--;
        }

        return { results: results, newSettlements: toAdd };
    };

    globalThis.SettlementEvolver = SettlementEvolver;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SettlementEvolver;
    }

})();
