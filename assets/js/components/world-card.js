var STYLES = '\n    :host {\n      display: block;\n    }\n    .card {\n      background: var(--bg-card, rgba(20, 20, 40, 0.8));\n      border-radius: var(--radius-lg, 12px);\n      box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.3));\n      backdrop-filter: blur(10px);\n      -webkit-backdrop-filter: blur(10px);\n      border: 1px solid rgba(255,255,255,0.04);\n      transition: all 0.3s ease;\n      overflow: hidden;\n      cursor: pointer;\n      position: relative;\n    }\n    .card:hover {\n      transform: translateY(-4px);\n      box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.4));\n      background: var(--bg-card-hover, rgba(30, 30, 60, 0.9));\n    }\n    .thumbnail {\n      width: 100%;\n      height: 140px;\n      background: var(--bg-secondary, #141428);\n      position: relative;\n      overflow: hidden;\n    }\n    .thumbnail canvas {\n      width: 100%;\n      height: 100%;\n      image-rendering: pixelated;\n      transition: transform 0.3s ease;\n    }\n    .card:hover .thumbnail canvas {\n      transform: scale(1.05);\n    }\n    .thumbnail-placeholder {\n      width: 100%;\n      height: 100%;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      font-size: 48px;\n      opacity: 0.3;\n    }\n    .body {\n      padding: var(--spacing-md, 16px);\n    }\n    .name {\n      font-size: 18px;\n      font-weight: 700;\n      color: var(--text-primary, #e0e0e0);\n      margin-bottom: var(--spacing-xs, 4px);\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n    }\n    .creator {\n      display: flex;\n      align-items: center;\n      gap: var(--spacing-xs, 4px);\n      font-size: 13px;\n      color: var(--text-secondary, #8888aa);\n      margin-bottom: var(--spacing-xs, 4px);\n    }\n    .creator-avatar {\n      width: 18px;\n      height: 18px;\n      border-radius: 50%;\n      background: var(--text-muted, #555577);\n      overflow: hidden;\n      flex-shrink: 0;\n    }\n    .creator-avatar img {\n      width: 100%;\n      height: 100%;\n      object-fit: cover;\n    }\n    .meta {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      font-size: 13px;\n      color: var(--text-secondary, #8888aa);\n      margin: var(--spacing-xs, 4px) 0;\n    }\n    .era-track {\n      width: 100%;\n      height: 3px;\n      background: rgba(255,255,255,0.06);\n      border-radius: 2px;\n      margin-bottom: var(--spacing-xs, 4px);\n      overflow: hidden;\n    }\n    .era-track-fill {\n      height: 100%;\n      border-radius: 2px;\n      transition: width 0.5s ease;\n    }\n    .countdown {\n      font-size: 11px;\n      color: var(--color-primary-light, #6c5ce7);\n      font-family: var(--font-mono, monospace);\n      white-space: nowrap;\n      margin-right: 8px;\n    }\n    .era-tag {\n      padding: 2px 10px;\n      border-radius: 10px;\n      font-size: 12px;\n      font-weight: 600;\n      color: #fff;\n    }\n    .stats {\n      display: flex;\n      align-items: center;\n      gap: var(--spacing-md, 16px);\n      margin-top: var(--spacing-xs, 4px);\n      font-size: 14px;\n      color: var(--text-secondary, #8888aa);\n    }\n    .like-btn {\n      margin-left: auto;\n      background: none;\n      border: none;\n      cursor: pointer;\n      color: var(--text-muted, #555577);\n      font-size: 14px;\n      padding: 4px 8px;\n      border-radius: 6px;\n      transition: all 0.2s;\n      display: flex;\n      align-items: center;\n      gap: 4px;\n    }\n    .like-btn:hover {\n      background: rgba(255, 100, 100, 0.1);\n    }\n    .like-btn.liked {\n      color: #ff4757;\n    }\n    .heart-icon {\n      font-size: 16px;\n    }\n    .stat-item {\n      display: flex;\n      align-items: center;\n      gap: 4px;\n    }\n  ';

