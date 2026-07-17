(function () {
    'use strict';

    var TECH_NAMES = [
        '原始时代', '农耕时代', '青铜时代',
        '铁器时代', '蒸汽时代', '电气时代', '信息时代'
    ];

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function WorldEngine(config, state) {
        this.config = config || {};
        this.state = state || this._createInitialState();
        this.history = [];
        this.pendingInterventions = [];
        this._terrainGen = new window.TerrainGenerator(Date.now());
        this._settlementEvolver = new window.SettlementEvolver();
        this._techEvolver = new window.TechEvolver();
        this._eventGen = new window.EventGenerator();
        this._initialized = false;
    }

    WorldEngine.prototype._createInitialState = function () {
        return {
            world_id: 'world_' + String(Date.now()).slice(-6),
            name: this.config.name || '未命名世界',
            creator: '',
            year: 0,
            era: '原始时代',
            map_size: { width: 60, height: 60 },
            terrain: { tiles: [], resources: [] },
            settlements: [],
            active_events: [],
            stats: {
                total_population: 0,
                total_settlements: 0,
                extinct_settlements: 0,
                total_wars: 0,
                tech_breakthroughs: 0
            },
            likes: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    };

    WorldEngine.prototype.initialize = function () {
        if (this._initialized) return this.state;

        var mapSize = this.config.map_size || 'medium';
        var width = 60, height = 60;
        if (typeof mapSize === 'object' && mapSize.width && mapSize.height) {
            width = mapSize.width;
            height = mapSize.height;
        } else if (typeof mapSize === 'string') {
            switch (mapSize) {
                case 'small': width = 30; height = 30; break;
                case 'large': width = 80; height = 80; break;
                case 'medium':
                default: width = 60; height = 60;
            }
        }

        var seed = this.config.seed || Date.now();
        this._terrainGen.setSeed(seed);
        this.state.map_size = { width: width, height: height };

        var continents = this.config.continents || '2-3';
        var oceanRatio = this.config.ocean_ratio || 50;
        if (typeof oceanRatio === 'string') oceanRatio = parseInt(oceanRatio, 10);
        if (isNaN(oceanRatio) || oceanRatio < 10) oceanRatio = 50;

        var tiles = this._terrainGen.generate(width, height, continents, oceanRatio);
        if (!tiles || !tiles.length) {
            tiles = [];
            for (var y = 0; y < height; y++) {
                tiles[y] = [];
                for (var x = 0; x < width; x++) {
                    tiles[y][x] = 1;
                }
            }
        }

        var abundance = this.config.resource_abundance || 'normal';
        var initialLife = this.config.initial_life || 'normal';
        var resources = this._terrainGen.generateResources(tiles, abundance, initialLife);
        if (!resources) resources = [];

        var settlementCount = Math.max(1, Math.floor(width * height * 0.002));
        settlementCount = clamp(settlementCount, 3, 20);
        var settlements = this._terrainGen.placeSettlements(tiles, resources, settlementCount);

        for (var i = 0; i < settlements.length; i++) {
            var s = settlements[i];
            s.resources = s.resources || { food: 20, wood: 15, ore: 5, water: 20 };
            s.resource_bonus = 0;
            s.bonus_duration = 0;
            s.disaster_risk = 0;
            s.curse_duration = 0;
            s.discovery_bonus = 0;
            s.exploration_duration = 0;
            s.tech_bonus = 0;
            s.inspiration_duration = 0;
            s.immune = false;
            s.sanctuary_duration = 0;
            s.resource_depletion_years = 0;
            s.max_population = this._techEvolver.getMaxPopulation(s.tech_level || 0);
            s.status = '繁荣';
        }

        this.state.terrain = { tiles: tiles, resources: resources };
        this.state.settlements = settlements;
        this.state.era = '原始时代';
        this.state.year = 0;
        this.updateStats();

        this._eventGen.resetCounter();

        this._initialized = true;
        this.state.updated_at = new Date().toISOString();
        return this.state;
    };

    WorldEngine.prototype.evolve = function () {
        if (!this._initialized) {
            this.initialize();
        }

        this.evolveResources();
        this.evolveSettlements();
        this.evolveTechnology();
        this.generateEvents();
        this.processInterventions();
        this.updateStats();
        this.updateEra();

        this.state.year++;
        this.state.updated_at = new Date().toISOString();
        return this.state;
    };

    WorldEngine.prototype.evolveResources = function () {
        var resources = this.state.terrain.resources;
        if (!resources) resources = [];
        var tiles = this.state.terrain.tiles;
        if (!tiles) return;

        var abundance = this.config.resource_abundance || 'normal';
        var growthRate = 2;
        switch (abundance) {
            case 'scarce': growthRate = 1; break;
            case 'abundant': growthRate = 3; break;
            case 'random': growthRate = 1 + Math.floor(Math.random() * 3); break;
            default: growthRate = 2;
        }

        for (var i = 0; i < resources.length; i++) {
            var r = resources[i];
            r.amount = Math.min(100, (r.amount || 0) + growthRate);

            if (Math.random() < 0.05) {
                var depletion = 10 + Math.floor(Math.random() * 11);
                r.amount = Math.max(0, (r.amount || 0) - depletion);
            }

            r.amount = clamp(r.amount, 0, 100);
        }

        resources = resources.filter(function (r) { return r.amount > 0; });

        if (Math.random() < 0.03) {
            var settlements = this.state.settlements;
            if (settlements && settlements.length > 0) {
                var width = this.state.map_size.width;
                var height = this.state.map_size.height;
                for (var att = 0; att < 20; att++) {
                    var targetS = settlements[Math.floor(Math.random() * settlements.length)];
                    var dx = Math.floor(Math.random() * 11) - 5;
                    var dy = Math.floor(Math.random() * 11) - 5;
                    var rx = clamp((targetS.x || 0) + dx, 0, width - 1);
                    var ry = clamp((targetS.y || 0) + dy, 0, height - 1);
                    if (tiles[ry] && tiles[ry][rx] !== 0) {
                        var dup = false;
                        for (var ri = 0; ri < resources.length; ri++) {
                            if (resources[ri].x === rx && resources[ri].y === ry) {
                                dup = true; break;
                            }
                        }
                        if (!dup) {
                            var types = ['food', 'wood', 'ore', 'water'];
                            var newType = types[Math.floor(Math.random() * types.length)];
                            resources.push({
                                type: newType,
                                x: rx,
                                y: ry,
                                amount: 20 + Math.floor(Math.random() * 61)
                            });
                            break;
                        }
                    }
                }
            }
        }

        this.state.terrain.resources = resources;
    };

    WorldEngine.prototype.evolveSettlements = function () {
        var settlements = this.state.settlements;
        if (!settlements || !settlements.length) return;

        var result = this._settlementEvolver.evolve(
            settlements,
            this.config,
            this.state.active_events,
            this.state.terrain.tiles,
            this.state.terrain.resources
        );

        var extinctIndices = [];
        for (var i = 0; i < result.results.length; i++) {
            if (result.results[i].extinct) {
                extinctIndices.push(result.results[i].index);
            }
        }

        for (var ei = extinctIndices.length - 1; ei >= 0; ei--) {
            var idx = extinctIndices[ei];
            var extinctSettlement = settlements[idx];
            this.state.stats.extinct_settlements = (this.state.stats.extinct_settlements || 0) + 1;
            this.history.push({
                year: this.state.year,
                type: 'extinction',
                settlementId: extinctSettlement.id,
                settlementName: extinctSettlement.name,
                description: extinctSettlement.name + '已经消亡。'
            });
            settlements.splice(idx, 1);
        }

        if (result.newSettlements && result.newSettlements.length > 0) {
            for (var ni = 0; ni < result.newSettlements.length; ni++) {
                var ns = result.newSettlements[ni];
                ns.id = 'SET' + String(settlements.length + 1).padStart(3, '0');
                settlements.push(ns);
                this.history.push({
                    year: this.state.year,
                    type: 'settlement_split',
                    settlementId: ns.id,
                    settlementName: ns.name,
                    description: '新聚落' + ns.name + '建立。'
                });
            }
        }

        for (var si = 0; si < settlements.length; si++) {
            var s = settlements[si];
            s.max_population = this._techEvolver.getMaxPopulation(s.tech_level || 0);

            if (s.population > s.max_population * 1.2) {
                s.population = Math.floor(s.max_population * 1.2);
            }

            if (s.sanctuary_duration > 0) {
                if (s.bonus_duration <= 0) {
                    s.resource_bonus = 1;
                    s.bonus_duration = s.sanctuary_duration;
                }
            }

            if ((s.population || 0) > s.max_population * 0.8) {
                s.status = '拥挤';
            } else if ((s.population || 0) > s.max_population * 0.5) {
                s.status = '繁荣';
            } else if ((s.population || 0) > s.max_population * 0.2) {
                s.status = '发展中';
            } else {
                s.status = '衰落';
            }
        }

        this.state.settlements = settlements;
    };

    WorldEngine.prototype.evolveTechnology = function () {
        var settlements = this.state.settlements;
        if (!settlements || !settlements.length) return;

        var techEvents = this._techEvolver.evolve(settlements, this.config);

        for (var i = 0; i < techEvents.length; i++) {
            var te = techEvents[i];
            this.state.stats.tech_breakthroughs = (this.state.stats.tech_breakthroughs || 0) + 1;
            te.year = this.state.year;
            this.history.push({
                year: this.state.year,
                type: 'tech_breakthrough',
                settlementId: te.settlementId,
                settlementName: te.settlementName,
                fromLevel: te.fromLevel,
                toLevel: te.toLevel,
                description: te.settlementName + '从' + te.fromName + '进入' + te.toName + '！'
            });
        }
    };

    WorldEngine.prototype.generateEvents = function () {
        var settlements = this.state.settlements;
        if (!settlements || !settlements.length) return;

        var existingEvents = this.state.active_events || [];
        var newEvents = this._eventGen.generate(settlements, this.config, existingEvents);

        for (var i = 0; i < newEvents.length; i++) {
            existingEvents.push(newEvents[i]);
            this.history.push({
                year: this.state.year,
                type: 'event_' + newEvents[i].type,
                eventId: newEvents[i].id,
                description: newEvents[i].description
            });

            if (newEvents[i].type === 'war') {
                this.state.stats.total_wars = (this.state.stats.total_wars || 0) + 1;
            }
        }

        var processed = this._eventGen.processActiveEvents(existingEvents, settlements);
        this.state.active_events = processed.remaining;

        for (var ei = 0; ei < processed.expired.length; ei++) {
            var expired = processed.expired[ei];
            this.history.push({
                year: this.state.year,
                type: 'event_ended',
                eventId: expired.id,
                description: expired.type === 'war' ? expired.settlementNames.join('与') + '之间的战争结束。' :
                    expired.type === 'plague' ? expired.settlementNames.join('、') + '的瘟疫平息。' :
                    expired.type === 'natural_disaster' ? '自然灾害的影响逐渐消退。' :
                    expired.type === 'cultural_boom' ? '文化繁荣时期结束。' :
                    expired.type === 'hero_birth' ? '英雄的时代落幕。' :
                    '事件结束。'
            });
        }
    };

    WorldEngine.prototype.processInterventions = function () {
        var interventions = this.pendingInterventions;
        if (!interventions || !interventions.length) return;

        for (var i = 0; i < interventions.length; i++) {
            this.applyIntervention(interventions[i]);
        }

        this.pendingInterventions = [];
    };

    WorldEngine.prototype.applyIntervention = function (intervention) {
        if (!intervention || !intervention.type) return;

        var settlements = this.state.settlements;
        var targetSettlement = null;

        if (intervention.targetSettlementId) {
            for (var i = 0; i < settlements.length; i++) {
                if (settlements[i].id === intervention.targetSettlementId) {
                    targetSettlement = settlements[i];
                    break;
                }
            }
        } else if (intervention.targetSettlementName) {
            for (var j = 0; j < settlements.length; j++) {
                if (settlements[j].name === intervention.targetSettlementName) {
                    targetSettlement = settlements[j];
                    break;
                }
            }
        }

        switch (intervention.type) {
            case 'blessing': {
                if (targetSettlement) {
                    targetSettlement.resource_bonus = (targetSettlement.resource_bonus || 0) + 1;
                    targetSettlement.bonus_duration = (targetSettlement.bonus_duration || 0) + 10;
                    this.history.push({
                        year: this.state.year,
                        type: 'intervention_blessing',
                        settlementId: targetSettlement.id,
                        settlementName: targetSettlement.name,
                        description: '神赐祝福降临' + targetSettlement.name + '，资源产出增加20%，持续10年。'
                    });
                }
                break;
            }
            case 'curse': {
                if (targetSettlement) {
                    targetSettlement.curse_duration = (targetSettlement.curse_duration || 0) + 10;
                    this.history.push({
                        year: this.state.year,
                        type: 'intervention_curse',
                        settlementId: targetSettlement.id,
                        settlementName: targetSettlement.name,
                        description: targetSettlement.name + '被诅咒，灾难概率翻倍，持续10年。'
                    });
                }
                break;
            }
            case 'exploration': {
                if (targetSettlement) {
                    targetSettlement.discovery_bonus = (targetSettlement.discovery_bonus || 0) + 2;
                    targetSettlement.exploration_duration = (targetSettlement.exploration_duration || 0) + 8;
                    this.history.push({
                        year: this.state.year,
                        type: 'intervention_exploration',
                        settlementId: targetSettlement.id,
                        settlementName: targetSettlement.name,
                        description: targetSettlement.name + '派出探险队探索未知区域，发现稀有资源概率提升。'
                    });
                }
                if (this.state.terrain && this.state.terrain.resources) {
                    var tiles = this.state.terrain.tiles;
                    var width = this.state.map_size.width;
                    var height = this.state.map_size.height;
                    for (var ea = 0; ea < 3; ea++) {
                        for (var att = 0; att < 20; att++) {
                            var rx = Math.floor(Math.random() * width);
                            var ry = Math.floor(Math.random() * height);
                            if (tiles[ry] && tiles[ry][rx] !== 0) {
                                var dup = false;
                                for (var ri = 0; ri < this.state.terrain.resources.length; ri++) {
                                    if (this.state.terrain.resources[ri].x === rx && this.state.terrain.resources[ri].y === ry) {
                                        dup = true; break;
                                    }
                                }
                                if (!dup) {
                                    var eTypes = ['food', 'wood', 'ore', 'water'];
                                    this.state.terrain.resources.push({
                                        type: eTypes[Math.floor(Math.random() * eTypes.length)],
                                        x: rx, y: ry,
                                        amount: 50 + Math.floor(Math.random() * 51)
                                    });
                                    break;
                                }
                            }
                        }
                    }
                }
                break;
            }
            case 'inspiration': {
                if (targetSettlement) {
                    targetSettlement.tech_bonus = (targetSettlement.tech_bonus || 0) + 3;
                    targetSettlement.inspiration_duration = (targetSettlement.inspiration_duration || 0) + 5;
                    this.history.push({
                        year: this.state.year,
                        type: 'intervention_inspiration',
                        settlementId: targetSettlement.id,
                        settlementName: targetSettlement.name,
                        description: targetSettlement.name + '获得灵感启迪，科技研发速度大幅提升，持续5年。'
                    });
                }
                break;
            }
            case 'sanctuary': {
                if (targetSettlement) {
                    targetSettlement.immune = true;
                    targetSettlement.sanctuary_duration = (targetSettlement.sanctuary_duration || 0) + 15;
                    this.history.push({
                        year: this.state.year,
                        type: 'intervention_sanctuary',
                        settlementId: targetSettlement.id,
                        settlementName: targetSettlement.name,
                        description: targetSettlement.name + '成为避难所，免受一切灾难，持续15年。'
                    });
                }
                break;
            }
            case 'seed_civilization': {
                var tiles2 = this.state.terrain.tiles;
                var width2 = this.state.map_size.width;
                var height2 = this.state.map_size.height;
                var placed2 = false;
                var sx = intervention.x, sy = intervention.y;

                if (sx === undefined || sy === undefined) {
                    for (var as = 0; as < 100; as++) {
                        sx = Math.floor(Math.random() * width2);
                        sy = Math.floor(Math.random() * height2);
                        if (tiles2[sy] && tiles2[sy][sx] !== 0) {
                            placed2 = true;
                            break;
                        }
                    }
                } else {
                    if (tiles2[sy] && tiles2[sy][sx] !== 0) placed2 = true;
                }

                if (placed2) {
                    var usedNames = settlements.map(function (s) { return s.name; });
                    var prefixes = ['新', '远', '边', '塞', '荒'];
                    var baseNames = ['河畔城', '铁壁堡', '风语村', '星落镇', '云隐村'];
                    var name = '新城';
                    for (var nAttempt = 0; nAttempt < 10; nAttempt++) {
                        var candidate = prefixes[Math.floor(Math.random() * prefixes.length)] +
                            baseNames[Math.floor(Math.random() * baseNames.length)];
                        if (usedNames.indexOf(candidate) === -1) {
                            name = candidate;
                            break;
                        }
                    }

                    var newSettlement = {
                        id: 'SET' + String(settlements.length + 1).padStart(3, '0'),
                        name: name,
                        x: sx,
                        y: sy,
                        population: 50,
                        tech_level: 2,
                        resources: { food: 50, wood: 30, ore: 20, water: 40 },
                        resource_bonus: 1,
                        bonus_duration: 20,
                        disaster_risk: 0,
                        curse_duration: 0,
                        discovery_bonus: 0,
                        exploration_duration: 0,
                        tech_bonus: 0,
                        inspiration_duration: 0,
                        immune: true,
                        sanctuary_duration: 10,
                        resource_depletion_years: 0,
                        max_population: this._techEvolver.getMaxPopulation(2),
                        status: '繁荣'
                    };
                    settlements.push(newSettlement);
                    this.history.push({
                        year: this.state.year,
                        type: 'intervention_seed',
                        settlementId: newSettlement.id,
                        settlementName: newSettlement.name,
                        description: '播种文明！一个新的文明在(' + sx + ',' + sy + ')诞生——' + name + '。'
                    });
                }
                break;
            }
            default:
                break;
        }
    };

    WorldEngine.prototype.updateStats = function () {
        var settlements = this.state.settlements || [];
        var totalPop = 0;
        for (var i = 0; i < settlements.length; i++) {
            totalPop += settlements[i].population || 0;
        }
        this.state.stats.total_population = totalPop;
        this.state.stats.total_settlements = settlements.length;
    };

    WorldEngine.prototype.updateEra = function () {
        var settlements = this.state.settlements || [];
        if (settlements.length === 0) {
            this.state.era = '原始时代';
            return;
        }

        var weightedSum = 0;
        var totalPop = 0;
        for (var i = 0; i < settlements.length; i++) {
            var s = settlements[i];
            var pop = s.population || 0;
            weightedSum += (s.tech_level || 0) * pop;
            totalPop += pop;
        }

        var avgTech = totalPop > 0 ? weightedSum / totalPop : 0;
        var eraLevel = Math.round(avgTech);
        eraLevel = clamp(eraLevel, 0, 6);
        this.state.era = TECH_NAMES[eraLevel] || '原始时代';
    };

    WorldEngine.prototype.getState = function () {
        return this.state;
    };

    WorldEngine.prototype.getHistory = function () {
        return this.history;
    };

    WorldEngine.prototype.getRecentHistory = function (count) {
        count = count || 20;
        return this.history.slice(-count);
    };

    WorldEngine.prototype.getPendingInterventions = function () {
        return this.pendingInterventions || [];
    };

    WorldEngine.prototype.setPendingInterventions = function (interventions) {
        this.pendingInterventions = interventions || [];
    };

    WorldEngine.prototype.addIntervention = function (intervention) {
        if (!this.pendingInterventions) this.pendingInterventions = [];
        this.pendingInterventions.push(intervention);
    };

    WorldEngine.prototype.reset = function () {
        this.state = this._createInitialState();
        this.history = [];
        this.pendingInterventions = [];
        this._initialized = false;
        this._eventGen.resetCounter();
        return this.state;
    };

    WorldEngine.prototype.getEraName = function (level) {
        level = clamp(level, 0, 6);
        return TECH_NAMES[Math.floor(level)] || TECH_NAMES[0];
    };

    if (typeof window !== 'undefined') {
        window.WorldEngine = WorldEngine;
    }
    window.WorldEngine = WorldEngine;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WorldEngine;
    }

})();
