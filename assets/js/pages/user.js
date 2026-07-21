(function () {
  'use strict';

  class UserPage {
    constructor() {
      this.activeTab = 'my-worlds';
      this._bound = {};
    }

    init() {
      this.appEl = document.getElementById('app');

      var auth = window.AuthManager && window.AuthManager._instance;
      this.isLoggedIn = auth && auth.isLoggedIn();

      if (!this.isLoggedIn) {
        this._showNotLoggedIn();
        return;
      }

      this._cacheElements();
      this._bindEvents();
      this._loadProfile();
    }

    _cacheElements() {
      this.userName = document.getElementById('user-name');
      this.userAvatarImg = document.getElementById('user-avatar-img');
      this.userAvatarPlaceholder = document.getElementById('user-avatar-placeholder');
      this.createdCount = document.getElementById('user-created-count');
      this.likedCount = document.getElementById('user-liked-count');
      this.myWorldsGrid = document.getElementById('my-worlds-grid');
      this.myWorldsEmpty = document.getElementById('my-worlds-empty');
      this.likedWorldsGrid = document.getElementById('liked-worlds-grid');
      this.likedWorldsEmpty = document.getElementById('liked-worlds-empty');
      this.interventionList = document.getElementById('intervention-history-list');
      this.interventionsEmpty = document.getElementById('interventions-empty');
    }

    _bindEvents() {
      var self = this;

      var createCard = document.getElementById('create-new-world-card');
      if (createCard) {
        createCard.addEventListener('click', function () {
          window.location.hash = '#/create';
        });
      }

      var tabItems = this.appEl && this.appEl.querySelectorAll('.tab-item[data-tab]');
      if (tabItems) {
        for (var i = 0; i < tabItems.length; i++) {
          (function (tab) {
            tab.addEventListener('click', function () {
              var tabName = tab.getAttribute('data-tab');
              self.switchTab(tabName);
            });
          })(tabItems[i]);
        }
      }

      var backBtn = this.appEl && this.appEl.querySelector('[data-action="back"]');
      if (backBtn) {
        backBtn.addEventListener('click', function () { window.history.back(); });
      }

      var navigateBtns = this.appEl && this.appEl.querySelectorAll('[data-action="navigate"]');
      if (navigateBtns) {
        for (var ni = 0; ni < navigateBtns.length; ni++) {
          (function (btn) {
            btn.addEventListener('click', function () {
              var page = btn.getAttribute('data-page');
              if (page) window.location.hash = '#/' + page;
            });
          })(navigateBtns[ni]);
        }
      }
    }

    _loadProfile() {
      var user = null;
      var auth = window.AuthManager && window.AuthManager._instance;
      if (auth && typeof auth.getUser === 'function') {
        user = auth.getUser();
      }

      if (user) {
        this.renderProfile(user);
        this.loadCreatedWorlds();
        this.loadLikedWorlds();
        this.loadInterventionHistory();
      } else {
        if (this.userName) this.userName.textContent = '未知用户';
        if (this.userAvatarPlaceholder) {
          this.userAvatarPlaceholder.textContent = '?';
          this.userAvatarPlaceholder.style.display = 'flex';
        }
        if (this.userAvatarImg) this.userAvatarImg.style.display = 'none';
      }
    }

    renderProfile(user) {
      var displayName = user.login || user.name || user.username || '未知用户';
      if (this.userName) this.userName.textContent = displayName;

      if (user.avatar_url && this.userAvatarImg) {
        this.userAvatarImg.src = user.avatar_url;
        this.userAvatarImg.style.display = 'block';
        if (this.userAvatarPlaceholder) this.userAvatarPlaceholder.style.display = 'none';
      } else if (this.userAvatarPlaceholder) {
        this.userAvatarPlaceholder.textContent = (displayName || '?')[0].toUpperCase();
        this.userAvatarPlaceholder.style.display = 'flex';
        if (this.userAvatarImg) this.userAvatarImg.style.display = 'none';
      }
    }

    _tryTriggerEvo(worlds) {
      var SECONDS_PER_YEAR = 864;
      var now = Date.now();
      for (var i = 0; i < worlds.length; i++) {
        var w = worlds[i];
        var lastEvo = w.lastEvolvedAt ? new Date(w.lastEvolvedAt).getTime() : null;
        if (lastEvo && (now - lastEvo) / 1000 > SECONDS_PER_YEAR + 120) {
          var dm = window.DataManager;
          if (dm && typeof dm.triggerEvolution === 'function') {
            dm.triggerEvolution();
          }
          break;
        }
      }
    }

    async loadCreatedWorlds() {
      var worlds = [];

      try {
        var dm = window.DataManager;
        if (dm && typeof dm.getUserWorlds === 'function') {
          worlds = await dm.getUserWorlds();
        }
      } catch (e) {
        console.warn('loadCreatedWorlds error, falling back to demo', e);
      }

      this._tryTriggerEvo(worlds);

      if (this.createdCount) this.createdCount.textContent = worlds.length;

      if (!worlds || worlds.length === 0) {
        if (this.myWorldsGrid) this.myWorldsGrid.style.display = 'none';
        if (this.myWorldsEmpty) this.myWorldsEmpty.style.display = 'flex';
        return;
      }

      if (this.myWorldsEmpty) this.myWorldsEmpty.style.display = 'none';
      if (this.myWorldsGrid) this.myWorldsGrid.style.display = '';

      var createCard = this.myWorldsGrid && this.myWorldsGrid.querySelector('.world-card-create');
      if (createCard) createCard.remove();

      var self = this;
      for (var k = 0; k < worlds.length; k++) {
        var card = this._createWorldCardElement(worlds[k]);
        var wrapper = document.createElement('div');
        wrapper.className = 'world-card-wrapper';
        wrapper.appendChild(card);
        // Delete button
        var delBtn = document.createElement('button');
        delBtn.className = 'world-card-delete-btn';
        delBtn.textContent = '✕';
        delBtn.title = '毁灭世界';
        (function (w) {
          delBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self._confirmDeleteWorld(w);
          });
        })(worlds[k]);
        wrapper.appendChild(delBtn);
        if (this.myWorldsGrid) this.myWorldsGrid.appendChild(wrapper);
      }

      var newCard = document.createElement('div');
      newCard.className = 'world-card-create';
      newCard.innerHTML = '<div class="world-card-create-icon">+</div><div class="world-card-create-text">创建新世界</div>';
      newCard.addEventListener('click', function () { window.location.hash = '#/create'; });
      if (this.myWorldsGrid) this.myWorldsGrid.appendChild(newCard);
    }

    async loadLikedWorlds() {
      var worlds = [];

      try {
        var dm = window.DataManager;
        if (dm && typeof dm.getLikedWorlds === 'function') {
          worlds = await dm.getLikedWorlds();
        }
      } catch (e) {
        console.warn('loadLikedWorlds error, falling back to demo', e);
      }

      if (this.likedCount) this.likedCount.textContent = worlds.length;

      if (!worlds || worlds.length === 0) {
        if (this.likedWorldsGrid) this.likedWorldsGrid.style.display = 'none';
        if (this.likedWorldsEmpty) this.likedWorldsEmpty.style.display = 'flex';
        return;
      }

      if (this.likedWorldsEmpty) this.likedWorldsEmpty.style.display = 'none';
      if (this.likedWorldsGrid) this.likedWorldsGrid.style.display = '';

      for (var k = 0; k < worlds.length; k++) {
        var card = this._createWorldCardElement(worlds[k]);
        if (this.likedWorldsGrid) this.likedWorldsGrid.appendChild(card);
      }
    }

    async loadInterventionHistory() {
      var interventions = [];

      try {
        var dm = window.DataManager;
        if (dm && typeof dm.getInterventions === 'function') {
          interventions = await dm.getInterventions();
        }
      } catch (e) {
        console.warn('loadInterventions error, falling back to demo', e);
      }

      if (!interventions || interventions.length === 0) {
        if (this.interventionList) this.interventionList.style.display = 'none';
        if (this.interventionsEmpty) this.interventionsEmpty.style.display = 'flex';
        return;
      }

      if (this.interventionsEmpty) this.interventionsEmpty.style.display = 'none';
      if (this.interventionList) this.interventionList.style.display = '';

      var icons = {
        bless: '🌿', plague: '⚡', discover: '🔍',
        enlighten: '💡', shelter: '🛡️', sow: '🌱'
      };
      var labels = {
        bless: '降下恩赐', plague: '降下灾祸', discover: '引导探索',
        enlighten: '启迪智慧', shelter: '庇护之地', sow: '播种文明'
      };
      var statusLabels = { pending: '待执行', executed: '已执行', failed: '失败' };

      for (var i = 0; i < interventions.length; i++) {
        var inv = interventions[i];
        var item = document.createElement('div');
        item.className = 'intervention-history-item';

        var iconEl = document.createElement('div');
        iconEl.className = 'intervention-history-icon ' + (inv.type || '');
        iconEl.textContent = icons[inv.type] || '🔮';
        item.appendChild(iconEl);

        var contentEl = document.createElement('div');
        contentEl.className = 'intervention-history-content';

        var titleEl = document.createElement('div');
        titleEl.className = 'intervention-history-title';
        titleEl.textContent = (labels[inv.type] || inv.type || '未知干预') + ' → ' + (inv.target_settlement || inv.target_world || '—');
        contentEl.appendChild(titleEl);

        var metaEl = document.createElement('div');
        metaEl.className = 'intervention-history-meta';

        var dateSpan = document.createElement('span');
        var d = new Date(inv.timestamp || Date.now());
        dateSpan.textContent = d.toLocaleString('zh-CN');
        metaEl.appendChild(dateSpan);

        var statusSpan = document.createElement('span');
        statusSpan.className = 'intervention-history-status ' + (inv.status || 'pending');
        statusSpan.textContent = statusLabels[inv.status] || inv.status || '未知';
        metaEl.appendChild(statusSpan);

        contentEl.appendChild(metaEl);
        item.appendChild(contentEl);

        if (this.interventionList) this.interventionList.appendChild(item);
      }
    }

    _createWorldCardElement(world) {
      return window.helpers.createWorldCard(world);
    }

    switchTab(tab) {
      if (tab === this.activeTab) return;
      this.activeTab = tab;

      var tabItems = this.appEl && this.appEl.querySelectorAll('.tab-item[data-tab]');
      if (tabItems) {
        for (var i = 0; i < tabItems.length; i++) {
          tabItems[i].classList.toggle('active', tabItems[i].getAttribute('data-tab') === tab);
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

    _showNotLoggedIn() {
      if (!this.appEl) return;
      this.appEl.innerHTML =
        '<div class="page" style="padding-top:80px;text-align:center;">' +
        '<div style="font-size:48px;margin-bottom:16px;opacity:0.5;">🔒</div>' +
        '<div style="color:var(--text-muted);font-size:14px;margin-bottom:var(--spacing-lg);">请先登录</div>' +
        '<button class="btn btn-primary" id="user-login-btn">登录 GitHub</button>' +
        '</div>';

      var loginBtn = document.getElementById('user-login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', function () {
          var auth = window.AuthManager && window.AuthManager._instance;
          if (auth && typeof auth.login === 'function') {
            auth.login();
          } else {
            window.location.hash = '#/';
          }
        });
      }
    }

    _confirmDeleteWorld(world) {
      var self = this;
      var dm = window.DataManager;
      if (!dm || typeof dm.getWorld !== 'function') { window.Toast.error('数据服务不可用'); return; }

      dm.getWorld(world.world_id).then(function (fullState) {
        if (!fullState) { window.Toast.error('无法读取世界数据'); return; }

        var name = fullState.name || world.name || '未知世界';
        var year = fullState.year || 0;
        var era = fullState.era || 'primitive';
        var eraName = ({ antiquity: '古典', exploration: '探索', modern: '现代' })[era] || era;
        var pop = fullState.stats ? fullState.stats.total_population : 0;
        var setts = fullState.settlements ? fullState.settlements.length : 0;
        var wars = fullState.stats ? fullState.stats.total_wars : 0;
        var techs = fullState.stats ? fullState.stats.tech_breakthroughs : 0;
        var historyCount = fullState.history ? fullState.history.length : 0;
        var extinct = fullState.stats ? fullState.stats.extinct_settlements : 0;
        var created = fullState.created_at ? new Date(fullState.created_at).toLocaleString('zh-CN') : '未知';
        var destroyed = new Date().toLocaleString('zh-CN');

        var summary =
          '<div style="text-align:left;font-size:14px;line-height:1.8;">' +
          '<p style="font-size:18px;font-weight:700;text-align:center;margin-bottom:12px;color:var(--color-danger);">⚠️ 即将毁灭 ' + name + '</p>' +
          '<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:12px;margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">时代</span><span>' + eraName + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">年份</span><span>' + year + '年</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">总人口</span><span>' + (window.helpers.formatNumber ? window.helpers.formatNumber(pop) : pop) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">聚落</span><span>' + setts + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">战争</span><span>' + wars + ' 次</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">科技突破</span><span>' + techs + ' 项</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">灭绝聚落</span><span>' + extinct + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">编年史条目</span><span>' + historyCount + ' 条</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:var(--text-muted);">创世时间</span><span>' + created + '</span></div>' +
          '</div>' +
          '<p style="text-align:center;color:var(--color-danger);font-size:15px;font-weight:600;padding:8px;">因高维度未知力量 于 ' + destroyed + ' 被毁灭</p>' +
          '<p style="text-align:center;color:var(--text-muted);font-size:12px;">此操作不可撤销</p>' +
          '</div>';

        var modal = window.Modal.show({
          title: '确认毁灭',
          content: summary,
          confirmText: '确认毁灭',
          cancelText: '取消',
          width: '480px'
        });

        modal.onConfirm(function () {
          var destEvent = {
            year: fullState.year || 0,
            type: 'milestone',
            title: '世界末日',
            description: '因高维度未知力量于 ' + destroyed + ' 被毁灭。'
          };
          if (!fullState.history) fullState.history = [];
          fullState.history.push(destEvent);
          fullState.updated_at = new Date().toISOString();
          // Write final state and delete files in one API call chain
          // First get the SHA, then update with final entry, then delete both files
          var statePath = 'data/worlds/' + world.world_id + '/state.json';
          var configPath = 'data/worlds/' + world.world_id + '/config.json';
          var api = dm.api;
          api._getFileSha(statePath).then(function (sha) {
            return api._putFile(statePath,
              api._encodeContent(JSON.stringify(fullState, null, 2)),
              '世界末日: ' + name, sha);
          }).then(function () {
            return api._getFileSha(statePath);
          }).then(function (sha) {
            return api._deleteFile(statePath, sha, '毁灭世界: ' + name);
          }).then(function () {
            return api._getFileSha(configPath);
          }).then(function (sha) {
            if (sha) return api._deleteFile(configPath, sha, '毁灭世界: ' + name);
          }).then(function () {
            dm.invalidateCache('worldList');
            dm.invalidateCache('world_' + world.world_id);
            window.Toast.success('世界「' + name + '」已毁灭', 4000);
            if (self.myWorldsGrid) {
              self.myWorldsGrid.innerHTML = '';
              var createCard = document.createElement('div');
              createCard.className = 'world-card-create';
              createCard.innerHTML = '<div class="world-card-create-icon">+</div><div class="world-card-create-text">创建新世界</div>';
              createCard.addEventListener('click', function () { window.location.hash = '#/create'; });
              self.myWorldsGrid.appendChild(createCard);
            }
            self.loadCreatedWorlds();
          }).catch(function (e) {
            window.Toast.error('毁灭失败: ' + (e.message || '未知错误'));
          });
        });
      }).catch(function (e) {
        window.Toast.error('无法读取世界数据: ' + (e.message || '未知错误'));
      });
    }

    destroy() {
      this._bound = {};
    }
  }

  window.UserPage = UserPage;
})();