var TEMPLATE = '\n    <div class="card">\n      <div class="thumbnail" id="thumbnail">\n        <div class="thumbnail-placeholder" id="placeholder">&#x1f30d;</div>\n        <canvas id="map-canvas" style="display:none;"></canvas>\n      </div>\n      <div class="body">\n        <div class="name" id="card-name">\u2014</div>\n        <div class="creator">\n          <div class="creator-avatar"><img id="creator-img" src="" alt=""></div>\n          <span id="creator-name">\u2014</span>\n        </div>\n        <div class="meta">\n          <span id="card-year">\u7b2c 0 \u5e74</span>\n          <span class="era-tag" id="card-era-tag">\u539f\u59cb\u65f6\u4ee3</span>\n        </div>\n        <div class="era-track">\n          <div class="era-track-fill" id="era-track-fill" style="width:0%"></div>\n        </div>\n        <div class="stats">\n          <span class="stat-item">&#x1f3d8;&#xfe0f; <span id="card-settlements">0</span></span>\n          <span class="stat-item">&#x1f465; <span id="card-population">0</span></span>\n          <span class="countdown" id="card-countdown"></span>\n          <button class="like-btn" id="like-btn">\n            <span class="heart-icon" id="heart-icon">&#x2764;</span>\n            <span id="like-count">0</span>\n          </button>\n        </div>\n      </div>\n    </div>\n  ';

class WorldCard extends HTMLElement {
  constructor() {
    super();
    this._updating = false;
    this._data = {};
    this._liked = false;
  }

  connectedCallback() {
    this._render();
    this._attachEvents();
  }

  disconnectedCallback() {
    this._removeEvents();
    this._clearCountdown();
  }

  _render() {
    var shadow = this.shadowRoot || this.attachShadow({ mode: 'open' });
    if (!shadow.querySelector('style')) {
      var style = document.createElement('style');
      style.textContent = STYLES;
      shadow.appendChild(style);
    }
    var existing = shadow.querySelector('.card');
    if (existing) return;
    var wrapper = document.createElement('div');
    wrapper.innerHTML = TEMPLATE;
    while (wrapper.firstChild) {
      shadow.appendChild(wrapper.firstChild);
    }
    this._cacheElements();
    this._updateFromAttributes();
  }

  _cacheElements() {
    var shadow = this.shadowRoot;
    this._els = {
      card: shadow.querySelector('.card'),
      thumbnail: shadow.getElementById('thumbnail'),
      placeholder: shadow.getElementById('placeholder'),
      canvas: shadow.getElementById('map-canvas'),
      name: shadow.getElementById('card-name'),
      creatorName: shadow.getElementById('creator-name'),
      creatorImg: shadow.getElementById('creator-img'),
      year: shadow.getElementById('card-year'),
      eraTag: shadow.getElementById('card-era-tag'),
      eraTrackFill: shadow.getElementById('era-track-fill'),
      settlements: shadow.getElementById('card-settlements'),
      population: shadow.getElementById('card-population'),
      countdown: shadow.getElementById('card-countdown'),
      likeBtn: shadow.getElementById('like-btn'),
      heartIcon: shadow.getElementById('heart-icon'),
      likeCount: shadow.getElementById('like-count')
    };
  }

  _updateFromAttributes() {
    var data = {
      worldId: this.getAttribute('world-id') || this.getAttribute('worldid') || '',
      name: this.getAttribute('name') || '',
      creator: this.getAttribute('creator') || '',
      creatorAvatar: this.getAttribute('creator-avatar') || this.getAttribute('creatoravatar') || '',
      year: this.getAttribute('year') || '0',
      era: this.getAttribute('era') || 'primitive',
      settlements: this.getAttribute('settlements') || '0',
      population: this.getAttribute('population') || '0',
      likes: this.getAttribute('likes') || '0',
      isLiked: this.getAttribute('is-liked') === 'true',
      updatedAt: this.getAttribute('updated-at') || '',
      lastEvolvedAt: this.getAttribute('last-evolved-at') || ''
    };
    this.update(data);
  }

