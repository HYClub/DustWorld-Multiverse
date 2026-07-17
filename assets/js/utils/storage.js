(function () {
  'use strict';

  var APP_PREFIX = 'dustworld_';

  var StorageManager = function () {};

  StorageManager.prototype.get = function (key, defaultValue) {
    if (defaultValue === undefined) defaultValue = null;
    try {
      var val = localStorage.getItem(APP_PREFIX + key);
      if (val === null) return defaultValue;
      return JSON.parse(val);
    } catch (e) {
      return defaultValue;
    }
  };

  StorageManager.prototype.set = function (key, value) {
    try {
      localStorage.setItem(APP_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      /* storage full or unavailable */
    }
  };

  StorageManager.prototype.remove = function (key) {
    try {
      localStorage.removeItem(APP_PREFIX + key);
    } catch (e) { /* ignore */ }
  };

  StorageManager.prototype.clear = function () {
    try {
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(APP_PREFIX) === 0) {
          keysToRemove.push(k);
        }
      }
      for (var j = 0; j < keysToRemove.length; j++) {
        localStorage.removeItem(keysToRemove[j]);
      }
    } catch (e) { /* ignore */ }
  };

  StorageManager.prototype.getToken = function () {
    return this.get('github_token');
  };

  StorageManager.prototype.setToken = function (token) {
    this.set('github_token', token);
  };

  StorageManager.prototype.getUser = function () {
    return this.get('github_user');
  };

  StorageManager.prototype.setUser = function (user) {
    this.set('github_user', user);
  };

  StorageManager.prototype.getLikedWorlds = function () {
    return this.get('liked_worlds', []);
  };

  StorageManager.prototype.addLikedWorld = function (id) {
    var list = this.getLikedWorlds();
    if (list.indexOf(id) === -1) {
      list.push(id);
      this.set('liked_worlds', list);
    }
  };

  StorageManager.prototype.removeLikedWorld = function (id) {
    var list = this.getLikedWorlds().filter(function (x) { return x !== id; });
    this.set('liked_worlds', list);
  };

  StorageManager.prototype.isLiked = function (id) {
    return this.getLikedWorlds().indexOf(id) !== -1;
  };

  StorageManager.prototype.toggleLiked = function (id) {
    if (this.isLiked(id)) {
      this.removeLikedWorld(id);
      return false;
    } else {
      this.addLikedWorld(id);
      return true;
    }
  };

  window.StorageManager = StorageManager;
})();
