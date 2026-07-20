(function () {
    'use strict';

    var EVENT_COUNTER = 0;

    function EventGenerator() {}

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    }

    function adjacentSettlements(settlements, s) {
        var result = [];
        for (var i = 0; i < settlements.length; i++) {
            if (settlements[i].id === s.id) continue;
            if (distance(s.x, s.y, settlements[i].x, settlements[i].y) < 15) {
                result.push(settlements[i]);
            }
        }
        return result;
    }

    function populationDensity(settlements) {
        var total = 0;
        for (var i = 0; i < settlements.length; i++) {
            total += settlements[i].population || 0;
        }
        return total / Math.max(1, settlements.length);
    }

    function randomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function pickRandom(arr, count) {
        var copy = arr.slice();
        var result = [];
        count = Math.min(count, copy.length);
        for (var i = 0; i < count; i++) {
            var idx = Math.floor(Math.random() * copy.length);
            result.push(copy[idx]);
            copy.splice(idx, 1);
        }
        return result;
    }

    EventGenerator.prototype.selectEventType = function (config, settlements, existingEvents) {
        var weights = {};
        var disasterFreq = 5;
        if (config && config.disaster_frequency) {
            switch (config.disaster_frequency) {
                case 'low': disasterFreq = 3; break;
                case 'high': disasterFreq = 10; break;
                default: disasterFreq = 5;
            }
        }
        var warTend = 5;
        if (config && config.war_tendency) {
            switch (config.war_tendency) {
                case 'low': warTend = 2; break;
                case 'high': warTend = 10; break;
                default: warTend = 5;
            }
        }
        var miracleChance = 1;
        if (config && config.miracle_chance) {
            switch (config.miracle_chance) {
                case 'none': miracleChance = 0; break;
                case 'low': miracleChance = 1; break;
                case 'normal': miracleChance = 3; break;
                case 'high': miracleChance = 8; break;
                default: miracleChance = 1;
            }
        }

        weights.natural_disaster = disasterFreq * 10;

        var avgDensity = populationDensity(settlements);
        weights.plague = avgDensity > 100 ? 5 : 2;

        var neighborCount = 0;
        for (var i = 0; i < settlements.length; i++) {
            neighborCount += adjacentSettlements(settlements, settlements[i]).length;
        }
        weights.war = neighborCount > 0 ? warTend * 10 : 0;

        weights.cultural_boom = 3;
        weights.hero_birth = miracleChance * 20;

        var totalWeight = 0;
        for (var key in weights) {
            if (weights.hasOwnProperty(key)) {
                totalWeight += weights[key];
            }
        }

        if (totalWeight <= 0) return 'cultural_boom';

        var roll = Math.random() * totalWeight;
        var cumulative = 0;
        for (var type in weights) {
            if (weights.hasOwnProperty(type)) {
                cumulative += weights[type];
                if (roll < cumulative) return type;
            }
        }

        return 'cultural_boom';
    };

    EventGenerator.prototype.createEvent = function (type, settlements, config) {
        if (!settlements || !settlements.length) return null;

        EVENT_COUNTER++;
        var id = 'EVT' + String(EVENT_COUNTER).padStart(3, '0');

        switch (type) {
            case 'natural_disaster': {
                var count = 1 + Math.floor(Math.random() * 3);
                var targets = pickRandom(settlements, count);
                var duration = 1 + Math.floor(Math.random() * 3);
                var names = ['洪水', '地震', '火山爆发', '飓风', '干旱', '森林大火', '暴风雪', '海啸'];
                var name = randomItem(names);
                var desc = name + '袭击了';
                for (var ti = 0; ti < targets.length; ti++) {
                    if (ti > 0) desc += '、';
                    desc += targets[ti].name;
                }
                desc += '，造成严重破坏。';
                return {
                    id: id,
                    type: 'natural_disaster',
                    participants: targets.map(function (t) { return t.id; }),
                    settlementNames: targets.map(function (t) { return t.name; }),
                    remaining_years: duration,
                    duration: duration,
                    description: desc,
                    disasterName: name
                };
            }

            case 'plague': {
                var sorted = settlements.slice().sort(function (a, b) {
                    return (b.population || 0) - (a.population || 0);
                });
                var origin = sorted[0];
                var spreadCount = 1 + Math.floor(Math.random() * 3);
                var infected = [origin];
                var frontier = adjacentSettlements(settlements, origin);
                while (infected.length <= spreadCount && frontier.length > 0) {
                    var next = randomItem(frontier);
                    if (infected.indexOf(next) === -1) {
                        infected.push(next);
                    }
                    var moreNeighbors = adjacentSettlements(settlements, next);
                    for (var ni = 0; ni < moreNeighbors.length; ni++) {
                        if (infected.indexOf(moreNeighbors[ni]) === -1 && frontier.indexOf(moreNeighbors[ni]) === -1) {
                            frontier.push(moreNeighbors[ni]);
                        }
                    }
                    frontier.splice(frontier.indexOf(next), 1);
                }
                var duration2 = 3 + Math.floor(Math.random() * 8);
                var desc2 = origin.name + '爆发瘟疫，迅速蔓延至周边聚落。';
                return {
                    id: id,
                    type: 'plague',
                    participants: infected.map(function (t) { return t.id; }),
                    settlementNames: infected.map(function (t) { return t.name; }),
                    remaining_years: duration2,
                    duration: duration2,
                    description: desc2
                };
            }

            case 'war': {
                var candidates = [];
                for (var wi = 0; wi < settlements.length; wi++) {
                    var neighbors = adjacentSettlements(settlements, settlements[wi]);
                    if (neighbors.length > 0) {
                        candidates.push(settlements[wi]);
                    }
                }
                if (candidates.length < 2) {
                    var safe = settlements.slice();
                    if (safe.length >= 2) {
                        candidates = pickRandom(safe, 2);
                    } else {
                        return null;
                    }
                }
                var warParties = pickRandom(candidates, 2 + Math.floor(Math.random() * 2));
                var warDuration = 5 + Math.floor(Math.random() * 16);
                var desc3 = '';
                for (var pi = 0; pi < warParties.length; pi++) {
                    if (pi > 0) desc3 += '与';
                    desc3 += warParties[pi].name;
                }
                desc3 += '之间爆发战争，争夺资源与领土。';
                return {
                    id: id,
                    type: 'war',
                    participants: warParties.map(function (t) { return t.id; }),
                    settlementNames: warParties.map(function (t) { return t.name; }),
                    remaining_years: warDuration,
                    duration: warDuration,
                    description: desc3
                };
            }

            case 'cultural_boom': {
                var peaceful = null;
                for (var ci = 0; ci < settlements.length; ci++) {
                    var adj = adjacentSettlements(settlements, settlements[ci]);
                    if (adj.length <= 1 && (settlements[ci].population || 0) > 30) {
                        peaceful = settlements[ci];
                        break;
                    }
                }
                if (!peaceful) {
                    peaceful = settlements[Math.floor(Math.random() * settlements.length)];
                }
                var duration3 = 10 + Math.floor(Math.random() * 21);
                return {
                    id: id,
                    type: 'cultural_boom',
                    participants: [peaceful.id],
                    settlementNames: [peaceful.name],
                    remaining_years: duration3,
                    duration: duration3,
                    description: peaceful.name + '迎来文化繁荣，艺术与科技蓬勃发展。'
                };
            }

            case 'hero_birth': {
                var target = settlements[Math.floor(Math.random() * settlements.length)];
                var duration4 = 30 + Math.floor(Math.random() * 21);
                return {
                    id: id,
                    type: 'hero_birth',
                    participants: [target.id],
                    settlementNames: [target.name],
                    remaining_years: duration4,
                    duration: duration4,
                    description: target.name + '诞生了一位伟大的英雄，带领人民走向辉煌！'
                };
            }

            default:
                return null;
        }
    };

    EventGenerator.prototype.generate = function (settlements, config, existingEvents) {
        if (!settlements || !settlements.length) return [];

        var eventCount = Math.floor(Math.random() * 3);
        var newEvents = [];

        for (var i = 0; i < eventCount; i++) {
            var type = this.selectEventType(config, settlements, existingEvents);
            var evt = this.createEvent(type, settlements, config);
            if (evt) {
                newEvents.push(evt);
            }
        }

        return newEvents;
    };

    EventGenerator.prototype.processActiveEvents = function (events, settlements) {
        if (!events || !events.length) return { remaining: [], effects: [], expired: [] };

        var remaining = [];
        var expired = [];
        var effects = [];

        var settlementMap = {};
        for (var i = 0; i < settlements.length; i++) {
            settlementMap[settlements[i].id] = settlements[i];
        }

        for (var ei = 0; ei < events.length; ei++) {
            var evt = events[ei];
            evt.remaining_years = Math.max(0, (evt.remaining_years || 1) - 1);

            if (evt.remaining_years <= 0) {
                expired.push(evt);
                continue;
            }

            for (var pi = 0; pi < evt.participants.length; pi++) {
                var s = settlementMap[evt.participants[pi]];
                if (!s) continue;

                var effect = { eventId: evt.id, settlementId: s.id, type: evt.type };

                switch (evt.type) {
                    case 'natural_disaster': {
                        if (Math.random() < 0.5) {
                            var killPct = 0.05 + Math.random() * 0.10;
                            var popLoss = Math.max(0, Math.floor((s.population || 0) * killPct));
                            s.population = Math.max(1, (s.population || 0) - popLoss);
                            effect.populationLoss = popLoss;
                            effect.description = '自然灾害造成' + popLoss + '人死亡';
                        }
                        break;
                    }
                    case 'plague': {
                        var plagueKillPct = 0.10 + Math.random() * 0.20;
                        var plagueLoss = Math.max(0, Math.floor((s.population || 0) * plagueKillPct));
                        s.population = Math.max(1, (s.population || 0) - plagueLoss);
                        effect.populationLoss = plagueLoss;
                        effect.description = '瘟疫造成' + plagueLoss + '人死亡';

                        if (s.population > 0 && Math.random() < 0.3) {
                            s.population = Math.max(1, Math.floor(s.population * 0.8));
                            effect.populationLoss += Math.floor(s.population * 0.2);
                        }
                        break;
                    }
                    case 'war': {
                        var warKillPct = 0.03 + Math.random() * 0.05;
                        var warLoss = Math.max(0, Math.floor((s.population || 0) * warKillPct));
                        s.population = Math.max(1, (s.population || 0) - warLoss);
                        effect.populationLoss = warLoss;
                        effect.description = '战争造成' + warLoss + '人死亡';
                        break;
                    }
                    case 'cultural_boom': {
                        var growthBoost = 1.2 + Math.random() * 0.3;
                        if (s.population) {
                            var boostAmount = Math.max(1, Math.floor(s.population * (growthBoost - 1)));
                            s.population = Math.min(
                                (s.max_population || 1000),
                                s.population + boostAmount
                            );
                            effect.populationGain = boostAmount;
                            effect.description = '文化繁荣带来' + boostAmount + '人口增长';
                        }
                        break;
                    }
                    case 'hero_birth': {
                        if (s.tech_level !== undefined && s.tech_level < 6) {
                            s.tech_bonus = (s.tech_bonus || 0) + 2;
                            effect.techBonus = 2;
                            effect.description = '英雄诞生，科技研究加速';
                        }
                        if (s.population) {
                            var heroGrowth = Math.max(1, Math.floor(s.population * 0.05));
                            s.population += heroGrowth;
                            effect.populationGain = heroGrowth;
                        }
                        break;
                    }
                }

                effects.push(effect);
            }

            remaining.push(evt);
        }

        return { remaining: remaining, effects: effects, expired: expired };
    };

    EventGenerator.prototype.resetCounter = function () {
        EVENT_COUNTER = 0;
    };

    EventGenerator.prototype.setCounter = function (val) {
        EVENT_COUNTER = val || 0;
    };

    globalThis.EventGenerator = EventGenerator;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EventGenerator;
    }

})();
