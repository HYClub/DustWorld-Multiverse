(function () {
  'use strict';

  var TECH_NAMES = ['原始','农耕','青铜','铁器','蒸汽','电力','信息'];
  var LEVEL_NAMES = ['营地','村落','城镇','城市','大都会','核心城','巨型城市'];

  class WorldDetailPage {
    constructor() {
      this.worldId = null;
      this.worldData = null;
      this.engine = null;
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
      this.worldEraBadge = document.getElementById('world-era-badge');
      this.civName = document.getElementById('civ-name');
      this.civLeader = document.getElementById('civ-leader');
      this.civEra = document.getElementById('civ-era');
      this.civYear = document.getElementById('civ-year');
      this.civLegacy = document.getElementById('civ-legacy');
      this.statSettlements = document.getElementById('stat-settlements');
      this.statPopulation = document.getElementById('stat-population');
      this.statWars = document.getElementById('stat-wars');
      this.statTech = document.getElementById('stat-tech');
      this.statEvents = document.getElementById('stat-events');
      this.settlementRows = document.getElementById('settlement-rows');
      this.activeEventsList = document.getElementById('active-events-list');
      this.timelineList = document.getElementById('timeline-list');
      this.notificationsList = document.getElementById('notifications-list');
      this.timelineEraFilter = document.getElementById('timeline-era-filter');
      this.timelineTypeFilter = document.getElementById('timeline-type-filter');
      this.interveneEmpty = document.getElementById('intervene-empty');
      this.interveneContent = document.getElementById('intervene-content');
      this.interveneRemaining = document.getElementById('intervene-remaining');
      this.openInterveneBtn = document.getElementById('open-intervene-modal');
      this.likeBtn = document.getElementById('world-like-btn');
      this.likeCount = document.querySelector('.like-count');
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
        var hasApi = dm && typeof dm.getWorld === 'function';
        var world;

        if (hasApi) world = await dm.getWorld(worldId);
        if (!world) {
          this._showError('世界不存在');
          return;
        }

        this.worldData = world;
        this._showLoading(false);

        // Initialize engine from existing state
        this.engine = new window.WorldEngine(world.config || {}, world);
        this.engine._initialized = true;
        this._renderAll();
      } catch (err) {
        console.error('loadWorldData error:', err);
        this._showError('加载世界数据失败');
      }
    }

    _renderAll() {
      var w = this.worldData;
      this.renderWorldHeader(w);
      this.renderCivilizationPanel(w);
      this.renderLegacyBar(w);
      this.renderStats(w);
      this.renderSettlementTable(w);
      this.renderActiveEvents(w);
      this.renderTimeline(w.history || []);
      this.renderNotifications(w);
      this.renderInterventionPanel(w);
    }

    renderWorldHeader(world) {
      if (this.worldNameEl) this.worldNameEl.textContent = world.name || '未知世界';
      if (this.worldEraBadge) {
        var era = world.era || 'antiquity';
        var eraNames = { antiquity: '古典时代', exploration: '探索时代', modern: '现代时代' };
        this.worldEraBadge.textContent = eraNames[era] || era;
        this.worldEraBadge.setAttribute('data-era', era);
      }
      if (this.likeBtn) {
        var auth = window.AuthManager && window.AuthManager._instance;
        var user = auth && auth.getUser && auth.getUser();
        var username = user && (user.login || user.name);
        var isLiked = username && world.liked_by && world.liked_by.indexOf(username) !== -1;
        this.likeBtn.classList.toggle('liked', isLiked);
      }
      if (this.likeCount) this.likeCount.textContent = world.likes || 0;
    }

    renderCivilizationPanel(world) {
      if (!world.civilization) {
        if (this.civName) this.civName.textContent = '无';
        return;
      }
      // Get current era's civ
      var activeCiv = world.active_civ || null;
      var era = world.era || 'antiquity';
      var civInfo = world.civilization[era];
      if (civInfo && civInfo.data) {
        if (this.civName) this.civName.textContent = civInfo.data.name;
        if (this.civLeader) this.civLeader.textContent = '👑 ' + (civInfo.data.leader_name || '未知元首');
      } else if (civInfo) {
        if (this.civName) this.civName.textContent = civInfo.civ || '—';
        if (this.civLeader) this.civLeader.textContent = civInfo.leader || '—';
      } else if (activeCiv) {
        if (this.civName) this.civName.textContent = activeCiv.name || '—';
        if (this.civLeader) this.civLeader.textContent = '👑 ' + (activeCiv.leader_name || '—');
      }
      if (this.civEra) this.civEra.textContent = era;
      if (this.civYear) this.civYear.textContent = world.year || 0;
      if (this.civLegacy) {
        var total = 0;
        if (world.legacy) {
          total = (world.legacy.military || 0) + (world.legacy.economic || 0) +
                  (world.legacy.cultural || 0) + (world.legacy.scientific || 0);
        }
        this.civLegacy.textContent = Math.round(total);
      }
    }

    renderLegacyBar(world) {
      if (!world.legacy) return;
      var maxVal = Math.max(1, world.legacy.military || 0, world.legacy.economic || 0,
        world.legacy.cultural || 0, world.legacy.scientific || 0);
      var setLegacy = function(id, valId, value) {
        var bar = document.getElementById(id);
        var val = document.getElementById(valId);
        if (bar) bar.style.width = Math.min(100, (value || 0) / maxVal * 100) + '%';
        if (val) val.textContent = Math.round(value || 0);
      };
      setLegacy('legacy-military', 'legacy-military-val', world.legacy.military);
      setLegacy('legacy-economic', 'legacy-economic-val', world.legacy.economic);
      setLegacy('legacy-cultural', 'legacy-cultural-val', world.legacy.cultural);
      setLegacy('legacy-scientific', 'legacy-scientific-val', world.legacy.scientific);
    }

    renderStats(world) {
      var stats = world.stats || {};
      if (this.statSettlements) this.statSettlements.textContent = stats.total_settlements || 0;
      if (this.statPopulation) this.statPopulation.textContent = stats.total_population || 0;
      if (this.statWars) this.statWars.textContent = stats.total_wars || 0;
      if (this.statTech) this.statTech.textContent = stats.tech_breakthroughs || 0;
      if (this.statEvents) this.statEvents.textContent = (world.active_events || []).length;
    }

    renderSettlementTable(world) {
      if (!this.settlementRows) return;
      this.settlementRows.innerHTML = '';
      var settlements = world.settlements || [];
      if (settlements.length === 0) {
        this.settlementRows.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px;text-align:center;">暂无聚落</div>';
        return;
      }
      settlements.forEach(function(s) {
        var row = document.createElement('div');
        row.className = 'settlement-row';
        var level = Math.min(s.level || 1, 7) - 1;
        var statusColor = '#8888aa';
        if (s.status === '繁荣') statusColor = '#00b894';
        else if (s.status === '发展') statusColor = '#fdcb6e';
        else if (s.status === '衰落') statusColor = '#e17055';
        row.innerHTML =
          '<span class="s-col-name"><strong>' + (s.name || '未命名') + '</strong></span>' +
          '<span class="s-col-level">' + LEVEL_NAMES[level] + '</span>' +
          '<span class="s-col-pop">' + (s.population || 0) + '</span>' +
          '<span class="s-col-tech">' + TECH_NAMES[Math.min(s.tech_level || 0, 6)] + '</span>' +
          '<span class="s-col-status" style="color:' + statusColor + '">' + (s.status || '未知') + '</span>';
        this.settlementRows.appendChild(row);
      }, this);
    }

    renderActiveEvents(world) {
      if (!this.activeEventsList) return;
      this.activeEventsList.innerHTML = '';
      var events = world.active_events || [];
      if (events.length === 0) {
        this.activeEventsList.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">暂无进行中的事件</div>';
        return;
      }
      events.forEach(function(evt) {
        var item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML =
          '<div class="event-year">剩余 ' + (evt.remaining_years || 0) + ' 年</div>' +
          '<div class="event-text">' + (evt.description || evt.type) + '</div>';
        this.activeEventsList.appendChild(item);
      }, this);
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

      var eraYears = { antiquity: [0, 300], exploration: [300, 600], modern: [600, Infinity] };
      var filtered = events.filter(function(e) {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (eraFilter !== 'all') {
          var range = eraYears[eraFilter];
          if (range) {
            var y = e.year || 0;
            if (y < range[0] || y >= range[1]) return false;
          }
        }
        return true;
      });
      filtered.sort(function(a, b) { return (a.year || 0) - (b.year || 0); });

      this.timelineList.innerHTML = '';
      if (filtered.length === 0) {
        this.timelineList.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center;">没有匹配的记录</div>';
        return;
      }
      // Show last 50 events
      var show = filtered.slice(-50);
      show.forEach(function(evt) {
        var item = document.createElement('div');
        item.className = 'event-item';
        var typeClass = '';
        if (evt.type === 'war' || evt.type === 'natural_disaster') typeClass = 'disaster';
        else if (evt.type === 'tech' || evt.type === 'tech_breakthrough') typeClass = 'breakthrough';
        else if (evt.type === 'milestone') typeClass = 'culture';
        else if (evt.type === 'settlement') typeClass = 'culture';
        if (typeClass) item.classList.add(typeClass);
        item.innerHTML =
          '<div class="event-year">第 ' + (evt.year || 0) + ' 年</div>' +
          '<div class="event-text">' + (evt.title ? '<strong>' + evt.title + ':</strong> ' : '') + (evt.description || '') + '</div>';
        this.timelineList.appendChild(item);
      }, this);
    }

    renderNotifications(world) {
      if (!this.notificationsList) return;
      var history = world.history || [];
      var recent = history.slice(-10).reverse();
      if (recent.length === 0) {
        this.notificationsList.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center;">暂无通知</div>';
        return;
      }
      this.notificationsList.innerHTML = '';
      recent.forEach(function(evt) {
        var item = document.createElement('div');
        item.className = 'event-item';
        if (evt.type === 'milestone') item.classList.add('culture');
        else if (evt.type === 'tech') item.classList.add('breakthrough');
        else if (evt.type === 'war') item.classList.add('disaster');
        item.innerHTML =
          '<div class="event-year">第 ' + (evt.year || 0) + ' 年</div>' +
          '<div class="event-text"><strong>' + (evt.title || '') + '</strong> ' + (evt.description || '') + '</div>';
        this.notificationsList.appendChild(item);
      }, this);
    }

    renderInterventionPanel(world) {
      var auth = window.AuthManager && window.AuthManager._instance;
      var isLoggedIn = auth && auth.isLoggedIn();
      if (!isLoggedIn) {
        if (this.interveneEmpty) { this.interveneEmpty.style.display = 'flex'; }
        if (this.interveneContent) this.interveneContent.style.display = 'none';
        return;
      }
      var quota = this._getInterventionQuota(world);
      if (quota <= 0) {
        if (this.interveneEmpty) { this.interveneEmpty.style.display = 'flex';
          this.interveneEmpty.querySelector('.empty-state-text').textContent = '本周干预次数已用完'; }
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
        return Math.max(0, 3 - used);
      } catch (e) { return 3; }
    }

    _openInterveneModal() {
      var world = this.worldData;
      if (!world) return;
      var modal = window.Modal;
      if (!modal) return;
      var modalBody = document.getElementById('world-intervene-modal-body');
      var bodyHtml = modalBody ? modalBody.innerHTML : '';
      var footerHtml = '<button class="btn btn-secondary" data-action="modal-close">取消</button>' +
        '<button class="btn btn-primary" id="confirm-intervene">确认干预</button>';
      modal.show({ title: '执行干预', body: bodyHtml, footer: footerHtml });

      var selectedType = null;
      var typeBtns = document.querySelectorAll('.intervention-type-btn');
      typeBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          typeBtns.forEach(function(b) { b.classList.remove('selected'); });
          btn.classList.add('selected');
          selectedType = btn.getAttribute('data-type');
        });
      });

      var targetSelect = document.getElementById('intervene-target-select');
      if (targetSelect) {
        targetSelect.innerHTML = '<option value="">选择聚落...</option>';
        var settlements = world.settlements || [];
        settlements.forEach(function(s) {
          var opt = document.createElement('option');
          opt.value = s.id || '';
          opt.textContent = s.name || '';
          targetSelect.appendChild(opt);
        });
      }
      var confirmBtn = document.getElementById('confirm-intervene');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
          if (!selectedType) { window.Toast.warning('请选择干预类型'); return; }
          if (!targetSelect || !targetSelect.value) { window.Toast.warning('请选择目标聚落'); return; }
          self._submitIntervention(selectedType, targetSelect.value);
          modal.hide();
        });
      }
    }

    _submitIntervention(type, targetSettlementId) {
      var world = this.worldData;
      if (!world) return;
      var settlementName = '';
      (world.settlements || []).forEach(function(s) {
        if (s.id === targetSettlementId) settlementName = s.name;
      });
      var typeMap = { bless: '降下恩赐', plague: '降下灾祸', discover: '引导探索',
        enlighten: '启迪智慧', shelter: '庇护之地', sow: '播种文明' };
      var self = this;

      var recordLocally = function () {
        var key = 'interventions_used_' + world.world_id;
        var used = 0;
        try { used = parseInt(localStorage.getItem(key) || '0', 10); } catch(e) {}
        used++;
        try { localStorage.setItem(key, String(used)); } catch(e) {}
        var quota = Math.max(0, 3 - used);
        if (self.interveneRemaining) self.interveneRemaining.textContent = quota;
        window.Toast.success('干预已提交：' + (typeMap[type] || type) + ' → ' + (settlementName || targetSettlementId));
        if (quota <= 0) {
          if (self.interveneEmpty) { self.interveneEmpty.style.display = 'flex';
            self.interveneEmpty.querySelector('.empty-state-text').textContent = '本周干预次数已用完'; }
          if (self.interveneContent) self.interveneContent.style.display = 'none';
        }
      };

      var dm = window.DataManager;
      if (dm && typeof dm.submitIntervention === 'function') {
        dm.submitIntervention(world.world_id, { type: type, target: targetSettlementId, settlementName: settlementName }).then(recordLocally).catch(function () {
          recordLocally();
        });
      } else {
        recordLocally();
      }
    }

    onLikeToggle() {
      var auth = window.AuthManager && window.AuthManager._instance;
      if (!auth || !auth.isLoggedIn()) { window.Toast.warning('请先登录后点赞'); return; }
      if (!this.likeBtn || !this.worldData) return;
      var self = this;
      var dm = window.DataManager;
      if (dm && typeof dm.toggleLike === 'function') {
        dm.toggleLike(this.worldData.world_id).then(function (result) {
          self.likeBtn.classList.toggle('liked', result.liked);
          if (self.likeCount) self.likeCount.textContent = result.likes;
          if (self.worldData) self.worldData.likes = result.likes;
        }).catch(function () {
          window.Toast.error('点赞失败');
        });
      }
    }

    onShare() {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() { window.Toast.info('链接已复制'); }).catch(function() {
          this._fallbackCopy(url);
        }.bind(this));
      } else { this._fallbackCopy(url); }
    }

    _fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); window.Toast.info('链接已复制'); } catch(e) { window.Toast.error('复制失败'); }
      document.body.removeChild(ta);
    }

    _switchTab(tab) {
      var tabs = this.appEl && this.appEl.querySelectorAll('.tab-item[data-tab]');
      if (tabs) {
        tabs.forEach(function(t) { t.classList.toggle('active', t.getAttribute('data-tab') === tab); });
      }
      var contents = this.appEl && this.appEl.querySelectorAll('.tab-content');
      if (contents) {
        contents.forEach(function(c) { c.classList.toggle('active', c.getAttribute('id') === 'tab-' + tab); });
      }
    }

    _showLoading(show) {
      if (!this.appEl) return;
      var loading = this.appEl.querySelector('.loading-container');
      if (show) {
        if (!loading) {
          var div = document.createElement('div');
          div.className = 'loading-container';
          div.innerHTML = '<div class="spinner spinner-lg"></div><div class="loading-text">加载世界数据...</div>';
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
        '<button class="btn btn-primary" onclick="window.location.hash=\'#/\'">返回首页</button></div>';
    }

    destroy() {
      this._bound = {};
      this.worldData = null;
    }
  }

  window.WorldDetailPage = WorldDetailPage;
})();
