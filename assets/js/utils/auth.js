(function () {
  'use strict';

  var AuthManager = function () {
    this.clientId = null;
    this.redirectUri = window.location.origin + window.location.pathname;
    this.proxyUrl = null;
    this.storage = new window.StorageManager();
  };

  AuthManager.prototype.init = function (clientId, redirectUri, proxyUrl) {
    if (clientId) this.clientId = clientId;
    if (redirectUri) this.redirectUri = redirectUri;
    if (proxyUrl) this.proxyUrl = proxyUrl;
  };

  AuthManager.prototype.loginWithPKCE = function () {
    if (!this.clientId) {
      this._showConfigPrompt();
      return;
    }

    var verifier = this.generateRandomString(64);
    this.storage.set('pkce_verifier', verifier);

    var self = this;
    return this.generateCodeChallenge(verifier).then(function (challenge) {
      var state = self.generateRandomString(32);
      self.storage.set('pkce_state', state);

      var params = new URLSearchParams({
        client_id: self.clientId,
        redirect_uri: self.redirectUri,
        scope: 'read:user repo',
        state: state,
        code_challenge: challenge,
        code_challenge_method: 'S256'
      });
      window.location.href = 'https://github.com/login/oauth/authorize?' + params.toString();
    });
  };

  AuthManager.prototype.handleCallback = function (code, state) {
    var self = this;

    var savedState = this.storage.get('pkce_state');
    if (state && savedState && state !== savedState) {
      console.warn('OAuth state mismatch');
      this.storage.remove('pkce_state');
      this.storage.remove('pkce_verifier');
      return Promise.reject(new Error('State mismatch'));
    }
    this.storage.remove('pkce_state');

    var verifier = this.storage.get('pkce_verifier');
    this.storage.remove('pkce_verifier');

    if (this.proxyUrl) {
      return this._exchangeViaProxy(code, verifier).then(function (result) {
        if (result && result.access_token) {
          self.storage.setToken(result.access_token);
          return self.fetchUserInfo();
        }
        throw new Error('Token exchange failed');
      }).catch(function (err) {
        console.warn('Proxy exchange failed, continuing without auth');
        return null;
      });
    }

    if (verifier && code) {
      return this._exchangeDirectly(code, verifier).then(function (result) {
        if (result && result.access_token) {
          self.storage.setToken(result.access_token);
          return self.fetchUserInfo();
        }
        return null;
      }).catch(function (err) {
        console.warn('PKCE exchange failed', err);
        return null;
      });
    }

    return Promise.resolve(null);
  };

  AuthManager.prototype._exchangeViaProxy = function (code, verifier) {
    var body = new URLSearchParams({
      code: code,
      redirect_uri: this.redirectUri,
      code_verifier: verifier || ''
    });
    return fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('Proxy exchange failed');
      return res.json();
    });
  };

  AuthManager.prototype._exchangeDirectly = function (code, verifier) {
    return fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        code: code,
        redirect_uri: this.redirectUri,
        code_verifier: verifier
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('Token exchange failed');
      return res.json();
    });
  };

  AuthManager.prototype.fetchUserInfo = function () {
    var token = this.storage.getToken();
    if (!token) return Promise.reject(new Error('No token'));

    var self = this;
    return fetch('https://api.github.com/user', {
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json'
      }
    }).then(function (res) {
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    }).then(function (user) {
      self.storage.setUser(user);
      if (window.app) {
        window.app._updateLoginButton();
      }
      self._refreshToken(token);
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
    if (window.app) {
      window.app._updateLoginButton();
    }
    var navLoginBtn = document.getElementById('login-btn');
    if (navLoginBtn) {
      navLoginBtn.textContent = '登录 GitHub';
      navLoginBtn.classList.add('btn-primary');
      navLoginBtn.classList.remove('btn-secondary');
    }
    if (window.location.hash.indexOf('#/user') !== -1) {
      window.location.hash = '#/';
    }
  };

  AuthManager.prototype._refreshToken = function (oldToken) {
    /* placeholder for token refresh logic */
  };

  AuthManager.prototype._showConfigPrompt = function () {
    var modal = document.getElementById('modal-overlay');
    var titleEl = document.getElementById('modal-title');
    var bodyEl = document.getElementById('modal-body');
    var footerEl = document.getElementById('modal-footer');
    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = '配置 GitHub OAuth';
    bodyEl.innerHTML =
      '<p style="color:var(--text-secondary);font-size:14px;margin-bottom:12px;">' +
      '请在 <code>localStorage</code> 中设置 GitHub Client ID 以启用登录：</p>' +
      '<div style="background:#1a1a30;padding:12px;border-radius:8px;font-size:12px;font-family:var(--font-mono);color:var(--text-secondary);word-break:break-all;">' +
      'localStorage.setItem("github_client_id", "your_client_id")</div>' +
      '<p style="color:var(--text-muted);font-size:12px;margin-top:12px;">' +
      '也可设置 OAuth 代理地址：<br>' +
      '<code>localStorage.setItem("github_oauth_proxy", "https://your-proxy-url")</code></p>';
    footerEl.innerHTML = '<button class="btn btn-primary modal-close-btn">我知道了</button>';
    modal.classList.add('open');
    var closeBtns = footerEl.querySelectorAll('.modal-close-btn');
    for (var i = 0; i < closeBtns.length; i++) {
      closeBtns[i].addEventListener('click', function () {
        modal.classList.remove('open');
      });
    }
  };

  AuthManager.prototype.generateRandomString = function (length) {
    var array = new Uint8Array(length);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (var i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    var result = '';
    for (var i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  };

  AuthManager.prototype.generateCodeChallenge = function (verifier) {
    var encoder = new TextEncoder();
    var data = encoder.encode(verifier);
    return window.crypto.subtle.digest('SHA-256', data).then(function (hash) {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    });
  };

  window.AuthManager = AuthManager;
})();
