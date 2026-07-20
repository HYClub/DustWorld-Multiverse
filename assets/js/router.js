(function () {
  'use strict';

  class Router {
    constructor() {
      this.routes = {
        '#/': 'home',
        '#/world': 'world',
        '#/create': 'create',
        '#/user': 'user'
      };
      this.currentPage = null;
      this.currentParams = {};
      this.pageModules = {};
    }

    init() {
      window.addEventListener('hashchange', () => this.handleRoute());
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.handleRoute());
      } else {
        this.handleRoute();
      }
    }

    handleRoute() {
      var hash = window.location.hash || '#/';
      var baseHash = hash.split('?')[0];
      var page = this.routes[baseHash] || 'home';
      var params = {};

      if (hash.indexOf('?') !== -1) {
        var queryStr = hash.split('?')[1];
        var pairs = queryStr.split('&');
        for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split('=');
          if (pair[0]) {
            params[decodeURIComponent(pair[0])] = pair.length > 1 ? decodeURIComponent(pair[1]) : '';
          }
        }
      }

      this.currentPage = page;
      this.currentParams = params;
      this.loadPage(page, params);
    }

    loadPage(page, params) {
      var appEl = document.getElementById('app');
      if (!appEl) return;

      var self = this;
      var pagePath = 'pages/' + page + '.html';

      var loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading-container';
      loadingDiv.innerHTML = '<div class="spinner spinner-lg"></div><div class="loading-text">宇宙加载中...</div>';
      appEl.innerHTML = '';
      appEl.appendChild(loadingDiv);

      fetch(pagePath)
        .then(function (res) {
          if (!res.ok) throw new Error('Page not found: ' + pagePath);
          return res.text();
        })
        .then(function (html) {
          appEl.innerHTML = html;
          self.updateActiveNav(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          self.initPageModule(page, params);
        })
        .catch(function () {
          appEl.innerHTML =
            '<div class="page" style="padding-top:80px;text-align:center;">' +
            '<div style="font-size:48px;margin-bottom:16px;opacity:0.5;">🌌</div>' +
            '<div style="color:var(--text-muted);font-size:14px;">宇宙坐标未找到</div>' +
            '</div>';
          self.updateActiveNav('home');
        });
    }

    initPageModule(page, params) {
      var moduleName = page.charAt(0).toUpperCase() + page.slice(1) + 'Page';
      var Module = window[moduleName];
      // Try alternative names (e.g. WorldDetailPage for 'world')
      if (!Module) {
        var altNames = { world: 'WorldDetailPage', create: 'CreateWorldPage' };
        var alt = altNames[page];
        if (alt) Module = window[alt];
      }
      if (!Module) return;

      // Destroy previous page instance
      if (this._pageInstance && typeof this._pageInstance.destroy === 'function') {
        this._pageInstance.destroy();
      }
      this._pageInstance = null;

      // Instantiate class or call static init
      if (typeof Module === 'function') {
        this._pageInstance = new Module();
        if (typeof this._pageInstance.init === 'function') {
          this._pageInstance.init(params);
        }
      } else if (typeof Module.init === 'function') {
        this._pageInstance = Module;
        Module.init(params);
      }
    }

    updateActiveNav(page) {
      var links = document.querySelectorAll('.navbar-link');
      var routeMap = { home: 'home', world: 'home', create: 'create', user: 'user' };
      var activePage = routeMap[page] || 'home';
      for (var i = 0; i < links.length; i++) {
        var nav = links[i].getAttribute('data-nav');
        if (nav === activePage) {
          links[i].classList.add('active');
        } else {
          links[i].classList.remove('active');
        }
      }
    }

    navigate(hash) {
      window.location.hash = hash;
    }

    getCurrentParams() {
      return this.currentParams;
    }

    getCurrentPage() {
      return this.currentPage;
    }
  }

  window.Router = Router;
})();
