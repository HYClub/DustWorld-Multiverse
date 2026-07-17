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
    }

    _loadProfile() {
      var user = null;
      var auth = window.AuthManager && window.AuthManager._instance;
      if (auth && typeof auth.getUser === 'function') {
        user = auth.getUser();
      } else {
        user = window.DEMO_USER || null;
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
      if (this.userName) this.userName.textContent = user.username || '未知用户';

      if (user.avatar_url && this.userAvatarImg) {
        this.userAvatarImg.src = user.avatar_url;
        this.userAvatarImg.style.display = 'block';
        if (this.userAvatarPlaceholder) this.userAvatarPlaceholder.style.display = 'none';
      } else if (this.userAvatarPlaceholder) {
        this.userAvatarPlaceholder.textContent = (user.username || '?')[0].toUpperCase();
        this.userAvatarPlaceholder.style.display = 'flex';
        if (this.userAvatarImg) this.userAvatarImg.style.display = 'none';
      }

      var created = user.worlds_created ? user.worlds_created.length : 0;
      var liked = user.worlds_liked ? user.worlds_liked.length : 0;
      if (this.createdCount) this.createdCount.textContent = created;
      if (this.likedCount) this.likedCount.textContent = liked;
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

      if (!worlds || worlds.length === 0) {
        var user = window.DEMO_USER;
        var createdIds = user ? (user.worlds_created || []) : [];
        var demos = window.DEMO_WORLDS || [];
        for (var i = 0; i < createdIds.length; i++) {
          for (var j = 0; j < demos.length; j++) {
            if (demos[j].world_id === createdIds[i]) {
              worlds.push(demos[j]);
            }
          }
        }
      }

      if (worlds.length === 0) {
        if (this.myWorldsGrid) this.myWorldsGrid.style.display = 'none';
        if (this.myWorldsEmpty) this.myWorldsEmpty.style.display = 'flex';
        return;
      }

      if (this.myWorldsEmpty) this.myWorldsEmpty.style.display = 'none';
      if (this.myWorldsGrid) this.myWorldsGrid.style.display = '';

      var createCard = this.myWorldsGrid && this.myWorldsGrid.querySelector('.world-card-create');
      if (createCard) createCard.remove();

      for (var k = 0; k < worlds.length; k++) {
        var card = this._createWorldCardElement(worlds[k]);
        if (this.myWorldsGrid) this.myWorldsGrid.appendChild(card);
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

      if (!worlds || worlds.length === 0) {
        var user = window.DEMO_USER;
        var likedIds = user ? (user.worlds_liked || []) : [];
        var demos = window.DEMO_WORLDS || [];
        for (var i = 0; i < likedIds.length; i++) {
          for (var j = 0; j < demos.length; j++) {
            if (demos[j].world_id === likedIds[i]) {
              worlds.push(demos[j]);
            }
          }
        }
      }

      if (worlds.length === 0) {
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
        interventions = window.DEMO_INTERVENTIONS || [];
      }

      if (interventions.length === 0) {
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
      var card = document.createElement('world-card');
      if (card.setAttribute) {
        card.setAttribute('world-id', world.world_id || '');
        card.setAttribute('name', world.name || '');
        card.setAttribute('creator', world.creator || '');
        card.setAttribute('creator-avatar', world.creator_avatar || '');
        card.setAttribute('year', String(world.year || 0));
        card.setAttribute('era', world.era || 'primitive');
        card.setAttribute('era-name', world.eraName || world.era || '原始时代');
        card.setAttribute('population', String((world.stats && world.stats.total_population) || 0));
        card.setAttribute('settlements', String((world.stats && world.stats.total_settlements) || 0));
        card.setAttribute('likes', String(world.likes || 0));
        card.setAttribute('description', world.description || '');
        if (world.terrain && world.terrain.tiles) {
          card.setAttribute('terrain', JSON.stringify(world.terrain.tiles));
        }
      }

      card.addEventListener('click', function (e) {
        var likeBtn = card.shadowRoot ? card.shadowRoot.querySelector('.like-btn') : null;
        if (likeBtn && likeBtn.contains(e.target)) return;
        window.location.hash = '#/world?id=' + (world.world_id || '');
      });

      return card;
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

    destroy() {
      this._bound = {};
    }
  }

  window.UserPage = UserPage;
})();
