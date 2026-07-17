(function () {
  'use strict';

  var STYLE_ID = 'world-card-styles';
  var STYLES = '\n    :host {\n      display: block;\n    }\n    .card {\n      background: var(--bg-card, rgba(20, 20, 40, 0.8));\n      border-radius: var(--radius-lg, 12px);\n      box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.3));\n      backdrop-filter: blur(10px);\n      -webkit-backdrop-filter: blur(10px);\n      border: 1px solid rgba(255,255,255,0.04);\n      transition: all 0.3s ease;\n      overflow: hidden;\n      cursor: pointer;\n      position: relative;\n    }\n    .card:hover {\n      transform: translateY(-4px);\n      box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.4));\n      background: var(--bg-card-hover, rgba(30, 30, 60, 0.9));\n    }\n    .thumbnail {\n      width: 100%;\n      height: 140px;\n      background: var(--bg-secondary, #141428);\n      position: relative;\n      overflow: hidden;\n    }\n    .thumbnail canvas {\n      width: 100%;\n      height: 100%;\n      image-rendering: pixelated;\n      transition: transform 0.3s ease;\n    }\n    .card:hover .thumbnail canvas {\n      transform: scale(1.05);\n    }\n    .thumbnail-placeholder {\n      width: 100%;\n      height: 100%;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      font-size: 48px;\n      opacity: 0.3;\n    }\n    .body {\n      padding: var(--spacing-md, 16px);\n    }\n    .name {\n      font-size: 18px;\n      font-weight: 700;\n      color: var(--text-primary, #e0e0e0);\n      margin-bottom: var(--spacing-xs, 4px);\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n    }\n    .creator {\n      display: flex;\n      align-items: center;\n      gap: var(--spacing-xs, 4px);\n      font-size: 13px;\n      color: var(--text-secondary, #8888aa);\n      margin-bottom: var(--spacing-xs, 4px);\n    }\n    .creator-avatar {\n      width: 18px;\n      height: 18px;\n      border-radius: 50%;\n      background: var(--text-muted, #555577);\n      overflow: hidden;\n      flex-shrink: 0;\n    }\n    .creator-avatar img {\n      width: 100%;\n      height: 100%;\n      object-fit: cover;\n    }\n    .meta {\n      display: flex;\n      align-items: center;\n      gap: var(--spacing-sm, 8px);\n      font-size: 12px;\n      color: var(--text-muted, #555577);\n      margin-bottom: var(--spacing-sm, 8px);\n    }\n    .era-tag {\n      display: inline-flex;\n      align-items: center;\n      padding: 2px 12px;\n      border-radius: var(--radius-xl, 16px);\n      font-size: 12px;\n      font-weight: 500;\n      background: rgba(255,255,255,0.08);\n      color: var(--text-secondary, #8888aa);\n    }\n    .era-tag.colored {\n      color: #fff;\n    }\n    .stats {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      font-size: 12px;\n      color: var(--text-muted, #555577);\n    }\n    .stat-item {\n      display: flex;\n      align-items: center;\n      gap: 4px;\n    }\n    .like-btn {\n      display: inline-flex;\n      align-items: center;\n      gap: 4px;\n      color: var(--color-accent, #fd79a8);\n      background: none;\n      border: none;\n      cursor: pointer;\n      padding: 4px 8px;\n      border-radius: var(--radius-md, 8px);\n      transition: all 0.2s ease;\n      font-size: 14px;\n      position: relative;\n    }\n    .like-btn:hover {\n      background: rgba(253, 121, 168, 0.1);\n    }\n    .like-btn.liked {\n      color: var(--color-accent, #fd79a8);\n    }\n    .like-btn.liked .heart-icon {\n      animation: like-pop 0.3s ease;\n    }\n    .heart-icon {\n      display: inline-block;\n      transition: transform 0.2s ease;\n    }\n    .like-btn:active .heart-icon {\n      transform: scale(1.3);\n    }\n    @keyframes like-pop {\n      0% { transform: scale(1); }\n      50% { transform: scale(1.4); }\n      100% { transform: scale(1); }\n    }\n    @keyframes skeleton-shimmer {\n      0% { background-position: 200% 0; }\n      100% { background-position: -200% 0; }\n    }\n    .skeleton-thumb {\n      background: linear-gradient(90deg, var(--bg-card, rgba(20,20,40,0.8)) 25%, rgba(40,40,70,0.6) 50%, var(--bg-card, rgba(20,20,40,0.8)) 75%);\n      background-size: 200% 100%;\n      animation: skeleton-shimmer 1.5s ease-in-out infinite;\n    }\n  ';

  var TEMPLATE = '\n    <div class="card">\n      <div class="thumbnail" id="thumbnail">\n        <div class="thumbnail-placeholder" id="placeholder">🌍</div>\n        <canvas id="map-canvas" style="display:none;"></canvas>\n      </div>\n      <div class="body">\n        <div class="name" id="card-name">—</div>\n        <div class="creator">\n          <div class="creator-avatar"><img id="creator-img" src="" alt=""></div>\n          <span id="creator-name">—</span>\n        </div>\n        <div class="meta">\n          <span id="card-year">第 0 年</span>\n          <span class="era-tag" id="card-era-tag">原始时代</span>\n        </div>\n        <div class="stats">\n          <span class="stat-item">🏘️ <span id="card-settlements">0</span></span>\n          <span class="stat-item">👥 <span id="card-population">0</span></span>\n          <button class="like-btn" id="like-btn">\n            <span class="heart-icon" id="heart-icon">❤</span>\n            <span id="like-count">0</span>\n          </button>\n        </div>\n      </div>\n    </div>\n  ';

  var WorldCardProto = Object.create(HTMLElement.prototype);

  WorldCardProto.attachedCallback = WorldCardProto.connectedCallback = function () {
    this._updating = false;
    this._data = {};
    this._liked = false;
    this._render();
    this._attachEvents();
  };

  WorldCardProto.detachedCallback = WorldCardProto.disconnectedCallback = function () {
    this._removeEvents();
  };

  WorldCardProto._render = function () {
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
  };

  WorldCardProto._cacheElements = function () {
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
      settlements: shadow.getElementById('card-settlements'),
      population: shadow.getElementById('card-population'),
      likeBtn: shadow.getElementById('like-btn'),
      heartIcon: shadow.getElementById('heart-icon'),
      likeCount: shadow.getElementById('like-count')
    };
  };

  WorldCardProto._updateFromAttributes = function () {
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
      isLiked: this.getAttribute('is-liked') === 'true' || this.getAttribute('isl Liked') === 'true'
    };
    this.update(data);
  };

  WorldCardProto.update = function (data) {
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

    if (els.name) els.name.textContent = d.name || '—';
    if (els.creatorName) els.creatorName.textContent = d.creator || '—';
    if (els.creatorImg) {
      if (d.creatorAvatar) {
        els.creatorImg.src = d.creatorAvatar;
        els.creatorImg.style.display = '';
      } else {
        els.creatorImg.style.display = 'none';
      }
    }

    var year = parseInt(d.year, 10) || 0;
    if (els.year) els.year.textContent = '第 ' + year + ' 年';

    var eraKey = d.era || 'primitive';
    var eraName = this._getEraName(eraKey);
    if (els.eraTag) {
      els.eraTag.textContent = eraName;
      els.eraTag.className = 'era-tag colored';
      els.eraTag.setAttribute('data-era', eraKey);
      els.eraTag.style.background = this._getEraColor(eraKey);
    }

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
  };

  WorldCardProto._renderThumbnail = function () {
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
  };

  WorldCardProto._getSeededRandom = function (seed) {
    var s = 0;
    for (var i = 0; i < seed.length; i++) {
      s += seed.charCodeAt(i);
    }
    s = s || 42;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  WorldCardProto._adjustBrightness = function (hex, amount) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    return '#' + [r, g, b].map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join('');
  };

  WorldCardProto._formatNum = function (n) {
    if (n === null || n === undefined) return '0';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  WorldCardProto._getEraName = function (key) {
    var names = {
      primitive: '原始时代', agriculture: '农耕时代', bronze: '青铜时代',
      iron: '铁器时代', steam: '蒸汽时代', electric: '电气时代', info: '信息时代'
    };
    return names[key] || key || '原始时代';
  };

  WorldCardProto._getEraColor = function (key) {
    var colors = {
      primitive: '#8B7355', agriculture: '#6B8E23', bronze: '#CD853F',
      iron: '#708090', steam: '#B0C4DE', electric: '#FFD700', info: '#00CED1'
    };
    return colors[key] || '#8B7355';
  };

  WorldCardProto._attachEvents = function () {
    var self = this;

    this._cardClickHandler = function () {
      if (self._data && self._data.worldId) {
        self.dispatchEvent(new CustomEvent('card-click', {
          bubbles: true,
          composed: true,
          detail: { worldId: self._data.worldId }
        }));
      }
    };

    this._likeClickHandler = function (e) {
      e.stopPropagation();
      self._liked = !self._liked;
      if (self._els.likeBtn) {
        self._els.likeBtn.classList.toggle('liked', self._liked);
      }
      var likes = parseInt(self._data.likes, 10) || 0;
      self._data.likes = self._liked ? likes + 1 : Math.max(0, likes - 1);
      if (self._els.likeCount) {
        self._els.likeCount.textContent = self._data.likes;
      }
      self.dispatchEvent(new CustomEvent('like-toggle', {
        bubbles: true,
        composed: true,
        detail: { worldId: self._data.worldId, liked: self._liked }
      }));
    };

    var shadow = this.shadowRoot;
    if (shadow) {
      var card = shadow.querySelector('.card');
      var likeBtn = shadow.getElementById('like-btn');
      if (card) card.addEventListener('click', this._cardClickHandler);
      if (likeBtn) likeBtn.addEventListener('click', this._likeClickHandler);
    }
  };

  WorldCardProto._removeEvents = function () {
    var shadow = this.shadowRoot;
    if (shadow) {
      var card = shadow.querySelector('.card');
      var likeBtn = shadow.getElementById('like-btn');
      if (card && this._cardClickHandler) card.removeEventListener('click', this._cardClickHandler);
      if (likeBtn && this._likeClickHandler) likeBtn.removeEventListener('click', this._likeClickHandler);
    }
  };

  if (!document.registerElement) {
    try {
      document.registerElement('world-card', { prototype: WorldCardProto });
    } catch (e) {
      /* already registered or not supported */
    }
  }

  if (window.customElements && !window.customElements.get('world-card')) {
    try {
      window.customElements.define('world-card', WorldCardProto.constructor ?
        WorldCardProto.constructor :
        function () { return HTMLElement.apply(this, arguments); }
      );
    } catch (e) {
      /* fallback */
    }
  }

  try {
    var WorldCard = function () {
      return Reflect.construct(HTMLElement, [], WorldCard);
    };
    WorldCard.prototype = WorldCardProto;
    if (window.customElements && !window.customElements.get('world-card')) {
      window.customElements.define('world-card', WorldCard);
    }
  } catch (e) {
    /* final fallback - use registerElement if available */
    if (!document.registerElement) {
      (function () {
        var proto = Object.create(HTMLElement.prototype);
        var methods = ['connectedCallback', 'attachedCallback', 'detachedCallback', 'disconnectedCallback',
          'update', 'attributeChangedCallback'];
        methods.forEach(function (m) {
          if (typeof WorldCardProto[m] === 'function') {
            proto[m] = WorldCardProto[m];
          }
        });
        if (document.registerElement) {
          try { document.registerElement('world-card', { prototype: proto }); } catch (ex) {}
        }
      })();
    }
  }

  window.WorldCard = WorldCardProto;
})();
