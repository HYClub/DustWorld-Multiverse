(function () {
    'use strict';

    var TECH_NAMES = [
        '原始时代', '农耕时代', '青铜时代',
        '铁器时代', '蒸汽时代', '电气时代', '信息时代'
    ];

    var MAX_POP_BY_TECH = [50, 200, 500, 1000, 3000, 8000, 20000];

    function TechEvolver() {}

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    TechEvolver.prototype.getTechName = function (level) {
        level = Math.max(0, Math.min(level, 6));
        return TECH_NAMES[Math.floor(level)] || TECH_NAMES[0];
    };

    TechEvolver.prototype.getMaxPopulation = function (level) {
        level = Math.max(0, Math.min(level, 6));
        return MAX_POP_BY_TECH[Math.floor(level)] || MAX_POP_BY_TECH[0];
    };

    TechEvolver.prototype.evolve = function (settlements, config) {
        if (!settlements || !settlements.length) return [];

        var techSpeed = 1.0;
        if (config && config.tech_speed) {
            switch (config.tech_speed) {
                case 'slow': techSpeed = 0.5; break;
                case 'fast': techSpeed = 1.5; break;
                case 'random': techSpeed = 0.5 + Math.random() * 1.0; break;
                default: techSpeed = 1.0;
            }
        }

        var events = [];

        for (var i = 0; i < settlements.length; i++) {
            var s = settlements[i];
            var currentLevel = s.tech_level || 0;

            if (currentLevel >= 6) continue;

            var baseChance = 0.05;
            var resourceRichness = 1.0;
            if (s.resources) {
                var totalRes = (s.resources.food || 0) + (s.resources.wood || 0) +
                    (s.resources.ore || 0) + (s.resources.water || 0);
                resourceRichness = 1.0 + totalRes / 200;
            }
            if (s.discovery_bonus && s.discovery_bonus > 0) {
                resourceRichness += s.discovery_bonus * 0.1;
            }

            var popBonus = Math.log10(Math.max(1, s.population || 1)) * 0.02;

            var neighborBonus = 0;
            for (var j = 0; j < settlements.length; j++) {
                if (i === j) continue;
                var other = settlements[j];
                if ((other.tech_level || 0) > currentLevel) {
                    var dist = Math.sqrt(
                        Math.pow((s.x || 0) - (other.x || 0), 2) +
                        Math.pow((s.y || 0) - (other.y || 0), 2)
                    );
                    if (dist < 15) {
                        neighborBonus += 0.01;
                    }
                }
            }

            if (s.tech_bonus && s.tech_bonus > 0) {
                neighborBonus += s.tech_bonus * 0.02;
            }

            var chance = baseChance * (1 + resourceRichness * 0.1) * (1 + popBonus) * (1 + neighborBonus) * techSpeed;

            chance = clamp(chance, 0, 1);

            if (Math.random() < chance) {
                s.tech_level = currentLevel + 1;

                s.max_population = this.getMaxPopulation(s.tech_level);

                events.push({
                    type: 'tech_breakthrough',
                    settlementId: s.id,
                    settlementName: s.name,
                    fromLevel: currentLevel,
                    toLevel: currentLevel + 1,
                    fromName: this.getTechName(currentLevel),
                    toName: this.getTechName(currentLevel + 1),
                    year: null
                });
            }
        }

        return events;
    };

    if (typeof window !== 'undefined') {
        globalThis.TechEvolver = TechEvolver;
    }
    globalThis.TechEvolver = TechEvolver;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TechEvolver;
    }

})();