  update(data) {
    if (this._updating) return;
    this._updating = true;
    if (!this._els) {
      this._data = data || {};
      this._updating = false;
      return;
    }
    if (data) {
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          this._data[key] = data[key];
        }
      }
    }
    var d = this._data;
    var els = this._els;
    if (els.name) els.name.textContent = d.name || '\u2014';
    if (els.creatorName) els.creatorName.textContent = d.creator || '\u2014';
    if (els.creatorImg) {
      if (d.creatorAvatar) {
        els.creatorImg.src = d.creatorAvatar;
        els.creatorImg.style.display = '';
      } else {
        els.creatorImg.style.display = 'none';
      }
    }
    var year = parseInt(d.year, 10) || 0;
    if (els.year) els.year.textContent = '\u7b2c ' + year + ' \u5e74';
    var eraKey = d.era || 'primitive';
    var eraName = this._getEraName(eraKey);
    if (els.eraTag) {
      els.eraTag.textContent = eraName;
      els.eraTag.className = 'era-tag colored';
      els.eraTag.setAttribute('data-era', eraKey);
      els.eraTag.style.background = this._getEraColor(eraKey);
    }
    // Era progress bar
    if (els.eraTrackFill) {
      var eraRanges = { antiquity: [0, 300], exploration: [300, 600], modern: [600, 1200] };
      var range = eraRanges[eraKey] || [0, 300];
      var progress = Math.min(100, Math.max(0, (year - range[0]) / (range[1] - range[0]) * 100));
      els.eraTrackFill.style.width = progress + '%';
      els.eraTrackFill.style.background = this._getEraColor(eraKey);
    }
    // Start countdown timer for evolution
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
    this._startCountdown();
    if (els.settlements) els.settlements.textContent = this._formatNum(d.settlements);
    if (els.population) els.population.textContent = this._formatNum(d.population);
    var likes = parseInt(d.likes, 10) || 0;
    if (els.likeCount) els.likeCount.textContent = likes;
    this._liked = d.isLiked === true;
    if (els.likeBtn) {
      els.likeBtn.classList.toggle('liked', this._liked);
    }
    this._renderThumbnail();
    this._updating = false;
  }

  _renderThumbnail() {
    var els = this._els;
    if (!els.canvas || !els.placeholder) return;
    var d = this._data;
    var size = 20;
    var canvas = els.canvas;
    var ctx = canvas.getContext('2d');
    var px = 4;
    canvas.width = size * px;
    canvas.height = size * px;
    var pseudoRand = this._getSeededRandom(d.worldId || 'default');
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var val = pseudoRand();
        var color = '#1a1a3e';
        if (val < 0.35) color = '#1a1a3e';
        else if (val < 0.55) color = '#2d5a27';
        else if (val < 0.7) color = '#1a3d1a';
        else if (val < 0.82) color = '#5c5c5c';
        else color = '#4a90d9';
        if (d.era === 'primitive') color = this._adjustBrightness(color, -20);
        else if (d.era === 'electric' || d.era === 'info') color = this._adjustBrightness(color, 20);
        ctx.fillStyle = color;
        ctx.fillRect(x * px, y * px, px, px);
      }
    }
    if (d.population > 0) {
      var numSettlements = Math.min(parseInt(d.settlements, 10) || 1, 8);
      for (var i = 0; i < numSettlements; i++) {
        var sx = Math.floor(pseudoRand() * (size - 4)) + 2;
        var sy = Math.floor(pseudoRand() * (size - 4)) + 2;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(sx * px + px / 2, sy * px + px / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    els.canvas.style.display = '';
    if (els.placeholder) els.placeholder.style.display = 'none';
    if (els.thumbnail) {
      var t = this._data.name || '';
      var pop = parseInt(this._data.population, 10) || 0;
      var setts = parseInt(this._data.settlements, 10) || 0;
      els.thumbnail.title = t + ' | 👥 ' + this._formatNum(pop) + ' 🏘️ ' + setts;
    }
  }

  _getSeededRandom(seed) {
    var s = 0;
    for (var i = 0; i < seed.length; i++) {
      s += seed.charCodeAt(i);
    }
    s = s || 42;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  _adjustBrightness(hex, amount) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    return '#' + [r, g, b].map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join('');
  }

  _formatNum(n) {
    if (n === null || n === undefined) return '0';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  _relativeTime(dateStr) {
    if (!dateStr) return '';
    var then = new Date(dateStr);
    if (isNaN(then.getTime())) return '';
    var diff = Math.floor((Date.now() - then.getTime()) / 1000);
    if (diff < 5) return '刚才更新';
    if (diff < 60) return '几十秒前更新';
    var mins = Math.floor(diff / 60);
    if (mins < 60) return mins + '分钟前更新';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + '小时前更新';
    var days = Math.floor(hours / 24);
    if (days < 30) return days + '天前更新';
    return '30天前更新';
  }

  _getEraName(key) {
    var names = {
      primitive: '\u539f\u59cb\u65f6\u4ee3', agriculture: '\u519c\u8015\u65f6\u4ee3', bronze: '\u9752\u94dc\u65f6\u4ee3',
      iron: '\u94c1\u5668\u65f6\u4ee3', steam: '\u84b8\u6c7d\u65f6\u4ee3', electric: '\u7535\u6c14\u65f6\u4ee3', info: '\u4fe1\u606f\u65f6\u4ee3'
    };
    return names[key] || key || '\u539f\u59cb\u65f6\u4ee3';
  }

  _getEraColor(key) {
    var colors = {
      primitive: '#8B7355', agriculture: '#6B8E23', bronze: '#CD853F',
      iron: '#708090', steam: '#B0C4DE', electric: '#FFD700', info: '#00CED1'
    };
    return colors[key] || '#8B7355';
  }

  _startCountdown() {
    if (this._countdownTimer) return;
    this._updateCountdown();
    var self = this;
    this._countdownTimer = setInterval(function () {
      self._updateCountdown();
    }, 1000);
  }

  _updateCountdown() {
    if (!this._els || !this._els.countdown) return;

    var SECONDS_PER_YEAR = 864;
    var lastEvo = new Date(this._data.lastEvolvedAt || Date.now()).getTime();
    var nextEvo = lastEvo + SECONDS_PER_YEAR * 1000;
    var now = Date.now();
    var remaining = Math.ceil((nextEvo - now) / 1000);

    this._els.countdown.style.color = '';
    if (remaining > 3600) {
      this._els.countdown.textContent = '⏳ ' + Math.ceil(remaining / 3600) + 'h';
    } else if (remaining > 60) {
      this._els.countdown.textContent = '⏳ ' + Math.ceil(remaining / 60) + 'm';
    } else if (remaining > 0) {
      this._els.countdown.textContent = '⏳ ' + remaining + 's';
    } else {
      var overdue = Math.ceil(-remaining / 60);
      this._els.countdown.textContent = '⏳ +' + overdue + 'm';
    }

    // Fire refresh: on first load if overdue, or when crossing from positive to ≤0
    var shouldFire = false;
    if (this._prevRemaining === undefined) {
      shouldFire = remaining <= 0;
    } else if (this._prevRemaining > 0 && remaining <= 0) {
      shouldFire = true;
    }
    if (shouldFire) {
      console.log('[WORLD-CARD] world-refresh for', this._data.worldId, 'at', new Date(now).toISOString());
      this.dispatchEvent(new CustomEvent('world-refresh', {
        bubbles: true, composed: true, detail: { worldId: this._data.worldId }
      }));
    }
    this._prevRemaining = remaining;
  }

  _clearCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
    if (this._els && this._els.countdown) {
      this._els.countdown.textContent = '';
    }
  }

  _attachEvents() {
    var self = this;
    this._cardClickHandler = function () {
      if (self._data && self._data.worldId) {
        self.dispatchEvent(new CustomEvent('card-click', {
          bubbles: true, composed: true, detail: { worldId: self._data.worldId }
        }));
      }
    };
    this._likeClickHandler = function (e) {
      e.stopPropagation();
      self.dispatchEvent(new CustomEvent('like-toggle', {
        bubbles: true, composed: true, detail: { worldId: self._data.worldId, liked: !self._liked }
      }));
    };
    var shadow = this.shadowRoot;
    if (shadow) {
      var card = shadow.querySelector('.card');
      var likeBtn = shadow.getElementById('like-btn');
      if (card) card.addEventListener('click', this._cardClickHandler);
      if (likeBtn) likeBtn.addEventListener('click', this._likeClickHandler);
    }
  }

  _removeEvents() {
    var shadow = this.shadowRoot;
    if (shadow) {
      var card = shadow.querySelector('.card');
      var likeBtn = shadow.getElementById('like-btn');
      if (card && this._cardClickHandler) card.removeEventListener('click', this._cardClickHandler);
      if (likeBtn && this._likeClickHandler) likeBtn.removeEventListener('click', this._likeClickHandler);
    }
  }
}

if (!customElements.get('world-card')) {
  customElements.define('world-card', WorldCard);
}
window.WorldCard = WorldCard;
