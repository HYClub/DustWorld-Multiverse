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
      var self = this;
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

      var retryBtn = document.getElementById('retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', function () {
          self.page = 1;
          self.allWorlds = [];
          if (self.worldGrid) self.worldGrid.innerHTML = '';
          self.loadWorlds(false);
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

      var timeoutPromise = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('加载超时')); }, 15000);
      });

      try {
        var dm = window.DataManager;
        var data = { worlds: [], has_more: false };
        if (dm && typeof dm.getWorlds === 'function') {
          data = await Promise.race([dm.getWorlds({ sort: this.currentSort, page: this.page, limit: 12 }), timeoutPromise]);
        }

        var worlds = data && data.worlds ? data.worlds : [];

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
        if (this.skeletonContainer) this.skeletonContainer.style.display = 'none';
        this._showEmpty();
      } finally {
        this.loading = false;
        if (this.skeletonContainer) this.skeletonContainer.style.display = 'none';
      }
    }

    _renderWorldCard(world) {
      return window.helpers.createWorldCard(world);
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
      var filtered = (this.allWorlds || []).filter(function (w) {
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
