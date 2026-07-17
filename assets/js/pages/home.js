(function () {
  'use strict';

  class HomePage {
    constructor() {
      this.currentSort = 'likes';
      this.page = 1;
      this.loading = false;
      this.allWorlds = [];
      this._bound = {};
    }

    init() {
      this.appEl = document.getElementById('app');
      this.worldGrid = document.getElementById('world-grid');
      this.sortBar = document.getElementById('sort-bar');
      this.searchInput = document.getElementById('search-input');
      this.loadMoreBtn = document.getElementById('load-more-btn');
      this.skeletonContainer = document.getElementById('skeleton-container');
      this.emptyState = document.getElementById('empty-state');
      this.errorState = document.getElementById('error-state');

      if (this.sortBar) {
        var btns = this.sortBar.querySelectorAll('.sort-btn');
        for (var i = 0; i < btns.length; i++) {
          var btn = btns[i];
          this._bound.sortClick = this._bound.sortClick || this._onSortClick.bind(this);
          btn.addEventListener('click', this._bound.sortClick);
        }
      }

      if (this.searchInput) {
        this._bound.searchInput = this._bound.searchInput || this._onSearchInput.bind(this);
        this.searchInput.addEventListener('input', this._bound.searchInput);
      }

      if (this.loadMoreBtn) {
        this._bound.loadMore = this._bound.loadMore || this._onLoadMore.bind(this);
        this.loadMoreBtn.addEventListener('click', this._bound.loadMore);
      }

      var createBtn = document.getElementById('create-world-btn');
      if (createBtn) {
        createBtn.addEventListener('click', function () {
          window.location.hash = '#/create';
        });
      }

      var myWorldsBtn = document.getElementById('my-worlds-btn');
      if (myWorldsBtn) {
        myWorldsBtn.addEventListener('click', function () {
          window.location.hash = '#/user';
        });
      }

      this.loadWorlds(false);
    }

    _onSortClick(e) {
      var btn = e.target.closest('.sort-btn');
      if (!btn) return;
      var sort = btn.getAttribute('data-sort');
      if (sort) this.onSortChange(sort);
    }

    _onSearchInput(e) {
      var val = e.target.value;
      if (this._searchTimer) clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(this.onSearch.bind(this, val), 300);
    }

    _onLoadMore() {
      this.loadWorlds(true);
    }

    async loadWorlds(append) {
      if (this.loading) return;
      this.loading = true;

      if (this.skeletonContainer) this.skeletonContainer.style.display = 'flex';
      if (this.errorState) this.errorState.style.display = 'none';
      if (this.emptyState) this.emptyState.style.display = 'none';
      if (this.loadMoreBtn) this.loadMoreBtn.disabled = true;

      try {
        var dm = window.DataManager || window.DemoDataManager;
        var data;
        if (dm && typeof dm.getWorlds === 'function') {
          data = await dm.getWorlds({ sort: this.currentSort, page: this.page, limit: 12 });
        } else {
          data = this._getDemoWorlds(this.currentSort, this.page);
        }

        var worlds = data && data.worlds ? data.worlds : (Array.isArray(data) ? data : []);

        if (worlds.length === 0 && !append) {
          this._showEmpty();
          return;
        }

        if (append) {
          for (var i = 0; i < worlds.length; i++) {
            this.allWorlds.push(worlds[i]);
            var card = this._renderWorldCard(worlds[i]);
            if (this.worldGrid) this.worldGrid.appendChild(card);
          }
        } else {
          this.allWorlds = worlds;
          if (this.worldGrid) this.worldGrid.innerHTML = '';
          for (var j = 0; j < worlds.length; j++) {
            var c = this._renderWorldCard(worlds[j]);
            if (this.worldGrid) this.worldGrid.appendChild(c);
          }
        }

        if (this.loadMoreBtn) {
          var hasMore = data && data.has_more;
          if (hasMore === undefined) hasMore = worlds.length >= 12;
          this.loadMoreBtn.style.display = hasMore ? '' : 'none';
          this.loadMoreBtn.disabled = false;
        }

        this.page++;
      } catch (err) {
        console.error('loadWorlds error:', err);
        this._showError();
      } finally {
        this.loading = false;
        if (this.skeletonContainer) this.skeletonContainer.style.display = 'none';
      }
    }

    _getDemoWorlds(sort, page) {
      var list = (window.DEMO_WORLDS || []).slice();
      // Merge with locally created worlds
      try {
        var localWorlds = JSON.parse(localStorage.getItem('dustworld_local_worlds') || '[]');
        for (var li = 0; li < localWorlds.length; li++) {
          var exists = false;
          for (var ei = 0; ei < list.length; ei++) {
            if (list[ei].world_id === localWorlds[li].world_id) { exists = true; break; }
          }
          if (!exists) list.unshift(localWorlds[li]);
        }
      } catch (e) {}

      switch (sort) {
        case 'likes':
          list.sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); });
          break;
        case 'newest':
          list.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
          break;
        case 'oldest':
          list.sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
          break;
        case 'active':
          list.sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); });
          break;
      }

      var limit = 12;
      var start = (page - 1) * limit;
      var sliced = list.slice(start, start + limit);
      return { worlds: sliced, has_more: start + limit < list.length };
    }

    _renderWorldCard(world) {
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

      card.addEventListener('like-toggle', function (e) {
        var detail = e.detail || {};
        if (detail.liked !== undefined) {
          var auth = window.AuthManager && window.AuthManager._instance;
          if (!auth || !auth.isLoggedIn()) {
            window.Toast.warning('请先登录后点赞');
            e.preventDefault();
            return;
          }
          var key = 'liked_' + world.world_id;
          if (detail.liked) {
            localStorage.setItem(key, '1');
          } else {
            localStorage.removeItem(key);
          }
        }
      });

      return card;
    }

    _showEmpty() {
      if (this.emptyState) {
        this.emptyState.style.display = 'flex';
      }
      if (this.worldGrid) this.worldGrid.innerHTML = '';
      if (this.loadMoreBtn) this.loadMoreBtn.style.display = 'none';
    }

    _showError() {
      if (this.errorState) {
        this.errorState.style.display = 'flex';
      }
      if (this.skeletonContainer) this.skeletonContainer.style.display = 'none';
      window.Toast.error('加载世界列表失败，请重试');
    }

    onSortChange(sortBy) {
      if (sortBy === this.currentSort) return;
      this.currentSort = sortBy;
      this.page = 1;

      if (this.sortBar) {
        var btns = this.sortBar.querySelectorAll('.sort-btn');
        for (var i = 0; i < btns.length; i++) {
          var btn = btns[i];
          btn.classList.toggle('active', btn.getAttribute('data-sort') === sortBy);
        }
      }

      if (this.worldGrid) this.worldGrid.innerHTML = '';
      this.loadWorlds(false);
    }

    onSearch(query) {
      if (!query || !query.trim()) {
        if (this.worldGrid) this.worldGrid.innerHTML = '';
        this.page = 1;
        this.loadWorlds(false);
        return;
      }

      var q = query.trim().toLowerCase();
      var filtered = (window.DEMO_WORLDS || []).filter(function (w) {
        return w.name && w.name.toLowerCase().indexOf(q) !== -1;
      });

      if (this.worldGrid) this.worldGrid.innerHTML = '';
      if (filtered.length === 0) {
        this._showEmpty();
        return;
      }

      for (var i = 0; i < filtered.length; i++) {
        var card = this._renderWorldCard(filtered[i]);
        if (this.worldGrid) this.worldGrid.appendChild(card);
      }

      if (this.loadMoreBtn) this.loadMoreBtn.style.display = 'none';
      if (this.emptyState) this.emptyState.style.display = 'none';
      if (this.errorState) this.errorState.style.display = 'none';
    }

    destroy() {
      if (this._searchTimer) clearTimeout(this._searchTimer);
      this._bound = {};
    }
  }

  window.HomePage = HomePage;
})();
