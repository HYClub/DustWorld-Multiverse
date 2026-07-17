(function () {
  'use strict';

  class App {
    constructor() {
      this.router = null;
      this.authManager = null;
      this.dataManager = null;
      this.api = null;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      this.initialized = true;

      var self = this;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          self._initModules();
        });
      } else {
        self._initModules();
      }
    }

    _initModules() {
      var self = this;

      this.api = new window.GitHubAPI();
      window.DataManager = new window.DataManager(this.api);
      this.dataManager = window.DataManager;

      this.authManager = new window.AuthManager();
      window.AuthManager._instance = this.authManager;

      var githubClientId = localStorage.getItem('github_client_id') || null;
      var oauthProxy = localStorage.getItem('github_oauth_proxy') || null;

      this.authManager.init(githubClientId, undefined, oauthProxy);

      var params = new URLSearchParams(window.location.search);
      var code = params.get('code');
      var state = params.get('state');

      if (code) {
        this.authManager.handleCallback(code, state).catch(function () {
          self._finishInit();
        });
      }

      this._setupGlobalEvents();
      this._finishInit();
    }

    _finishInit() {
      this.router = new window.Router();
      this.router.init();

      this._updateLoginButton();
      this._hideLoading();
    }

    _setupGlobalEvents() {
      var self = this;

      document.addEventListener('click', function (e) {
        var loginBtn = e.target.closest('#login-btn');
        if (loginBtn) {
          if (self.authManager.isLoggedIn()) {
            self.authManager.logout();
          } else {
            self.authManager.loginWithPKCE();
          }
          return;
        }

        var navLink = e.target.closest('[data-nav]');
        if (navLink) {
          var nav = navLink.getAttribute('data-nav');
          if (nav === 'home') self.router.navigate('#/');
          else if (nav === 'create') self.router.navigate('#/create');
          else if (nav === 'user') self.router.navigate('#/user');
          return;
        }

        var navigateBtn = e.target.closest('[data-action="navigate"]');
        if (navigateBtn) {
          var page = navigateBtn.getAttribute('data-page');
          if (page === 'create') self.router.navigate('#/create');
          return;
        }

        var backBtn = e.target.closest('[data-action="back"]');
        if (backBtn) {
          window.history.back();
          return;
        }
      });
    }

    _updateLoginButton() {
      var loginBtn = document.getElementById('login-btn');
      if (!loginBtn) return;
      if (this.authManager.isLoggedIn()) {
        var user = this.authManager.getUser();
        loginBtn.textContent = (user && user.login) ? user.login : '已登录';
        loginBtn.classList.remove('btn-primary');
        loginBtn.classList.add('btn-secondary');
      } else {
        loginBtn.textContent = '登录 GitHub';
        loginBtn.classList.add('btn-primary');
        loginBtn.classList.remove('btn-secondary');
        loginBtn.style.display = '';
      }
    }

    _hideLoading() {
      var loading = document.getElementById('app-loading');
      if (loading) {
        loading.classList.add('hidden');
        setTimeout(function () {
          if (loading.parentNode) loading.parentNode.removeChild(loading);
        }, 500);
      }
    }
  }

  window.App = App;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      var app = new window.App();
      window.app = app;
      app.init();
    });
  } else {
    var app = new window.App();
    window.app = app;
    app.init();
  }
})();
