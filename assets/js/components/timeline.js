(function () {
  'use strict';

  var EVENTS_PER_PAGE = 50;

  var TYPE_CONFIG = {
    tech_breakthrough: { color: '#6c5ce7', label: '技术突破', icon: '💡' },
    war: { color: '#e17055', label: '战争', icon: '⚔️' },
    disaster: { color: '#fdcb6e', label: '灾害', icon: '🌊' },
    plague: { color: '#e17055', label: '瘟疫', icon: '☠️' },
    intervention: { color: '#00cec9', label: '干预', icon: '🔮' },
    cultural_boom: { color: '#fd79a8', label: '文化繁荣', icon: '🎭' },
    hero_birth: { color: '#ffd700', label: '英雄诞生', icon: '⭐' },
    default: { color: '#8888aa', label: '事件', icon: '📜' }
  };

  var Timeline = function (container) {
    this.container = container;
    this.allEvents = [];
    this.displayedCount = 0;
    this.currentEraFilter = 'all';
    this.currentTypeFilter = 'all';
    this._scrolledToBottom = false;
    this._loading = false;

    this._init();
  };

  Timeline.prototype._init = function () {
    if (!this.container) return;

    this.container.style.position = 'relative';

    var self = this;

    this._scrollHandler = function () {
      if (self._loading) return;
      var rect = self.container.getBoundingClientRect();
      if (rect.bottom <= window.innerHeight + 200) {
        self._loadMore();
      }
    };

    window.addEventListener('scroll', this._scrollHandler);
  };

  Timeline.prototype.setEvents = function (events) {
    this.allEvents = Array.isArray(events) ? events : [];
    this.displayedCount = 0;
    this._render();
  };

  Timeline.prototype.appendEvents = function (events) {
    if (!Array.isArray(events)) return;
    this.allEvents = this.allEvents.concat(events);
    this._render();
  };

  Timeline.prototype.clear = function () {
    this.allEvents = [];
    this.displayedCount = 0;
    if (this.container) {
      this.container.innerHTML = '';
    }
  };

  Timeline.prototype.setEraFilter = function (era) {
    this.currentEraFilter = era || 'all';
    this.displayedCount = 0;
    this._render();
  };

  Timeline.prototype.setTypeFilter = function (type) {
    this.currentTypeFilter = type || 'all';
    this.displayedCount = 0;
    this._render();
  };

  Timeline.prototype.destroy = function () {
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
    }
    this.allEvents = [];
    this.container = null;
  };

  Timeline.prototype._getFilteredEvents = function () {
    var self = this;
    return this.allEvents.filter(function (evt) {
      if (self.currentEraFilter !== 'all' && evt.era && evt.era !== self.currentEraFilter) {
        return false;
      }
      if (self.currentTypeFilter !== 'all') {
        var normalizedType = (evt.type || 'default').toLowerCase();
        var filterType = self.currentTypeFilter.toLowerCase();
        if ((filterType === 'breakthrough' && normalizedType !== 'tech_breakthrough') &&
            normalizedType !== filterType) {
          return false;
        }
        if (filterType === 'culture' && normalizedType !== 'cultural_boom') return false;
        if (filterType !== 'breakthrough' && filterType !== 'culture' && normalizedType !== filterType) {
          return false;
        }
      }
      return true;
    });
  };

  Timeline.prototype._render = function () {
    if (!this.container) return;

    var filtered = this._getFilteredEvents();

    var sorted = filtered.slice().sort(function (a, b) {
      return (b.year || 0) - (a.year || 0);
    });

    var totalToShow = Math.min(sorted.length, EVENTS_PER_PAGE);

    if (this.displayedCount === 0) {
      this.container.innerHTML = '';
    }

    var startIdx = this.displayedCount;
    var endIdx = Math.min(startIdx + totalToShow, sorted.length);

    for (var i = startIdx; i < endIdx; i++) {
      this._renderEvent(sorted[i]);
    }

    this.displayedCount = endIdx;

    this._renderLoadMore(endIdx, sorted.length);
  };

  Timeline.prototype._loadMore = function () {
    if (this._loading) return;

    var filtered = this._getFilteredEvents();
    if (this.displayedCount >= filtered.length) return;

    this._loading = true;
    this._render();
    this._loading = false;
  };

  Timeline.prototype._renderEvent = function (evt) {
    var type = evt.type || 'default';
    var config = TYPE_CONFIG[type] || TYPE_CONFIG.default;

    var year = evt.year || 0;
    var description = evt.description || '';

    var el = document.createElement('div');
    el.className = 'event-item';
    el.style.borderLeftColor = config.color;

    var yearEl = document.createElement('div');
    yearEl.className = 'event-year';
    yearEl.textContent = '第 ' + year + ' 年';

    var textEl = document.createElement('div');
    textEl.className = 'event-text';

    var iconSpan = document.createElement('span');
    iconSpan.textContent = config.icon + ' ';
    textEl.appendChild(iconSpan);

    var strongEl = document.createElement('strong');
    strongEl.textContent = '【' + config.label + '】';
    textEl.appendChild(strongEl);

    var descText = document.createTextNode(' ' + description);
    textEl.appendChild(descText);

    el.appendChild(yearEl);
    el.appendChild(textEl);

    this.container.appendChild(el);
  };

  Timeline.prototype._renderLoadMore = function (displayed, total) {
    var existing = this.container ? this.container.querySelector('.timeline-load-more') : null;
    if (existing) {
      if (displayed >= total) {
        existing.textContent = '已显示全部 ' + total + ' 条事件';
      } else {
        existing.textContent = '显示更多 (' + (total - displayed) + ' 条剩余)';
      }
      return;
    }
    if (displayed >= total) return;

    var loadMore = document.createElement('div');
    loadMore.className = 'timeline-load-more';
    loadMore.style.cssText =
      'text-align:center;padding:12px;font-size:13px;color:var(--text-muted);cursor:pointer;' +
      'transition:color 0.2s ease;';
    loadMore.textContent = '加载更多 (' + (total - displayed) + ' 条剩余)';

    var self = this;
    loadMore.addEventListener('click', function () {
      self._loadMore();
    });

    loadMore.addEventListener('mouseenter', function () {
      loadMore.style.color = 'var(--color-primary-light)';
    });
    loadMore.addEventListener('mouseleave', function () {
      loadMore.style.color = 'var(--text-muted)';
    });

    if (this.container) this.container.appendChild(loadMore);
  };

  Timeline.prototype.getEventTypeColor = function (type) {
    var config = TYPE_CONFIG[type] || TYPE_CONFIG.default;
    return config.color;
  };

  window.Timeline = Timeline;
})();
