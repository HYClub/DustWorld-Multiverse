(function () {
  'use strict';

  var DataManager = function (api) {
    this.api = api || new window.GitHubAPI();
    this.cache = {};
    this.cacheTTL = 60000;
  };

  DataManager.prototype.getWorldList = function () {
    var cached = this._getCached('worldList');
    if (cached) return Promise.resolve(cached);

    // Try localStorage as persistent cache
    try {
      var ls = localStorage.getItem('dustworld_world_index');
      if (ls) {
        var parsed = JSON.parse(ls);
        if (parsed && Array.isArray(parsed.data) && Date.now() - parsed.time < 300000) {
          return Promise.resolve(parsed.data);
        }
      }
    } catch (e) {}

    var self = this;
    return this.api.getWorldList().then(function (items) {
      if (!items || items.length === 0) return [];
      var worldIds = items.map(function (item) {
        var parts = item.path.split('/');
        return parts[parts.length - 1];
      });
      var worldPromises = worldIds.map(function (id) {
        return self._fetchWorldMeta(id);
      });
      return Promise.all(worldPromises).then(function (worlds) {
        var valid = worlds.filter(function (w) { return w !== null && w !== undefined; });
        var merged = valid.map(function (w, i) {
          if (typeof w === 'object' && (w.id || w.world_id)) {
            if (!w.world_id) w.world_id = w.id;
            if (!w.stats) w.stats = { total_population: w.population || 0, total_settlements: w.settlements || 0 };
            return w;
          }
          return { id: worldIds[i], world_id: worldIds[i], name: '未知世界 #' + worldIds[i], year: 0, era: 'primitive', settlements: 0, population: 0, likes: 0, stats: { total_population: 0, total_settlements: 0 } };
        });
        self._setCached('worldList', merged);
        // Persist to localStorage (5 min TTL)
        try { localStorage.setItem('dustworld_world_index', JSON.stringify({ data: merged, time: Date.now() })); } catch (e) {}
        return merged;
      });
    });
  };

  DataManager.prototype._fetchWorldMeta = function (id) {
    var self = this;
    return this.api.getWorldState(id).then(function (state) {
      if (!state) return null;
      return {
        id: id,
        world_id: id,
        name: state.name || id,
        creator: state.creator || '未知',
        creatorAvatar: state.creator_avatar || '',
        description: state.description || '',
        year: state.year || 0,
        era: state.era || 'primitive',
        settlements: state.settlements ? state.settlements.length : 0,
        population: (state.stats && state.stats.total_population) || 0,
        total_settlements: (state.stats && state.stats.total_settlements) || 0,
        likes: state.likes || 0,
        liked_by: state.liked_by || [],
        mapSize: state.mapSize || 40,
        techLevel: state.techLevel || 0,
        resources: state.resources || 'normal',
        climate: state.climate || 'mild',
        updatedAt: state.updated_at || state.created_at || '',
        lastEvolvedAt: state.last_evolved_at || state.created_at || ''
      };
    });
  };

  DataManager.prototype.getWorlds = function (sortBy, page, pageSize) {
    // Accept both (sortBy, page, pageSize) and ({sort, page, limit}) calling conventions
    if (typeof sortBy === 'object' && sortBy !== null) {
      var opts = sortBy;
      sortBy = opts.sort || 'likes';
      page = opts.page || 1;
      pageSize = opts.limit || 20;
    }
    sortBy = sortBy || 'likes';
    page = page || 1;
    pageSize = pageSize || 20;

    var self = this;
    return this.getWorldList().then(function (worlds) {
      var sorted = self._sortWorlds(worlds, sortBy);
      var start = (page - 1) * pageSize;
      var end = start + pageSize;
      var items = sorted.slice(start, end);
      return {
        worlds: items,
        items: items,
        total: sorted.length,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(sorted.length / pageSize),
        has_more: end < sorted.length
      };
    });
  };

  DataManager.prototype._sortWorlds = function (worlds, sortBy) {
    var sorted = worlds.slice();
    switch (sortBy) {
      case 'likes':
        sorted.sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); });
        break;
      case 'created_at':
        sorted.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
        break;
      case 'oldest':
        sorted.sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
        break;
      case 'population':
        sorted.sort(function (a, b) { return (b.population || 0) - (a.population || 0); });
        break;
      case 'active':
        sorted.sort(function (a, b) { return (b.lastEvolvedAt || b.updatedAt || '') > (a.lastEvolvedAt || a.updatedAt || '') ? 1 : -1; });
        break;
      default:
        sorted.sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); });
    }
    return sorted;
  };

  DataManager.prototype.getWorld = function (worldId) {
    var cached = this._getCached('world_' + worldId);
    if (cached) return Promise.resolve(cached);

    var self = this;
    return this.api.getWorldState(worldId).then(function (state) {
      if (!state) return null;
      self._setCached('world_' + worldId, state);
      return state;
    });
  };

  DataManager.prototype.getUser = function (username) {
    return this.api.getUserData(username);
  };

  DataManager.prototype.getWorldConfig = function (worldId) {
    var cached = this._getCached('config_' + worldId);
    if (cached) return Promise.resolve(cached);
    var self = this;
    return this.api.getWorldConfig(worldId).then(function (config) {
      if (config) self._setCached('config_' + worldId, config);
      return config;
    });
  };

  DataManager.prototype.getWorldHistory = function (worldId) {
    var cachedKey = 'history_' + worldId;
    var cached = this._getCached(cachedKey);
    if (cached) return Promise.resolve(cached);
    var self = this;
    return this.api.getWorldHistory(worldId).then(function (history) {
      if (history) self._setCached(cachedKey, history);
      return history;
    });
  };

  DataManager.prototype.searchWorlds = function (query, sortBy, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;
    var self = this;
    return this.getWorldList().then(function (worlds) {
      var filtered = worlds;
      if (query && query.trim()) {
        var q = query.trim().toLowerCase();
        filtered = worlds.filter(function (w) {
          return (w.name && w.name.toLowerCase().indexOf(q) !== -1) ||
            (w.creator && w.creator.toLowerCase().indexOf(q) !== -1) ||
            (w.description && w.description.toLowerCase().indexOf(q) !== -1);
        });
      }
      var sorted = self._sortWorlds(filtered, sortBy);
      var start = (page - 1) * pageSize;
      var end = start + pageSize;
      return {
        items: sorted.slice(start, end),
        total: sorted.length,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(sorted.length / pageSize)
      };
    });
  };

  DataManager.prototype.updateWorld = function (worldId, worldData) {
    if (!this.api) return Promise.reject(new Error('No API'));
    var self = this;
    return this.api.updateWorldState(worldId, worldData).then(function (result) {
      self.invalidateCache('world_' + worldId);
      self.invalidateCache('worldList');
      return result;
    });
  };

  DataManager.prototype.createWorld = function (worldData) {
    if (!this.api) return Promise.reject(new Error('No API'));
    var self = this;
    return this.api.createWorld(worldData).then(function (result) {
      self.invalidateCache('worldList');
      return result;
    });
  };

  DataManager.prototype.deleteWorld = function (worldId) {
    if (!this.api) return Promise.reject(new Error('No API'));
    var self = this;
    return this.api.deleteWorld(worldId).then(function () {
      self.invalidateCache('worldList');
      self.invalidateCache('world_' + worldId);
    });
  };

  DataManager.prototype.getUserWorlds = function () {
    var self = this;
    return this.getWorldList().then(function (worlds) {
      var auth = window.AuthManager && window.AuthManager._instance;
      var user = auth && auth.getUser && auth.getUser();
      var username = user && (user.login || user.name);
      if (!username) return [];
      return worlds.filter(function (w) { return w.creator === username; });
    });
  };

  DataManager.prototype.getLikedWorlds = function () {
    var self = this;
    var auth = window.AuthManager && window.AuthManager._instance;
    var user = auth && auth.getUser && auth.getUser();
    var username = user && (user.login || user.name);
    if (!username) return Promise.resolve([]);
    return this.getWorldList().then(function (worlds) {
      return worlds.filter(function (w) {
        return w.liked_by && w.liked_by.indexOf(username) !== -1;
      });
    });
  };

  DataManager.prototype.toggleLike = function (worldId) {
    if (this._likingInProgress) return Promise.reject(new Error('Already in progress'));
    this._likingInProgress = true;
    var auth = window.AuthManager && window.AuthManager._instance;
    var user = auth && auth.getUser && auth.getUser();
    var username = user && (user.login || user.name);
    if (!username) { this._likingInProgress = false; return Promise.reject(new Error('Not authenticated')); }

    var self = this;
    return this.api.getWorldState(worldId).then(function (state) {
      if (!state) throw new Error('World not found');
      state.liked_by = state.liked_by || [];
      var idx = state.liked_by.indexOf(username);
      if (idx === -1) {
        state.liked_by.push(username);
        state.likes = (state.likes || 0) + 1;
      } else {
        state.liked_by.splice(idx, 1);
        state.likes = Math.max(0, (state.likes || 0) - 1);
      }
      return self.api.updateWorldState(worldId, state).then(function () {
        self.invalidateCache('worldList');
        self.invalidateCache('world_' + worldId);
        self._likingInProgress = false;
        return { liked: idx === -1, likes: state.likes };
      });
    }).catch(function (e) {
      self._likingInProgress = false;
      throw e;
    });
  };

  DataManager.prototype.submitIntervention = function (worldId, intervention) {
    var auth = window.AuthManager && window.AuthManager._instance;
    var user = auth && auth.getUser && auth.getUser();
    var username = user && (user.login || user.name);
    if (!username) return Promise.reject(new Error('Not authenticated'));

    var self = this;
    return this.api.getInterventions().then(function (history) {
      var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      var recent = history.filter(function (h) {
        return h.username === username && new Date(h.timestamp).getTime() > weekAgo;
      });
      if (recent.length >= 3) {
        throw new Error('本周干预次数已用完');
      }
      intervention.username = username;
      return self.api.submitIntervention(worldId, intervention);
    });
  };

  DataManager.prototype.getInterventions = function () {
    return this.api.getInterventions();
  };

  DataManager.prototype.refreshWorldMeta = function (worldId) {
    var self = this;
    self.invalidateCache('world_' + worldId);
    return this.getWorldMeta(worldId).then(function (meta) {
      if (meta) self.invalidateCache('worldList');
      return meta;
    });
  };

  DataManager.prototype.getWorldMeta = function (worldId) {
    return this._fetchWorldMeta(worldId);
  };

  DataManager.prototype.invalidateCache = function (key) {
    if (key) {
      delete this.cache[key];
      if (key === 'worldList') {
        try { localStorage.removeItem('dustworld_world_index'); } catch (e) {}
      }
    } else {
      this.cache = {};
      try { localStorage.removeItem('dustworld_world_index'); } catch (e) {}
    }
  };

  DataManager.prototype._getCached = function (key) {
    var entry = this.cache[key];
    if (!entry) return null;
    if (Date.now() - entry.time > this.cacheTTL) {
      delete this.cache[key];
      return null;
    }
    return entry.data;
  };

  DataManager.prototype._setCached = function (key, data) {
    this.cache[key] = { data: data, time: Date.now() };
  };

  window.DataManager = DataManager;
})();
