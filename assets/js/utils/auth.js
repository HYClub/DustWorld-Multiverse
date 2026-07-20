(function () {
  'use strict';

  var PROXY_URL = 'https://dustworld-oauth.hyclub.workers.dev';

  var AuthManager = function () {
    this.storage = new window.StorageManager();
  };

  AuthManager.prototype.init = function () {};

  AuthManager.prototype.login = function () {
    var state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    this.storage.set('oauth_state', state);
    window.location.href = PROXY_URL + '/login?state=' + state;
  };

  AuthManager.prototype.handleCallback = function (code, state) {
    var savedState = this.storage.get('oauth_state');
    this.storage.remove('oauth_state');
    if (state && savedState && state !== savedState) {
      console.warn('OAuth state mismatch');
      return Promise.reject(new Error('State mismatch'));
    }
    var self = this;
    return fetch(PROXY_URL + '/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    }).then(function (res) {
      return res.json().then(function (result) {
        if (!res.ok) throw new Error(result.error || '交换失败');
        if (result.access_token) {
          self.storage.setToken(result.access_token);
          return self.fetchUserInfo();
        }
        throw new Error(result.error || '交换失败');
      });
    }).catch(function (err) {
      window.Toast.error('登录失败: ' + err.message);
    });
  };

  AuthManager.prototype.fetchUserInfo = function () {
    var token = this.storage.getToken();
    if (!token) return Promise.reject(new Error('No token'));
    var self = this;
    return fetch('https://api.github.com/user', {
      headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('获取用户信息失败');
      return res.json();
    }).then(function (user) {
      self.storage.setUser(user);
      if (window.app) window.app._updateLoginButton();
      return user;
    });
  };

  AuthManager.prototype.isLoggedIn = function () {
    return !!this.storage.getToken();
  };

  AuthManager.prototype.getUser = function () {
    return this.storage.getUser();
  };

  AuthManager.prototype.logout = function () {
    this.storage.remove('github_token');
    this.storage.remove('github_user');
    if (window.app) window.app._updateLoginButton();
    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.textContent = '登录 GitHub';
      loginBtn.className = 'btn btn-primary nav-login-btn';
      loginBtn.style.cssText = 'padding: 8px 16px; font-size: 13px;';
    }
    if (window.location.hash.indexOf('#/user') !== -1) window.location.hash = '#/';
  };

  window.AuthManager = AuthManager;
})();
