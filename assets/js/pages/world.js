(function () {
  'use strict';

  class WorldDetailPage {
    constructor() {
      this.worldId = null;
      this.worldData = null;
      this._animFrame = null;
      this._bound = {};
    }

    init(params) {
      this.worldId = (params && params.id) || null;
      if (!this.worldId) {
        this._showError('世界ID未指定');
        return;
      }

      this.appEl = document.getElementById('app');
      this._cacheElements();
      this._bindEvents();
      this.loadWorldData(this.worldId);
    }

    _cacheElements() {
      this.worldNameEl = document.getElementById('world-name');
      this.worldYearEl = document.getElementById('world-year');
      this.worldEraTag = document.getElementById('world-era-tag');
      this.worldCreatorEl = document.getElementById('world-creator');
      this.likeBtn = document.getElementById('world-like-btn');
      this.shareBtn = document.getElementById('world-share-btn');
      this.mapContainer = document.getElementById('world-map-container');
      this.mapCanvas = document.getElementById('world-map-canvas');
      this.statSettlements = document.getElementById('stat-settlements');
      this.statPopulation = document.getElementById('stat-population');
      this.statWars = document.getElementById('stat-wars');
      this.statTech = document.getElementById('stat-tech');
      this.eventsList = document.getElementById('world-events-list');
      this.timelineList = document.getElementById('timeline-list');
      this.settlementsList = document.getElementById('settlements-list');
      this.timelineEraFilter = document.getElementById('timeline-era-filter');
      this.timelineTypeFilter = document.getElementById('timeline-type-filter');
      this.interveneEmpty = document.getElementById('intervene-empty');
      this.interveneContent = document.getElementById('intervene-content');
      this.interveneRemaining = document.getElementById('intervene-remaining');
      this.openInterveneBtn = document.getElementById('open-intervene-modal');
      this.interventionTypes = document.getElementById('intervention-types');
      this.interveneTargetSelect = document.getElementById('intervene-target-select');
    }

    _bindEvents() {
      var self = this;

      if (this.likeBtn) {
        this._bound.likeToggle = function () { self.onLikeToggle(); };
        this.likeBtn.addEventListener('click', this._bound.likeToggle);
      }

      if (this.shareBtn) {
        this._bound.share = function () { self.onShare(); };
        this.shareBtn.addEventListener('click', this._bound.share);
      }

      var backBtn = this.appEl && this.appEl.querySelector('[data-action="back"]');
      if (backBtn) {
        backBtn.addEventListener('click', function () { window.history.back(); });
      }

      var tabItems = this.appEl && this.appEl.querySelectorAll('.tab-item[data-tab]');
      if (tabItems) {
        for (var i = 0; i < tabItems.length; i++) {
          (function (tab) {
            tab.addEventListener('click', function () {
              self._switchTab(tab.getAttribute('data-tab'));
            });
          })(tabItems[i]);
        }
      }

      if (this.timelineEraFilter) {
        this.timelineEraFilter.addEventListener('change', function () {
          self._renderTimelineFiltered();
        });
      }

      if (this.timelineTypeFilter) {
        this.timelineTypeFilter.addEventListener('change', function () {
          self._renderTimelineFiltered();
        });
      }

      if (this.openInterveneBtn) {
        this.openInterveneBtn.addEventListener('click', function () {
          self._openInterveneModal();
        });
      }
    }

    async loadWorldData(worldId) {
      this._showLoading(true);

      try {
        var dm = window.DataManager;
        var world;

        if (dm && typeof dm.getWorld === 'function') {
          world = await dm.getWorld(worldId);
        } else {
          var demos = window.DEMO_WORLDS || [];
          for (var i = 0; i < demos.length; i++) {
            if (demos[i].world_id === worldId) {
              world = demos[i];
              break;
            }
          }
        }

        if (!world) {
          this._showError('世界不存在');
          return;
        }

        this.worldData = world;
        this._showLoading(false);
        this._renderAll();
      } catch (err) {
        console.error('loadWorldData error:', err);
        this._showError('加载世界数据失败');
      }
    }

    _renderAll() {
      var w = this.worldData;
      this.renderWorldInfo(w);
      this.renderMap(w);

      setTimeout(this._animateStats.bind(this), 100);

      this.renderEvents(w.history || []);
      this.renderTimeline(w.history || []);
      this.renderSettlements(w.settlements || []);
      this.renderInterventionPanel(w);
    }

    renderWorldInfo(world) {
      if (this.worldNameEl) this.worldNameEl.textContent = world.name || '未知世界';
      if (this.worldYearEl) this.worldYearEl.textContent = world.year || 0;

      if (this.worldEraTag) {
        this.worldEraTag.textContent = world.eraName || world.era || '原始时代';
        this.worldEraTag.setAttribute('data-era', world.era || 'primitive');
      }

      if (this.worldCreatorEl) {
        this.worldCreatorEl.textContent = world.creator || '—';
      }

      if (this.likeBtn) {
        var liked = localStorage.getItem('liked_' + world.world_id) === '1';
        this.likeBtn.classList.toggle('liked', liked);
        this.likeBtn.setAttribute('data-tooltip', liked ? '取消点赞' : '点赞');
      }
    }

    renderMap(world) {
      if (!this.mapCanvas) return;
      var size = world.map_size || { width: 40, height: 40 };
      var tiles = world.terrain && world.terrain.tiles;

      var container = this.mapContainer;
      var rect = container ? container.getBoundingClientRect() : { width: 600, height: 337 };
      var cw = rect.width || 600;
      var ch = rect.height || 337;

      var dpr = window.devicePixelRatio || 1;
      this.mapCanvas.width = cw * dpr;
      this.mapCanvas.height = ch * dpr;
      this.mapCanvas.style.width = cw + 'px';
      this.mapCanvas.style.height = ch + 'px';

      var ctx = this.mapCanvas.getContext('2d');
      ctx.scale(dpr, dpr);

      var tileSize = Math.min(cw / size.width, ch / size.height);
      var offsetX = (cw - tileSize * size.width) / 2;
      var offsetY = (ch - tileSize * size.height) / 2;

      var terrainColors = ['#3a5a4a', '#6b8e5a', '#8a7a5a', '#5a6a7a', '#4a7a8a'];

      if (tiles) {
        for (var y = 0; y < Math.min(tiles.length, size.height); y++) {
          var row = tiles[y];
          if (!row) continue;
          for (var x = 0; x < Math.min(row.length, size.width); x++) {
            var t = row[x];
            if (t === undefined || t === null) t = 0;
            ctx.fillStyle = terrainColors[t % terrainColors.length] || terrainColors[0];
            ctx.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, Math.ceil(tileSize), Math.ceil(tileSize));
          }
        }
      } else {
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(0, 0, cw, ch);
      }

      var settlements = world.settlements || [];
      for (var i = 0; i < settlements.length; i++) {
        var s = settlements[i];
        var sx = offsetX + (s.x || 0) * tileSize;
        var sy = offsetY + (s.y || 0) * tileSize;
        var radius = Math.max(3, Math.min(6, tileSize * 0.5));
        ctx.beginPath();
        ctx.arc(sx + tileSize / 2, sy + tileSize / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#a29bfe';
        ctx.fill();
        ctx.strokeStyle = '#6c5ce7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (tileSize >= 6) {
          ctx.fillStyle = '#ffffff';
          ctx.font = Math.max(8, Math.min(11, tileSize * 0.6)) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(s.name || '', sx + tileSize / 2, sy - 2);
        }
      }

      var events = world.active_events || [];
      var eventColors = { war: '#e17055', natural_disaster: '#fdcb6e', plague: '#fd79a8', cultural_boom: '#74b9ff', tech_breakthrough: '#00b894' };
      for (var j = 0; j < events.length; j++) {
        var evt = events[j];
        var participants = evt.participants || [];
        for (var k = 0; k < participants.length; k++) {
          for (var si = 0; si < settlements.length; si++) {
            if (settlements[si].id === participants[k]) {
              var px = offsetX + (settlements[si].x || 0) * tileSize + tileSize / 2;
              var py = offsetY + (settlements[si].y || 0) * tileSize + tileSize / 2;
              ctx.beginPath();
              ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
              ctx.strokeStyle = eventColors[evt.type] || '#e17055';
              ctx.lineWidth = 2;
              ctx.setLineDash([3, 3]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }
      }
    }

    renderStatCards(world) {
      var stats = world.stats || {};
      var targets = [
        { el: this.statSettlements, val: stats.total_settlements || 0 },
        { el: this.statPopulation, val: stats.total_population || 0 },
        { el: this.statWars, val: stats.total_wars || 0 },
        { el: this.statTech, val: stats.tech_breakthroughs || 0 }
      ];

      for (var i = 0; i < targets.length; i++) {
        if (targets[i].el) {
          targets[i].el.textContent = targets[i].val;
        }
      }
    }

    _animateStats() {
      var world = this.worldData;
      if (!world) return;
      var stats = world.stats || {};
      var targets = [
        { el: this.statSettlements, val: stats.total_settlements || 0 },
        { el: this.statPopulation, val: stats.total_population || 0 },
        { el: this.statWars, val: stats.total_wars || 0 },
        { el: this.statTech, val: stats.tech_breakthroughs || 0 }
      ];

      var duration = 500;
      var startTime = Date.now();

      function animate() {
        var elapsed = Date.now() - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);

        for (var i = 0; i < targets.length; i++) {
          if (targets[i].el) {
            var current = Math.round(eased * targets[i].val);
            targets[i].el.textContent = current;
          }
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }

      animate();
    }

    renderEvents(events) {
      if (!this.eventsList) return;
      this.eventsList.innerHTML = '';

      var recent = events.slice(-5).reverse();

      for (var i = 0; i < recent.length; i++) {
        var evt = recent[i];
        var item = document.createElement('div');
        item.className = 'event-item';

        var typeClass = '';
        switch (evt.type) {
          case 'war': case 'war_outbreak': typeClass = 'war'; break;
          case 'natural_disaster': typeClass = 'disaster'; break;
          case 'tech_breakthrough': typeClass = 'breakthrough'; break;
          case 'cultural_boom': typeClass = 'culture'; break;
          case 'plague': typeClass = 'plague'; break;
        }
        if (typeClass) item.classList.add(typeClass);

        var yearEl = document.createElement('div');
        yearEl.className = 'event-year';
        yearEl.textContent = '第 ' + (evt.year || 0) + ' 年';
        item.appendChild(yearEl);

        var textEl = document.createElement('div');
        textEl.className = 'event-text';
        textEl.innerHTML = evt.description || '';
        item.appendChild(textEl);

        this.eventsList.appendChild(item);
      }

      if (recent.length === 0) {
        this.eventsList.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">暂无事件记录</div>';
      }
    }

    renderTimeline(events) {
      if (!this.timelineList) return;
      this._allTimelineEvents = events || [];
      this._renderTimelineFiltered();
    }

    _renderTimelineFiltered() {
      if (!this.timelineList) return;
      var events = this._allTimelineEvents || [];

      var eraFilter = this.timelineEraFilter ? this.timelineEraFilter.value : 'all';
      var typeFilter = this.timelineTypeFilter ? this.timelineTypeFilter.value : 'all';

      var eraThresholds = { primitive: 0, agriculture: 100, bronze: 300, iron: 500, steam: 700, electric: 1000, info: 1500 };

      var filtered = events.filter(function (e) {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (eraFilter !== 'all') {
          var threshold = eraThresholds[eraFilter] || 0;
          var nextEras = { primitive: 100, agriculture: 300, bronze: 500, iron: 700, steam: 1000, electric: 1500, info: Infinity };
          var maxYear = nextEras[eraFilter] || Infinity;
          if ((e.year || 0) < threshold || (e.year || 0) >= maxYear) return false;
        }
        return true;
      });

      filtered.sort(function (a, b) { return (a.year || 0) - (b.year || 0); });

      this.timelineList.innerHTML = '';

      if (filtered.length === 0) {
        this.timelineList.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center;">没有匹配的事件</div>';
        return;
      }

      for (var i = 0; i < filtered.length; i++) {
        var evt = filtered[i];
        var item = document.createElement('div');
        item.className = 'event-item';

        var typeClass = '';
        switch (evt.type) {
          case 'war': case 'war_outbreak': typeClass = 'war'; break;
          case 'natural_disaster': typeClass = 'disaster'; break;
          case 'tech_breakthrough': typeClass = 'breakthrough'; break;
          case 'cultural_boom': typeClass = 'culture'; break;
          case 'plague': typeClass = 'plague'; break;
        }
        if (typeClass) item.classList.add(typeClass);

        var yearEl = document.createElement('div');
        yearEl.className = 'event-year';
        yearEl.textContent = '第 ' + (evt.year || 0) + ' 年';
        item.appendChild(yearEl);

        var textEl = document.createElement('div');
        textEl.className = 'event-text';
        textEl.innerHTML = (evt.description || '') + ' <span style="font-size:11px;color:var(--text-muted)">[' + this._eventTypeLabel(evt.type) + ']</span>';
        item.appendChild(textEl);

        this.timelineList.appendChild(item);
      }
    }

    _eventTypeLabel(type) {
      var map = {
        war: '战争', war_outbreak: '战争', natural_disaster: '灾害',
        plague: '瘟疫', cultural_boom: '文化', tech_breakthrough: '技术'
      };
      return map[type] || type || '未知';
    }

    renderSettlements(settlements) {
      if (!this.settlementsList) return;
      this.settlementsList.innerHTML = '';

      if (!settlements || settlements.length === 0) {
        this.settlementsList.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center;">没有聚落数据</div>';
        return;
      }

      for (var i = 0; i < settlements.length; i++) {
        var s = settlements[i];
        var card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'padding:var(--spacing-md);margin-bottom:var(--spacing-sm);';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';

        var nameEl = document.createElement('strong');
        nameEl.style.cssText = 'color:var(--text-primary);font-size:15px;';
        nameEl.textContent = s.name || '未命名';
        header.appendChild(nameEl);

        var statusEl = document.createElement('span');
        statusEl.className = 'tag';
        var statusColors = { '繁荣': '#00b894', '发展': '#fdcb6e', '衰落': '#e17055', '灭亡': '#636e72' };
        statusEl.style.cssText = 'color:' + (statusColors[s.status] || '#8888aa') + ';background:rgba(255,255,255,0.06);';
        statusEl.textContent = s.status || '未知';
        header.appendChild(statusEl);

        card.appendChild(header);

        var body = document.createElement('div');
        body.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-secondary);';
        body.innerHTML =
          '<span>👥 人口: <strong style="color:var(--text-primary)">' + (s.population || 0) + '</strong></span>' +
          '<span>🔧 技术等级: <strong style="color:var(--text-primary)">' + (s.tech_level || 0) + '</strong></span>' +
          '<span>🌾 食物: <strong style="color:var(--color-success)">' + (s.resources && s.resources.food || 0) + '</strong></span>' +
          '<span>🪵 木材: <strong style="color:var(--era-agriculture)">' + (s.resources && s.resources.wood || 0) + '</strong></span>' +
          '<span>⛏️ 矿石: <strong style="color:var(--text-muted)">' + (s.resources && s.resources.ore || 0) + '</strong></span>';
        card.appendChild(body);

        this.settlementsList.appendChild(card);
      }
    }

    renderInterventionPanel(world) {
      var auth = window.AuthManager && window.AuthManager._instance;
      var isLoggedIn = auth && auth.isLoggedIn();

      if (!isLoggedIn) {
        if (this.interveneEmpty) {
          this.interveneEmpty.style.display = 'flex';
          this.interveneEmpty.querySelector('.empty-state-text').textContent = '登录后即可干预';
        }
        if (this.interveneContent) this.interveneContent.style.display = 'none';
        return;
      }

      var quota = this._getInterventionQuota(world);
      if (quota <= 0) {
        if (this.interveneEmpty) {
          this.interveneEmpty.style.display = 'flex';
          this.interveneEmpty.querySelector('.empty-state-text').textContent = '本周干预次数已用完';
        }
        if (this.interveneContent) this.interveneContent.style.display = 'none';
        return;
      }

      if (this.interveneEmpty) this.interveneEmpty.style.display = 'none';
      if (this.interveneContent) this.interveneContent.style.display = 'block';
      if (this.interveneRemaining) this.interveneRemaining.textContent = quota;

      if (this.interveneTargetSelect) {
        this.interveneTargetSelect.innerHTML = '<option value="">选择聚落...</option>';
        var settlements = world.settlements || [];
        for (var i = 0; i < settlements.length; i++) {
          var opt = document.createElement('option');
          opt.value = settlements[i].id || '';
          opt.textContent = settlements[i].name || '';
          this.interveneTargetSelect.appendChild(opt);
        }
      }
    }

    _getInterventionQuota(world) {
      var key = 'interventions_used_' + world.world_id;
      try {
        var used = parseInt(localStorage.getItem(key) || '0', 10);
        var max = 3;
        if (world.config && world.config.creator_limit) {
          max = world.config.creator_limit === 'unlimited' ? 999 : parseInt(world.config.creator_limit, 10) || 3;
        }
        return Math.max(0, max - used);
      } catch (e) {
        return 3;
      }
    }

    _openInterveneModal() {
      var world = this.worldData;
      if (!world) return;

      var modal = window.Modal;
      if (!modal) {
        var m = new (window.ModalClass || Object)();
        if (m && m.show) {
          m.show({
            title: '执行干预',
            bodyId: 'world-intervene-modal-body',
            footer: '<button class="btn btn-primary" id="confirm-intervene">确认干预</button>'
          });
        }
        return;
      }

      var modalBody = document.getElementById('world-intervene-modal-body');
      var bodyHtml = modalBody ? modalBody.innerHTML : '';

      var footerHtml = '<button class="btn btn-secondary" data-action="modal-close">取消</button>' +
        '<button class="btn btn-primary" id="confirm-intervene">确认干预</button>';

      modal.show({
        title: '执行干预',
        body: bodyHtml,
        footer: footerHtml
      });

      var self = this;

      var selectedType = null;
      var typeBtns = document.querySelectorAll('.intervention-type-btn');
      for (var i = 0; i < typeBtns.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            for (var j = 0; j < typeBtns.length; j++) typeBtns[j].classList.remove('selected');
            btn.classList.add('selected');
            selectedType = btn.getAttribute('data-type');
          });
        })(typeBtns[i]);
      }

      var targetSelect = document.getElementById('intervene-target-select');
      if (targetSelect) {
        targetSelect.innerHTML = '<option value="">选择聚落...</option>';
        var settlements = world.settlements || [];
        for (var i = 0; i < settlements.length; i++) {
          var opt = document.createElement('option');
          opt.value = settlements[i].id || '';
          opt.textContent = settlements[i].name || '';
          targetSelect.appendChild(opt);
        }
      }

      var confirmBtn = document.getElementById('confirm-intervene');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
          if (!selectedType) {
            window.Toast.warning('请选择干预类型');
            return;
          }
          if (!targetSelect || !targetSelect.value) {
            window.Toast.warning('请选择目标聚落');
            return;
          }
          self._submitIntervention(selectedType, targetSelect.value);
          modal.hide();
        });
      }
    }

    _submitIntervention(type, targetSettlementId) {
      var world = this.worldData;
      if (!world) return;

      var key = 'interventions_used_' + world.world_id;
      var used = 0;
      try {
        used = parseInt(localStorage.getItem(key) || '0', 10);
      } catch (e) {}
      used++;
      try {
        localStorage.setItem(key, String(used));
      } catch (e) {}

      var quota = this._getInterventionQuota(world);
      if (this.interveneRemaining) this.interveneRemaining.textContent = quota;

      var settlementName = '';
      var settlements = world.settlements || [];
      for (var i = 0; i < settlements.length; i++) {
        if (settlements[i].id === targetSettlementId) {
          settlementName = settlements[i].name;
          break;
        }
      }

      var typeMap = {
        bless: '降下恩赐', plague: '降下灾祸', discover: '引导探索',
        enlighten: '启迪智慧', shelter: '庇护之地', sow: '播种文明'
      };
      var typeLabel = typeMap[type] || type;

      window.Toast.success('干预已提交：' + typeLabel + ' → ' + (settlementName || targetSettlementId));

      if (quota <= 0) {
        if (this.interveneEmpty) {
          this.interveneEmpty.style.display = 'flex';
          this.interveneEmpty.querySelector('.empty-state-text').textContent = '本周干预次数已用完';
        }
        if (this.interveneContent) this.interveneContent.style.display = 'none';
      }
    }

    onLikeToggle() {
      var auth = window.AuthManager && window.AuthManager._instance;
      if (!auth || !auth.isLoggedIn()) {
        window.Toast.warning('请先登录后点赞');
        return;
      }

      if (!this.likeBtn || !this.worldData) return;
      var nowLiked = this.likeBtn.classList.toggle('liked');
      this.likeBtn.setAttribute('data-tooltip', nowLiked ? '取消点赞' : '点赞');

      var key = 'liked_' + this.worldData.world_id;
      if (nowLiked) {
        localStorage.setItem(key, '1');
      } else {
        localStorage.removeItem(key);
      }

      var count = (this.worldData.likes || 0) + (nowLiked ? 1 : -1);
      this.worldData.likes = Math.max(0, count);
    }

    onShare() {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          window.Toast.info('链接已复制');
        }).catch(function () {
          this._fallbackCopy(url);
        }.bind(this));
      } else {
        this._fallbackCopy(url);
      }
    }

    _fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        window.Toast.info('链接已复制');
      } catch (e) {
        window.Toast.error('复制失败，请手动复制链接');
      }
      document.body.removeChild(ta);
    }

    _switchTab(tab) {
      var tabs = this.appEl && this.appEl.querySelectorAll('.tab-item[data-tab]');
      if (tabs) {
        for (var i = 0; i < tabs.length; i++) {
          tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
        }
      }

      var contents = this.appEl && this.appEl.querySelectorAll('.tab-content');
      if (contents) {
        for (var j = 0; j < contents.length; j++) {
          var id = contents[j].getAttribute('id');
          contents[j].classList.toggle('active', id === 'tab-' + tab);
        }
      }
    }

    _showLoading(show) {
      if (!this.appEl) return;
      var loading = this.appEl.querySelector('.loading-container');
      if (show) {
        if (!loading) {
          var div = document.createElement('div');
          div.className = 'loading-container';
          div.innerHTML = '<div class="spinner spinner-lg"></div><div class="loading-text">世界数据加载中...</div>';
          this.appEl.insertBefore(div, this.appEl.firstChild);
        }
      } else {
        if (loading) loading.remove();
      }
    }

    _showError(msg) {
      if (!this.appEl) return;
      this.appEl.innerHTML =
        '<div class="page" style="padding-top:80px;text-align:center;">' +
        '<div style="font-size:48px;margin-bottom:16px;opacity:0.5;">🌌</div>' +
        '<div style="color:var(--text-muted);font-size:14px;margin-bottom:16px;">' + (msg || '世界不存在') + '</div>' +
        '<button class="btn btn-primary" onclick="window.location.hash=\'#/\'">返回首页</button>' +
        '</div>';
    }

    destroy() {
      if (this._animFrame) cancelAnimationFrame(this._animFrame);
      this._bound = {};
      this.worldData = null;
    }
  }

  window.WorldDetailPage = WorldDetailPage;
})();
