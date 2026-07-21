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
        this.authManager.handleCallback(code, state).catch(function (e) {
          window.Toast.error('登录失败: ' + (e.message || '认证交换失败'));
        }).finally(function () {
          self._finishInit();
        });
      } else {
        this._finishInit();
      }
    }

    _finishInit() {
      this._updateLoginButton();
      this._hideLoading();
      // Set pending hash first so router loads the right page in one go
      this._redirectPendingCreate();
      this.router = new window.Router();
      this.router.init();
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
            self._toggleDropdown();
          } else {
            self.authManager.login();
          }
          return;
        }
        var menuItem = e.target.closest('.nav-dropdown-item');
        if (menuItem) {
          var action = menuItem.getAttribute('data-action');
          if (action === 'logout') {
            self._confirmLogout();
          } else if (action === 'user') {
            window.location.hash = '#/user';
            self._hideDropdown();
          }
          return;
        }
        // Click outside dropdown → close
        var menu = document.getElementById('user-menu');
        if (menu && !menu.contains(e.target)) {
          self._hideDropdown();
        }
      });
    }

    _toggleDropdown() {
      var dd = document.getElementById('nav-dropdown');
      if (!dd) return;
      if (dd.style.display === 'none') {
        this._updateDropdown();
        dd.style.display = '';
      } else {
        dd.style.display = 'none';
      }
    }

    _hideDropdown() {
      var dd = document.getElementById('nav-dropdown');
      if (dd) dd.style.display = 'none';
    }

    _updateDropdown() {
      var user = this.authManager.getUser();
      if (!user) return;
      var nameEl = document.getElementById('dropdown-name');
      if (nameEl) nameEl.textContent = user.login || user.name || '用户';
      var avatarEl = document.getElementById('dropdown-avatar');
      if (avatarEl && user.avatar_url) {
        avatarEl.src = user.avatar_url;
        avatarEl.style.display = '';
      }
    }

    _confirmLogout() {
      var self = this;
      if (window.Modal && typeof window.Modal.show === 'function') {
        var modal = window.Modal.show({
          title: '退出登录',
          content: '<p style="text-align:center;color:var(--text-secondary);">确定要退出登录吗？</p>',
          confirmText: '退出',
          cancelText: '取消'
        });
        modal.onConfirm(function () {
          self._hideDropdown();
          self.authManager.logout();
        });
      } else {
        if (confirm('确定要退出登录吗？')) {
          self._hideDropdown();
          self.authManager.logout();
        }
      }
    }

    _updateLoginButton() {
      var loginBtn = document.getElementById('login-btn');
      if (!loginBtn) return;
      if (this.authManager.isLoggedIn()) {
        var user = this.authManager.getUser();
        loginBtn.innerHTML = (user && user.login) ? (user.login + ' ▾') : '已登录 ▾';
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
