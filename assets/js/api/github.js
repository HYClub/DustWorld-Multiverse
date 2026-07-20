(function () {
  'use strict';

  var API_BASE = 'https://api.github.com';
  var RAW_BASE = 'https://raw.githubusercontent.com';

  function generateId(prefix) {
    var hex = '';
    var arr = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (var i = 0; i < 8; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    for (var i = 0; i < arr.length; i++) {
      hex += ('0' + arr[i].toString(16)).slice(-2);
    }
    return (prefix || '') + hex;
  }

  /* DEMO_WORLDS removed */

  /* DEMO_STATES removed */

  var GitHubAPI = function () {
    this.baseURL = API_BASE;
    this.token = null;
    this.owner = 'HYClub';
    this.repo = 'DustWorld-Multiverse';
  };

  GitHubAPI.prototype._hasToken = function () { return !!this._token(); };

  GitHubAPI.prototype._token = function () {
    if (this.token) return this.token;
    try {
      var sm = window.StorageManager ? new window.StorageManager() : null;
      if (sm) return sm.getToken();
      var v = localStorage.getItem('dustworld_github_token');
      if (v) return JSON.parse(v);
      return null;
    } catch (e) { return null; }
  };

  GitHubAPI.prototype.request = function (endpoint, options) {
    var self = this;
    options = options || {};
    var url = this.baseURL + endpoint;
    var headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    var t = this._token();
    if (t) {
      headers['Authorization'] = 'token ' + t;
    }
    var fetchOptions = {
      method: options.method || 'GET',
      headers: headers
    };
    if (options.body) {
      fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
    return fetch(url, fetchOptions).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          var error = new Error('GitHub API Error: ' + (err.message || res.statusText));
          error.status = res.status;
          error.response = err;
          throw error;
        });
      }
      if (res.status === 204) return null;
      return res.json();
    });
  };

  GitHubAPI.prototype.setToken = function (token) { this.token = token || null; };

  GitHubAPI.prototype.getWorldList = function () {
    var self = this;
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/data/worlds')
      .then(function (data) {
        if (!Array.isArray(data)) return [];
        return data.filter(function (item) { return item.type === 'dir'; });
      })
      .catch(function () { return []; });
  };

  GitHubAPI.prototype._decodeContent = function (content) {
    try {
      var raw = atob(content.replace(/\s/g, ''));
      var bytes = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return null;
    }
  };

  GitHubAPI.prototype._encodeContent = function (str) {
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  GitHubAPI.prototype.getWorldState = function (worldId) {
    var self = this;
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/data/worlds/' + worldId + '/state.json')
      .then(function (data) {
        if (data && data.content) {
          try {
            var decoded = self._decodeContent(data.content);
            return decoded ? JSON.parse(decoded) : null;
          } catch (e) {
            return null;
          }
        }
        return null;
      })
      .catch(function () { return null; });
  };

  GitHubAPI.prototype.getWorldConfig = function (worldId) {
    var self = this;
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/data/worlds/' + worldId + '/config.json')
      .then(function (data) {
        if (data && data.content) {
          try {
            var decoded = self._decodeContent(data.content);
            return decoded ? JSON.parse(decoded) : null;
          } catch (e) {
            return null;
          }
        }
        return null;
      })
      .catch(function () { return null; });
  };

  GitHubAPI.prototype.getWorldHistory = function (worldId) {
    var self = this;
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/data/worlds/' + worldId + '/history.json')
      .then(function (data) {
        if (data && data.content) {
          try {
            var decoded = self._decodeContent(data.content);
            return decoded ? JSON.parse(decoded) : [];
          } catch (e) {
            return [];
          }
        }
        return [];
      })
      .catch(function () { return []; });
  };

  GitHubAPI.prototype.getUserData = function (username) {
    return this.request('/users/' + encodeURIComponent(username)).catch(function () {
      return null;
    });
  };

  GitHubAPI.prototype.getRawFile = function (path) {
    return fetch(RAW_BASE + '/' + this.owner + '/' + this.repo + '/master/' + path).then(function (res) {
      if (!res.ok) throw new Error('File not found');
      return res.text();
    });
  };

  GitHubAPI.prototype.submitIntervention = function (worldId, intervention) {
    return this.request('/repos/' + this.owner + '/' + this.repo + '/issues', {
      method: 'POST',
      body: {
        title: '干预: ' + worldId + ' - ' + (intervention.type || 'unknown'),
        body: JSON.stringify(intervention, null, 2),
        labels: ['intervention', 'world:' + worldId, intervention.type || 'general']
      }
    });
  };

  GitHubAPI.prototype.getInterventions = function () {
    return this.request('/repos/' + this.owner + '/' + this.repo + '/issues?labels=intervention&state=all&per_page=50')
      .then(function (issues) {
        if (!Array.isArray(issues)) return [];
        return issues.map(function (issue) {
          var body = {};
          try { body = JSON.parse(issue.body || '{}'); } catch (e) {}
          return {
            id: issue.number,
            type: body.type || 'general',
            target_settlement: body.settlementName || body.target || '',
            target_world: issue.title.split(' - ')[0].replace('干预: ', ''),
            status: issue.state === 'open' ? 'pending' : 'executed',
            timestamp: issue.created_at,
            issue_url: issue.html_url
          };
        });
      })
      .catch(function () { return []; });
  };

  GitHubAPI.prototype._getFileSha = function (path) {
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/' + path)
      .then(function (data) { return data && data.sha ? data.sha : null; })
      .catch(function () { return null; });
  };

  GitHubAPI.prototype._putFile = function (path, content, message, sha) {
    var self = this;
    var body = { message: message, content: content, branch: 'master' };
    if (sha) body.sha = sha;
    var maxRetries = 3;
    var attempt = 0;
    function tryPut() {
      attempt++;
      return self.request('/repos/' + self.owner + '/' + self.repo + '/contents/' + path, {
        method: 'PUT',
        body: body
      }).catch(function (err) {
        if (attempt < maxRetries) {
          return new Promise(function (resolve) { setTimeout(resolve, attempt * 1000); }).then(tryPut);
        }
        throw err;
      });
    }
    return tryPut();
  };

  GitHubAPI.prototype.createWorld = function (worldData) {
    if (!this._hasToken()) return Promise.reject(new Error('Not authenticated'));
    var worldId = worldData.world_id || worldData.id;
    if (!worldId) return Promise.reject(new Error('Missing world ID'));

    worldData.liked_by = worldData.liked_by || [];
    worldData.likes = worldData.likes || 0;
    var statePath = 'data/worlds/' + worldId + '/state.json';
    var stateContent = this._encodeContent(JSON.stringify(worldData, null, 2));

    var configPath = 'data/worlds/' + worldId + '/config.json';
    var configObj = worldData.config || {};
    var configContent = this._encodeContent(JSON.stringify(configObj, null, 2));

    var msg = '创建世界: ' + (worldData.name || worldId);
    var self = this;
    return this._putFile(statePath, stateContent, msg).then(function () {
      return self._putFile(configPath, configContent, msg);
    });
  };

  GitHubAPI.prototype.updateWorldState = function (worldId, worldData) {
    if (!this._hasToken()) return Promise.reject(new Error('Not authenticated'));
    var statePath = 'data/worlds/' + worldId + '/state.json';
    var content = this._encodeContent(JSON.stringify(worldData, null, 2));
    var self = this;
    return this._getFileSha(statePath).then(function (sha) {
      return self._putFile(statePath, content, '更新世界: ' + (worldData.name || worldId), sha);
    });
  };

  GitHubAPI.prototype.getWorldListFromDirectory = function () {
    return this.getWorldList();
  };

  /* getDemo* stubs removed */

  window.GitHubAPI = GitHubAPI;
})();
