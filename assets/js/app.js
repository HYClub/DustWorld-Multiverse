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
        document.addEventListener('DOMContentLoaded', function () { self._initModules(); });
      } else {
        self._initModules();
      }
    }

    _initModules() {
      var self = this;
      this.api = new window.GitHubAPI();
      this.dataManager = new window.DataManager(this.api);
      window.DataManager = this.dataManager;

      this.authManager = new window.AuthManager();
      window.AuthManager._instance = this.authManager;
      this.authManager.init();
      this._setupGlobalEvents();

      var code = localStorage.getItem('dustworld_oauth_code');
      var state = localStorage.getItem('dustworld_oauth_state');
      if (code) {
        localStorage.removeItem('dustworld_oauth_code');
        localStorage.removeItem('dustworld_oauth_state');
        this.authManager.handleCallback(code, state).catch(function () {}).finally(function () {
          self._finishInit();
        });
      } else {
        this._finishInit();
      }
    }

    _finishInit() {
      this.router = new window.Router();
      this.router.init();
      this._updateLoginButton();
      this._hideLoading();
      this._redirectPendingCreate();
    }

    _redirectPendingCreate() {
      if (!this.authManager.isLoggedIn()) return;
      var hasPending = false;
      try { hasPending = !!localStorage.getItem('dustworld_pending_create'); } catch (e) {}
      if (hasPending) {
        window.Toast.info('登录成功，正在进入创建页面…');
        window.location.hash = '#/create';
      }
    }

    _setupGlobalEvents() {
      var self = this;
      document.addEventListener('click', function (e) {
        var loginBtn = e.target.closest('#login-btn');
        if (loginBtn) {
          if (self.authManager.isLoggedIn()) {
            self.authManager.logout();
          } else {
            self.authManager.login();
          }
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
        loginBtn.className = 'btn btn-secondary nav-login-btn';
        loginBtn.style.cssText = 'padding: 8px 16px; font-size: 13px;';
      } else {
        loginBtn.textContent = '登录 GitHub';
        loginBtn.className = 'btn btn-primary nav-login-btn';
        loginBtn.style.cssText = 'padding: 8px 16px; font-size: 13px;';
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
