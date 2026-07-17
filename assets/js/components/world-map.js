(function () {
  'use strict';

  var COLORS = {
    0: '#1a1a3e',
    1: '#2d5a27',
    2: '#1a3d1a',
    3: '#5c5c5c',
    4: '#4a90d9',
    settlement_small: '#ffd700',
    settlement_medium: '#ff8c00',
    settlement_large: '#ff4444',
    resource_wood: '#8b4513',
    resource_ore: '#808080',
    resource_food: '#32cd32',
    resource_water: '#4a90d9',
    resource_coal: '#3a3a3a',
    war_zone: '#ff0000'
  };

  function interpolateColor(color1, color2, factor) {
    var r1 = parseInt(color1.slice(1, 3), 16);
    var g1 = parseInt(color1.slice(3, 5), 16);
    var b1 = parseInt(color1.slice(5, 7), 16);
    var r2 = parseInt(color2.slice(1, 3), 16);
    var g2 = parseInt(color2.slice(3, 5), 16);
    var b2 = parseInt(color2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * factor);
    var g = Math.round(g1 + (g2 - g1) * factor);
    var b = Math.round(b1 + (b2 - b1) * factor);
    return '#' + [r, g, b].map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join('');
  }

  var WorldMapRenderer = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileSize = 8;
    this.animationFrame = null;
    this.startTime = Date.now();
    this._pulseCenters = [];
    this.colors = COLORS;
    this._destroyed = false;
  };

  WorldMapRenderer.prototype.render = function (state) {
    if (this._destroyed || !this.canvas || !state) return;

    this.state = state;
    var tiles = state.tiles || [];
    var mapSize = state.mapSize || tiles.length || 40;
    var size = tiles.length > 0 ? tiles.length : mapSize;

    var canvas = this.canvas;
    var dpr = window.devicePixelRatio || 1;
    var displayWidth = canvas.parentElement ? canvas.parentElement.clientWidth : canvas.width;
    var displayHeight = canvas.parentElement ? canvas.parentElement.clientHeight : canvas.width * 0.5625;

    this.tileSize = Math.max(4, Math.floor(Math.min(displayWidth, displayHeight) / size));

    canvas.width = size * this.tileSize * dpr;
    canvas.height = size * this.tileSize * dpr;
    canvas.style.width = (size * this.tileSize) + 'px';
    canvas.style.height = (size * this.tileSize) + 'px';
    this.ctx.scale(dpr, dpr);

    this._mapSize = size;
    this._displaySize = size * this.tileSize;

    this.renderTerrain(tiles, size);
    this.renderResources(state.resources);
    this.renderSettlements(state.settlements);
    this.renderWarZones(state.events, state.settlements);

    this._pulseCenters = [];
    if (state.events) {
      for (var i = 0; i < state.events.length; i++) {
        var evt = state.events[i];
        if (evt.type === 'war' && state.settlements && state.settlements.length > 0) {
          var s = state.settlements[i % state.settlements.length];
          if (s) {
            this._pulseCenters.push({ x: (s.x || 0) * this.tileSize + this.tileSize / 2, y: (s.y || 0) * this.tileSize + this.tileSize / 2 });
          }
        }
      }
    }

    this.stopAnimation();
    this.startAnimation();
  };

  WorldMapRenderer.prototype.renderTerrain = function (tiles, size) {
    if (!tiles || tiles.length === 0) {
      this.ctx.fillStyle = '#1a1a3e';
      this.ctx.fillRect(0, 0, this._displaySize || 400, this._displaySize || 400);
      return;
    }

    var ts = this.tileSize;
    for (var y = 0; y < tiles.length && y < size; y++) {
      var row = tiles[y];
      if (!row) continue;
      for (var x = 0; x < row.length && x < size; x++) {
        var tileType = row[x];
        var color = this.colors[tileType] || this.colors[0];
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * ts, y * ts, ts, ts);
      }
    }
  };

  WorldMapRenderer.prototype.renderResources = function (resources) {
    if (!resources) return;
    var ts = this.tileSize;
    for (var i = 0; i < resources.length; i++) {
      var r = resources[i];
      if (r.x === undefined || r.y === undefined) continue;
      var colorKey = 'resource_' + (r.type || 'food');
      var color = this.colors[colorKey] || this.colors.resource_food;
      this.ctx.fillStyle = color;
      var cx = (r.x || 0) * ts + ts / 2 - 2;
      var cy = (r.y || 0) * ts + ts / 2 - 2;
      this.ctx.fillRect(cx, cy, 4, 4);
    }
  };

  WorldMapRenderer.prototype.renderSettlements = function (settlements) {
    if (!settlements) return;
    var ts = this.tileSize;
    var ctx = this.ctx;

    for (var i = 0; i < settlements.length; i++) {
      var s = settlements[i];
      var sx = (s.x || 0) * ts + ts / 2;
      var sy = (s.y || 0) * ts + ts / 2;
      var radius = Math.max(3, Math.min(12, Math.ceil(Math.sqrt(s.population || 100) / 20)));
      var color = this.colors.settlement_small;
      if (s.level === 'medium' || (s.population || 0) > 1000) color = this.colors.settlement_medium;
      if (s.level === 'large' || (s.population || 0) > 5000) color = this.colors.settlement_large;

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = radius * 2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      if (radius > 5 && s.name) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.name, sx, sy - radius - 4);
      }
    }
  };

  WorldMapRenderer.prototype.renderWarZones = function (events, settlements) {
    if (!events || !settlements) return;

    var ctx = this.ctx;
    var ts = this.tileSize;

    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      if (evt.type !== 'war') continue;
      if (i >= settlements.length) continue;
      var s = settlements[i];
      if (!s) continue;

      var sx = (s.x || 0) * ts + ts / 2;
      var sy = (s.y || 0) * ts + ts / 2;
      var time = (Date.now() - this.startTime) / 1000;
      var alpha = 0.15 + 0.1 * Math.sin(time * 1.5 + i);
      var radius = 15 + 5 * Math.sin(time * 1.2 + i * 0.7);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  WorldMapRenderer.prototype.drawPulse = function (x, y, time) {
    var ctx = this.ctx;
    var alpha = 0.4 * (0.5 + 0.5 * Math.sin(time * 2));
    var radius = 8 + 6 * Math.sin(time * 1.5);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  WorldMapRenderer.prototype.startAnimation = function () {
    if (this._destroyed) return;

    var self = this;

    function animate() {
      if (self._destroyed) return;
      if (self.state && self.state.tiles) {
        var time = (Date.now() - self.startTime) / 1000;
        var tiles = self.state.tiles;
        var size = tiles.length || 40;
        var ts = self.tileSize;

        self.renderTerrain(tiles, size);
        self.renderResources(self.state.resources);
        self.renderSettlements(self.state.settlements);

        for (var i = 0; i < self._pulseCenters.length; i++) {
          var pc = self._pulseCenters[i];
          var alpha = 0.3 + 0.2 * Math.sin(time * 1.5 + i * 0.7);
          var radius = 12 + 8 * Math.sin(time * 1.2 + i * 0.5);

          self.ctx.save();
          self.ctx.globalAlpha = alpha;
          self.ctx.strokeStyle = '#ff0000';
          self.ctx.lineWidth = 2;
          self.ctx.beginPath();
          self.ctx.arc(pc.x, pc.y, radius, 0, Math.PI * 2);
          self.ctx.stroke();
          self.ctx.restore();
        }
      }
      self.animationFrame = requestAnimationFrame(animate);
    }

    this.animationFrame = requestAnimationFrame(animate);
  };

  WorldMapRenderer.prototype.stopAnimation = function () {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  };

  WorldMapRenderer.prototype.destroy = function () {
    this._destroyed = true;
    this.stopAnimation();
    this.state = null;
    this.ctx = null;
    this.canvas = null;
  };

  window.WorldMapRenderer = WorldMapRenderer;
})();
