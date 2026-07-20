(function () {
    'use strict';

    function createRNG(seed) {
        let s = seed >>> 0;
        return function () {
            s |= 0;
            s = s + 0x6D2B79F5 | 0;
            var t = Math.imul(s ^ s >>> 15, 1 | s);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function createNoise2D(rng) {
        var grid = {};
        function hash(x, y) {
            var key = x + ',' + y;
            if (!grid.hasOwnProperty(key)) grid[key] = rng();
            return grid[key];
        }
        function lerp(a, b, t) { return a + (b - a) * t; }
        function smoothstep(t) { return t * t * (3 - 2 * t); }
        return function (x, y) {
            var ix = Math.floor(x), iy = Math.floor(y);
            var fx = x - ix, fy = y - iy;
            var sx = smoothstep(fx), sy = smoothstep(fy);
            return lerp(
                lerp(hash(ix, iy), hash(ix + 1, iy), sx),
                lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx),
                sy
            );
        };
    }

    function fbm(noise, x, y, octaves) {
        var v = 0, a = 1, f = 1, maxV = 0;
        for (var i = 0; i < octaves; i++) {
            v += a * noise(x * f, y * f);
            maxV += a;
            a *= 0.5;
            f *= 2;
        }
        return v / maxV;
    }

    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    }

    var SETTLEMENT_NAMES = [
        '河畔城', '铁壁堡', '风语村', '星落镇', '云隐村',
        '石崖关', '月影城', '日光原', '冰谷镇', '火羽村',
        '山脊堡', '绿野镇', '金沙城', '黑岩村', '碧水镇',
        '红叶村', '白石城', '青松镇', '黄土堡', '紫烟村',
        '晨露镇', '暮色城', '银月村', '铜墙堡', '翠风原',
        '霜降关', '雷鸣谷', '雨泽镇', '林海城', '沙丘村',
        '金矿镇', '玉带河', '青云堡', '赤焰村', '玄铁城',
        '苍梧镇', '碧波村', '紫荆关', '白露原', '黑曜堡'
    ];

    function TerrainGenerator(seed) {
        this.seed = (seed !== undefined && seed !== null) ? seed : Date.now();
    }

    function parseContinentParam(continents, rng) {
        var c = String(continents);
        var count, radiusScale;
        switch (c) {
            case '1':
                count = 1;
                radiusScale = 0.85;
                break;
            case '2-3':
                count = 2 + Math.floor(rng() * 2);
                radiusScale = 0.45;
                break;
            case '4-6':
                count = 4 + Math.floor(rng() * 3);
                radiusScale = 0.3;
                break;
            case 'archipelago':
                count = 10 + Math.floor(rng() * 10);
                radiusScale = 0.12;
                break;
            default:
                count = 2;
                radiusScale = 0.5;
        }
        return { count: count, radiusScale: radiusScale };
    }

    function generateContinentCenters(continents, width, height, rng) {
        var info = parseContinentParam(continents, rng);
        var centers = [];
        var maxDim = Math.max(width, height);
        for (var i = 0; i < info.count; i++) {
            centers.push({
                x: rng() * width,
                y: rng() * height,
                radius: maxDim * info.radiusScale * (0.5 + rng() * 0.5),
                strength: 0.4 + rng() * 0.6
            });
        }
        if (info.count === 1) {
            centers[0].x = width * (0.3 + rng() * 0.4);
            centers[0].y = height * (0.3 + rng() * 0.4);
            centers[0].radius = maxDim * 0.6;
            centers[0].strength = 1.0;
        }
        return centers;
    }

    function generateElevationMap(width, height, centers, noise) {
        var elevation = [];
        for (var y = 0; y < height; y++) {
            elevation[y] = [];
            for (var x = 0; x < width; x++) {
                var base = fbm(noise, x / width * 4, y / height * 4, 4);
                var maxInfluence = 0;
                for (var ci = 0; ci < centers.length; ci++) {
                    var c = centers[ci];
                    var dist = distance(x, y, c.x, c.y);
                    if (dist < c.radius) {
                        var inf = 1 - dist / c.radius;
                        maxInfluence = Math.max(maxInfluence, inf * c.strength);
                    }
                }
                var combined = base * 0.35 + maxInfluence * 0.65;
                elevation[y][x] = Math.max(0, Math.min(1, combined));
            }
        }
        return elevation;
    }

    function classifyTiles(elevation, threshold) {
        var height = elevation.length;
        var width = elevation[0].length;
        var tiles = [];
        for (var y = 0; y < height; y++) {
            tiles[y] = [];
            for (var x = 0; x < width; x++) {
                var e = elevation[y][x];
                if (e < threshold) {
                    tiles[y][x] = 0;
                } else {
                    var range = 1 - threshold;
                    var relative = range > 0.001 ? (e - threshold) / range : 0;
                    if (relative > 0.75) {
                        tiles[y][x] = 3;
                    } else if (relative > 0.4) {
                        tiles[y][x] = 2;
                    } else {
                        tiles[y][x] = 1;
                    }
                }
            }
        }
        return tiles;
    }

    function placeRivers(tiles, elevation, threshold, rng) {
        var height = tiles.length;
        var width = tiles[0].length;
        var riverCount = 2 + Math.floor(rng() * 3);
        for (var r = 0; r < riverCount; r++) {
            var sx, sy, attempts = 0;
            do {
                sx = Math.floor(rng() * width);
                sy = Math.floor(rng() * height);
                attempts++;
            } while ((tiles[sy][sx] < 2 || tiles[sy][sx] > 3) && attempts < 50);
            if (attempts >= 50) continue;
            var cx = sx, cy = sy;
            var path = [];
            var steps = 0;
            var maxSteps = (width + height) * 2;
            var seen = {};
            while (steps < maxSteps) {
                var key = cx + ',' + cy;
                if (seen[key]) break;
                seen[key] = true;
                if (cy < 0 || cy >= height || cx < 0 || cx >= width) break;
                if (tiles[cy][cx] === 0) break;
                if (tiles[cy][cx] !== 4) {
                    path.push({ x: cx, y: cy });
                }
                var lowestE = elevation[cy][cx];
                var nx = cx, ny = cy;
                var foundOcean = false;
                for (var dy = -1; dy <= 1; dy++) {
                    for (var dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        var px = cx + dx, py = cy + dy;
                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            if (tiles[py][px] === 0) {
                                nx = px; ny = py; foundOcean = true;
                                break;
                            }
                            if (elevation[py][px] < lowestE) {
                                lowestE = elevation[py][px];
                                nx = px; ny = py;
                            }
                        }
                    }
                    if (foundOcean) break;
                }
                if (nx === cx && ny === cy) break;
                cx = nx; cy = ny;
                steps++;
                if (foundOcean) break;
            }
            for (var pi = 0; pi < path.length; pi++) {
                var p = path[pi];
                if (p.y >= 0 && p.y < height && p.x >= 0 && p.x < width) {
                    if (tiles[p.y][p.x] > 0) {
                        tiles[p.y][p.x] = 4;
                    }
                }
            }
        }
    }

    TerrainGenerator.prototype.generate = function (width, height, continents, oceanRatio) {
        width = Math.max(20, Math.min(80, Math.floor(width)));
        height = Math.max(20, Math.min(80, Math.floor(height)));
        oceanRatio = Math.max(10, Math.min(90, Number(oceanRatio) || 50));
        var rng = createRNG(this.seed);
        var noise = createNoise2D(rng);
        var centers = generateContinentCenters(continents, width, height, rng);
        var elevation = generateElevationMap(width, height, centers, noise);
        var allVals = [];
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                allVals.push(elevation[y][x]);
            }
        }
        allVals.sort(function (a, b) { return a - b; });
        var oceanIdx = Math.floor(allVals.length * (oceanRatio / 100));
        var threshold = allVals[Math.max(0, Math.min(allVals.length - 1, oceanIdx))];
        var tiles = classifyTiles(elevation, threshold);
        placeRivers(tiles, elevation, threshold, rng);
        return tiles;
    };

    TerrainGenerator.prototype.generateResources = function (tiles, abundance, initialLife) {
        if (!tiles || !tiles.length || !tiles[0]) return [];
        var height = tiles.length;
        var width = tiles[0].length;
        var rng = createRNG(this.seed + 1);
        var densityMap = { scarce: 0.5, normal: 1.0, abundant: 2.0, random: 0.5 + rng() * 2.0 };
        var lifeMap = { sparse: 0.6, normal: 1.0, abundant: 1.5 };
        var densityMul = densityMap[abundance] !== undefined ? densityMap[abundance] : 1.0;
        var lifeMul = lifeMap[initialLife] !== undefined ? lifeMap[initialLife] : 1.0;
        var multiplier = densityMul * lifeMul;
        var baseCount = Math.floor(width * height * 0.02 * multiplier);
        var resources = [];
        var attempts = 0;
        var maxAttempts = baseCount * 5;
        while (resources.length < baseCount && attempts < maxAttempts) {
            attempts++;
            var x = Math.floor(rng() * width);
            var y = Math.floor(rng() * height);
            var tile = tiles[y][x];
            if (tile === 0) continue;
            var duplicate = false;
            for (var ri = 0; ri < resources.length; ri++) {
                if (resources[ri].x === x && resources[ri].y === y) {
                    duplicate = true;
                    break;
                }
            }
            if (duplicate) continue;
            var type, amount;
            var roll = rng();
            if (tile === 3) {
                type = 'ore';
                amount = 30 + Math.floor(rng() * 71);
            } else if (tile === 2) {
                type = roll < 0.6 ? 'wood' : 'food';
                amount = 30 + Math.floor(rng() * 71);
            } else if (tile === 4) {
                type = roll < 0.5 ? 'water' : 'food';
                amount = 20 + Math.floor(rng() * 61);
            } else {
                type = roll < 0.4 ? 'food' : (roll < 0.7 ? 'wood' : 'water');
                amount = 20 + Math.floor(rng() * 81);
            }
            resources.push({ type: type, x: x, y: y, amount: amount });
        }
        return resources;
    };

    function generateSettlementName(existingNames, rng) {
        var available = [];
        for (var i = 0; i < SETTLEMENT_NAMES.length; i++) {
            var taken = false;
            for (var j = 0; j < existingNames.length; j++) {
                if (existingNames[j] === SETTLEMENT_NAMES[i]) { taken = true; break; }
            }
            if (!taken) available.push(SETTLEMENT_NAMES[i]);
        }
        if (available.length === 0) {
            return '聚落' + Math.floor(rng() * 10000);
        }
        return available[Math.floor(rng() * available.length)];
    }

    TerrainGenerator.prototype.placeSettlements = function (tiles, resources, count) {
        if (!tiles || !tiles.length || !tiles[0]) return [];
        var height = tiles.length;
        var width = tiles[0].length;
        var rng = createRNG(this.seed + 2);
        count = Math.max(1, Math.min(count || 5, 30));
        var settlements = [];
        var usedPositions = {};
        var names = [];

        if (!resources || resources.length === 0) {
            for (var i = 0; i < count; i++) {
                var found = false;
                for (var att = 0; att < 100; att++) {
                    var x = Math.floor(rng() * width);
                    var y = Math.floor(rng() * height);
                    var key = x + ',' + y;
                    if (tiles[y][x] !== 0 && !usedPositions[key]) {
                        var name = generateSettlementName(names, rng);
                        names.push(name);
                        usedPositions[key] = true;
                        settlements.push({
                            id: 'SET' + String(settlements.length + 1).padStart(3, '0'),
                            name: name,
                            x: x,
                            y: y,
                            population: 10 + Math.floor(rng() * 41),
                            tech_level: 0
                        });
                        found = true;
                        break;
                    }
                }
                if (!found) break;
            }
            return settlements;
        }

        var sortedResources = resources.slice().sort(function (a, b) { return b.amount - a.amount; });
        for (var ri2 = 0; ri2 < sortedResources.length && settlements.length < count; ri2++) {
            var res = sortedResources[ri2];
            var placed = false;
            for (var radius = 1; radius <= 6; radius++) {
                for (var dy = -radius; dy <= radius && !placed; dy++) {
                    for (var dx = -radius; dx <= radius && !placed; dx++) {
                        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                        var sx = res.x + dx, sy = res.y + dy;
                        if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
                        var key2 = sx + ',' + sy;
                        if (tiles[sy][sx] !== 0 && !usedPositions[key2]) {
                            var name2 = generateSettlementName(names, rng);
                            names.push(name2);
                            usedPositions[key2] = true;
                            settlements.push({
                                id: 'SET' + String(settlements.length + 1).padStart(3, '0'),
                                name: name2,
                                x: sx,
                                y: sy,
                                population: 10 + Math.floor(rng() * 41),
                                tech_level: 0
                            });
                            placed = true;
                        }
                    }
                }
            }
        }

        while (settlements.length < count) {
            var placed2 = false;
            for (var att2 = 0; att2 < 100; att2++) {
                var rx = Math.floor(rng() * width);
                var ry = Math.floor(rng() * height);
                var key3 = rx + ',' + ry;
                if (tiles[ry][rx] !== 0 && !usedPositions[key3]) {
                    var name3 = generateSettlementName(names, rng);
                    names.push(name3);
                    usedPositions[key3] = true;
                    settlements.push({
                        id: 'SET' + String(settlements.length + 1).padStart(3, '0'),
                        name: name3,
                        x: rx,
                        y: ry,
                        population: 10 + Math.floor(rng() * 41),
                        tech_level: 0
                    });
                    placed2 = true;
                    break;
                }
            }
            if (!placed2) break;
        }

        return settlements;
    };

    TerrainGenerator.prototype.setSeed = function (seed) {
        this.seed = seed;
    };

    TerrainGenerator.prototype.getSeed = function () {
        return this.seed;
    };

    globalThis.TerrainGenerator = TerrainGenerator;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TerrainGenerator;
    }

})();
