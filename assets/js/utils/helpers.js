(function () {
  'use strict';

  var ERA_NAMES = {
    primitive: '原始时代',
    agriculture: '农耕时代',
    bronze: '青铜时代',
    iron: '铁器时代',
    steam: '蒸汽时代',
    electric: '电气时代',
    info: '信息时代'
  };

  var ERA_COLORS = {
    primitive: '#8B7355',
    agriculture: '#6B8E23',
    bronze: '#CD853F',
    iron: '#708090',
    steam: '#B0C4DE',
    electric: '#FFD700',
    info: '#00CED1'
  };

  var ERA_LEVELS = {
    primitive: 0,
    agriculture: 1,
    bronze: 2,
    iron: 3,
    steam: 4,
    electric: 5,
    info: 6
  };

  function formatNumber(n) {
    if (n === null || n === undefined) return '0';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatYear(year) {
    if (year === null || year === undefined) return '第 0 年';
    return '第' + year + '年';
  }

  function getEraColor(techLevel) {
    if (techLevel === null || techLevel === undefined) return ERA_COLORS.primitive;
    var levels = ['primitive', 'agriculture', 'bronze', 'iron', 'steam', 'electric', 'info'];
    var idx = Math.min(Math.max(techLevel, 0), levels.length - 1);
    return ERA_COLORS[levels[idx]];
  }

  function getEraName(level) {
    if (level === null || level === undefined) return ERA_NAMES.primitive;
    if (typeof level === 'string') return ERA_NAMES[level] || level;
    var levels = ['primitive', 'agriculture', 'bronze', 'iron', 'steam', 'electric', 'info'];
    var idx = Math.min(Math.max(level, 0), levels.length - 1);
    return ERA_NAMES[levels[idx]];
  }

  function getEraKey(level) {
    if (typeof level === 'string') {
      if (ERA_NAMES[level]) return level;
      return 'primitive';
    }
    var levels = ['primitive', 'agriculture', 'bronze', 'iron', 'steam', 'electric', 'info'];
    var idx = Math.min(Math.max(level, 0), levels.length - 1);
    return levels[idx];
  }

  function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    var now = new Date();
    var diffMs = now - date;
    var diffSec = Math.floor(diffMs / 1000);
    var diffMin = Math.floor(diffSec / 60);
    var diffHour = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHour / 24);
    var diffWeek = Math.floor(diffDay / 7);
    var diffMonth = Math.floor(diffDay / 30);
    var diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return '刚刚';
    if (diffMin < 60) return diffMin + '分钟前';
    if (diffHour < 24) return diffHour + '小时前';
    if (diffDay < 7) return diffDay + '天前';
    if (diffWeek < 4) return diffWeek + '周前';
    if (diffMonth < 12) return diffMonth + '个月前';
    return diffYear + '年前';
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
        timer = null;
      }, delay);
    };
  }

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

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function weightedRandom(weights) {
    var keys = Object.keys(weights);
    var total = 0;
    for (var i = 0; i < keys.length; i++) {
      total += weights[keys[i]];
    }
    var r = Math.random() * total;
    var cumulative = 0;
    for (var i = 0; i < keys.length; i++) {
      cumulative += weights[keys[i]];
      if (r < cumulative) return keys[i];
    }
    return keys[keys.length - 1];
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function pickRandom(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function formatDuration(years) {
    if (!years && years !== 0) return '';
    if (years < 1) return '不到一年';
    return years + '年';
  }

  function getEraLevel(key) {
    return ERA_LEVELS[key] !== undefined ? ERA_LEVELS[key] : 0;
  }

  function createWorldCard(world) {
    var card = document.createElement('world-card');
    if (card.setAttribute) {
      card.setAttribute('world-id', world.world_id || '');
      card.setAttribute('name', world.name || '');
      card.setAttribute('creator', world.creator || '');
      card.setAttribute('creator-avatar', world.creator_avatar || '');
      card.setAttribute('year', String(world.year || 0));
      card.setAttribute('era', world.era || 'primitive');
      card.setAttribute('era-name', world.eraName || world.era || '\u539f\u59cb\u65f6\u4ee3');
      card.setAttribute('population', String((world.stats && world.stats.total_population) || 0));
      card.setAttribute('settlements', String((world.stats && world.stats.total_settlements) || 0));
      card.setAttribute('likes', String(world.likes || 0));
      card.setAttribute('description', world.description || '');
      card.setAttribute('updated-at', world.updatedAt || '');
      card.setAttribute('last-evolved-at', world.lastEvolvedAt || '');
      if (world.terrain && world.terrain.tiles) {
        card.setAttribute('terrain', JSON.stringify(world.terrain.tiles));
      }
      var auth = window.AuthManager && window.AuthManager._instance;
      var user = auth && auth.getUser && auth.getUser();
      var username = user && (user.login || user.name);
      var isLiked = username && world.liked_by && world.liked_by.indexOf(username) !== -1;
      card.setAttribute('is-liked', isLiked ? 'true' : 'false');
    }
    card.addEventListener('click', function (e) {
      var likeBtn = card.shadowRoot ? card.shadowRoot.querySelector('.like-btn') : null;
      if (likeBtn && likeBtn.contains(e.target)) return;
      window.location.hash = '#/world?id=' + (world.world_id || '');
    });
    card.addEventListener('like-toggle', function (e) {
      var detail = e.detail || {};
      if (detail.liked === undefined || !detail.worldId) return;
      var auth = window.AuthManager && window.AuthManager._instance;
      if (!auth || !auth.isLoggedIn()) { return; }
      var dm = window.DataManager;
      if (dm && typeof dm.toggleLike === 'function') {
        dm.toggleLike(detail.worldId).then(function (result) {
          card.update({ isLiked: result.liked, likes: String(result.likes) });
          world.likes = result.likes;
        }).catch(function () {});
      }
    });
    card.addEventListener('world-refresh', function (e) {
      var detail = e.detail || {};
      if (!detail.worldId) return;
      var dm = window.DataManager;
      if (dm && typeof dm.refreshWorldMeta === 'function') {
        dm.refreshWorldMeta(detail.worldId).then(function (meta) {
          if (!meta) return;
          card.update({
            year: String((meta && meta.year) || 0),
            era: (meta && meta.era) || 'primitive',
            population: String((meta && ((meta.stats && meta.stats.total_population) || meta.population)) || 0),
            settlements: String((meta && ((meta.stats && meta.stats.total_settlements) || meta.settlements)) || 0),
            updatedAt: (meta && meta.updatedAt) || '',
            lastEvolvedAt: (meta && meta.lastEvolvedAt) || ''
          });
          if (meta) {
            world.year = meta.year;
            world.era = meta.era;
            world.lastEvolvedAt = meta.lastEvolvedAt;
          }
        }).catch(function () { card.update({}); });
      }
    });
    return card;
  }

  window.helpers = {
    createWorldCard: createWorldCard,
    formatNumber: formatNumber,
    formatYear: formatYear,
    getEraColor: getEraColor,
    getEraName: getEraName,
    getEraKey: getEraKey,
    getEraLevel: getEraLevel,
    getTimeAgo: getTimeAgo,
    debounce: debounce,
    generateId: generateId,
    randomInt: randomInt,
    randomFloat: randomFloat,
    clamp: clamp,
    weightedRandom: weightedRandom,
    shuffleArray: shuffleArray,
    pickRandom: pickRandom,
    deepClone: deepClone,
    formatDuration: formatDuration
  };
})();
