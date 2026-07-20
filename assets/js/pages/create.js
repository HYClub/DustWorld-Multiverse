(function () {
  'use strict';

  class CreateWorldPage {
    constructor() {
      this.step = 1;
      this.total = 4;
      this.data = { name: '', description: '' };
      this._cards = [];
      this.civs = [];
      this.selectedCiv = null;
    }

    init() {
      this._cache();
      this._bind();
      this._loadCivilizations();
      this._checkPending();
    }

    _readAllParams() {
      var g = function(id, def) {
        var el = document.getElementById(id);
        return el ? el.value : (def || 'normal');
      };
      return {
        map_size: g('p-map-size', 'medium'),
        world_shape: g('p-world-shape', 'continent'),
        latitude: g('p-latitude', 'temperate'),
        ocean_ratio: parseFloat(g('p-ocean', '50')),
        climate_type: g('p-climate', 'varied'),
        temperature: g('p-temperature', 'moderate'),
        rainfall: g('p-rainfall', 'moderate'),
        seasonality: g('p-seasonality', 'moderate'),
        disaster_freq: g('p-disaster', 'medium'),
        resource_abundance: g('p-resources', 'normal'),
        strategic_resource_freq: g('p-strategic', 'normal'),
        initial_population: parseInt(g('p-init-pop', '15')),
        population_growth_rate: parseFloat(g('p-growth', '1.0')),
        max_population_cap: g('p-pop-cap', 'normal'),
        initial_settlements: parseInt(g('p-init-setts', '3')),
        settlement_split_rate: parseFloat(g('p-split', '0.5')),
        tech_speed: g('p-tech', 'normal'),
        tech_diffusion: g('p-tech-diff', 'normal'),
        starting_tech: parseInt(g('p-start-tech', '0')),
        trade_openness: g('p-trade', 'normal'),
        economic_system: g('p-economy', 'mercantile'),
        tax_rate: g('p-tax', 'moderate'),
        cultural_identity: g('p-culture-id', 'diverse'),
        religion_type: g('p-religion', 'secular'),
        religion_spread: g('p-religion-spread', 'normal'),
        artistic_flourish: g('p-art', 'normal'),
        government_type: g('p-government', 'chiefdom'),
        war_tendency: g('p-war', 'normal'),
        military_spending: g('p-military', 'normal'),
        diplomacy_style: g('p-diplomacy', 'pragmatic')
      };
    }

    _checkPending() {
      var self = this;
      var pendingData = null;
      try { pendingData = JSON.parse(localStorage.getItem('dustworld_pending_create')); } catch(e) {}
      if (!pendingData) return;
      localStorage.removeItem('dustworld_pending_create');

      var auth = window.AuthManager && window.AuthManager._instance;
      if (!auth || !auth.isLoggedIn()) return;

      // Restore data
      this.data.name = pendingData.name || '';
      this.data.description = pendingData.description || '';
      if (this.nameInput) this.nameInput.value = this.data.name;
      if (this.descInput) this.descInput.value = this.data.description;

      if (pendingData.civ) {
        this.selectedCiv = pendingData.civ;
        // Highlight the civ card
        var cards = this.civGrid ? this.civGrid.querySelectorAll('.civ-card') : [];
        cards.forEach(function(c) {
          if (c.dataset.civId === pendingData.civ.id) {
            c.classList.add('selected');
            self._showLeaderInfo(pendingData.civ);
          }
        });
      }

      // Restore params
      if (pendingData.params) {
        var paramMap = {
          map_size: 'p-map-size', world_shape: 'p-world-shape', latitude: 'p-latitude', ocean_ratio: 'p-ocean',
          climate_type: 'p-climate', temperature: 'p-temperature', rainfall: 'p-rainfall', seasonality: 'p-seasonality',
          disaster_freq: 'p-disaster', resource_abundance: 'p-resources', strategic_resource_freq: 'p-strategic',
          initial_population: 'p-init-pop', population_growth_rate: 'p-growth', max_population_cap: 'p-pop-cap',
          initial_settlements: 'p-init-setts', settlement_split_rate: 'p-split',
          tech_speed: 'p-tech', tech_diffusion: 'p-tech-diff', starting_tech: 'p-start-tech',
          trade_openness: 'p-trade', economic_system: 'p-economy', tax_rate: 'p-tax',
          cultural_identity: 'p-culture-id', religion_type: 'p-religion', religion_spread: 'p-religion-spread',
          artistic_flourish: 'p-art',
          government_type: 'p-government', war_tendency: 'p-war', military_spending: 'p-military', diplomacy_style: 'p-diplomacy'
        };
        for (var key in pendingData.params) {
          var elId = paramMap[key];
          if (elId) {
            var el = document.getElementById(elId);
            if (el) el.value = pendingData.params[key];
          }
        }
      }

      // Auto-submit after a brief delay
      window.Toast.info('登录成功，正在创建世界...');
      setTimeout(function() { self.submit(); }, 800);
    }

    _cache() {
      this.el = document.getElementById('wizard-body');
      this.panes = this.el && this.el.querySelectorAll('.ws-pane');
      this.steps = document.getElementById('wizard-steps');
      this.prevBtn = document.getElementById('wizard-prev');
      this.nextBtn = document.getElementById('wizard-next');
      this.createBtn = document.getElementById('wizard-create');
      this.nameInput = document.getElementById('world-name-input');
      this.descInput = document.getElementById('world-desc-input');
      this._cards = [].slice.call(document.querySelectorAll('.wz-card'));
      this.civGrid = document.getElementById('civ-grid');
      this.leaderInfo = document.getElementById('leader-info');
    }

    _bind() {
      var self = this;
      if (this.prevBtn) this.prevBtn.addEventListener('click', function () { self.go(-1); });
      if (this.nextBtn) this.nextBtn.addEventListener('click', function () { self.go(1); });
      if (this.createBtn) this.createBtn.addEventListener('click', function () { self.submit(); });
      if (this.nameInput) {
        this.nameInput.addEventListener('input', function () { self.data.name = this.value; });
      }
      if (this.descInput) {
        this.descInput.addEventListener('input', function () { self.data.description = this.value; });
      }
    }

    _loadCivilizations() {
      var self = this;
      // Try to load civ data from inline or fetch
      if (window.CIVILIZATIONS) {
        self.civs = window.CIVILIZATIONS.antiquity || [];
        self._renderCivGrid();
        self.show(1);
        return;
      }
      // Fetch from data file
      fetch('data/civilizations.json').then(function(r) { return r.json(); }).then(function(data) {
        window.CIVILIZATIONS = data;
        if (window.CivEngine) window.CivEngine.setCivData(data);
        self.civs = data.antiquity || [];
        self._renderCivGrid();
        self.show(1);
      }).catch(function() {
        self.civs = [];
        self._renderCivGrid();
        self.show(1);
      });
    }

    _renderCivGrid() {
      if (!this.civGrid) return;
      var self = this;
      this.civGrid.innerHTML = '';
      this.civs.forEach(function(civ) {
        var card = document.createElement('div');
        card.className = 'civ-card';
        card.dataset.civId = civ.id;
        card.innerHTML =
          '<div class="civ-card-name">' + civ.name + '</div>' +
          '<div class="civ-card-leader">' + civ.leader_name + '</div>' +
          '<div class="civ-card-ability">' + civ.ability.split('—')[0].trim() + '</div>' +
          '<div class="civ-card-unit">' + civ.unique_unit.split('—')[0].trim() + '</div>';
        card.addEventListener('click', function() {
          self.civGrid.querySelectorAll('.civ-card').forEach(function(c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          self.selectedCiv = civ;
          self._showLeaderInfo(civ);
        });
        self.civGrid.appendChild(card);
      });
      if (this.civs.length > 0) {
        this.civGrid.firstChild.click();
      }
    }

    _showLeaderInfo(civ) {
      if (!this.leaderInfo) return;
      this.leaderInfo.innerHTML =
        '<div class="leader-detail">' +
        '<div class="leader-name">👑 ' + civ.leader_name + '</div>' +
        '<div class="leader-civ">' + civ.name + '文明</div>' +
        '<div class="leader-ability"><strong>文明能力:</strong> ' + civ.ability + '</div>' +
        '<div class="leader-unit"><strong>特色单位:</strong> ' + civ.unique_unit + '</div>' +
        '<div class="leader-building"><strong>特色建筑:</strong> ' + (civ.unique_building || '无') + '</div>' +
        '<div class="leader-agenda"><strong>元首议程:</strong> ' + (civ.agenda ? civ.agenda.name : '标准') + '</div>' +
        '</div>';
    }

    show(n) {
      if (n < 1 || n > this.total) return;
      this.step = n;
      var panes = this.panes;
      if (panes) {
        for (var i = 0; i < panes.length; i++) {
          panes[i].classList.toggle('active', parseInt(panes[i].getAttribute('data-step'), 10) === n);
        }
      }
      var items = this.steps && this.steps.querySelectorAll('.ws-item');
      if (items) {
        items.forEach(function(it) {
          var s = parseInt(it.getAttribute('data-step'), 10);
          it.classList.toggle('active', s === n);
          it.classList.toggle('completed', s < n);
        });
      }
      if (this.prevBtn) this.prevBtn.style.visibility = n > 1 ? 'visible' : 'hidden';
      if (this.nextBtn) this.nextBtn.style.display = n < this.total ? '' : 'none';
      if (this.createBtn) this.createBtn.style.display = n === this.total ? '' : 'none';
      if (this.nameInput && n === 1) {
        var self = this;
        setTimeout(function() { if (self.nameInput) self.nameInput.focus(); }, 100);
      }
      if (n === this.total) this._updateSummary();
    }

    go(dir) {
      if (dir > 0 && !this._validate()) return;
      this.show(this.step + dir);
    }

    _validate() {
      if (this.step === 1) {
        var name = (this.data.name || '').trim();
        if (name.length < 2 || name.length > 20) {
          window.Toast.warning('世界名称为2-20个字符');
          if (this.nameInput) this.nameInput.focus();
          return false;
        }
      }
      if (this.step === 2 && !this.selectedCiv) {
        window.Toast.warning('请选择一个文明');
        return false;
      }
      return true;
    }

    _updateSummary() {
      var civ = this.selectedCiv;
      var setText = function(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text || '-';
      };
      setText('summary-name', this.data.name || '未命名');
      setText('summary-desc', this.data.description || '(无描述)');
      setText('summary-civ', civ ? civ.name : '-');
      setText('summary-leader', civ ? civ.leader_name : '-');
      setText('summary-civ-ability', civ ? civ.ability.split('—')[0].trim() : '-');
      setText('summary-civ-unit', civ ? civ.unique_unit.split('—')[0].trim() : '-');
      setText('summary-civ-building', civ && civ.unique_building ? civ.unique_building.split('—')[0].trim() : '-');
      var params = this._readAllParams();
      setText('summary-map', params.map_size || 'medium');
      setText('summary-ocean', (params.ocean_ratio || 50) + '%');
    }

    submit() {
      if (!this._validate()) return;
      if (!this.selectedCiv) { window.Toast.warning('请选择文明'); return; }

      var auth = window.AuthManager && window.AuthManager._instance;
      if (!auth || !auth.isLoggedIn()) {
        var pending = { name: this.data.name, description: this.data.description, civ: this.selectedCiv, params: this._readAllParams() };
        try { localStorage.setItem('dustworld_pending_create', JSON.stringify(pending)); } catch (e) {}
        window.Toast.info('请先登录，登录后自动创建世界');
        auth.login();
        return;
      }

      var btn = this.createBtn;
      btn.disabled = true;
      btn.textContent = '创世中…';

      var id = 'world_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
      var config = this._readAllParams();
      config.name = this.data.name || '未命名世界';
      config.description = this.data.description || '';
      config.seed = Date.now();
      var civ = this.selectedCiv;

      var engine = new window.WorldEngine(config);
      engine.initialize();
      engine.setCivilization('antiquity', civ.id, civ.leader, civ);

      var worldData = engine.getState();
      worldData.world_id = id;
      worldData.config = config;

      var dm = window.DataManager;
      if (!dm || typeof dm.createWorld !== 'function') {
        btn.disabled = false;
        btn.textContent = '✦ 创世';
        window.Toast.error('数据服务不可用');
        return;
      }

      dm.createWorld(worldData).then(function () {
        btn.disabled = false;
        btn.textContent = '✦ 创世';
        window.Toast.success('世界已创建，文明崛起！');
        setTimeout(function () {
          window.location.hash = '#/world?id=' + id;
        }, 500);
      }).catch(function (e) {
        btn.disabled = false;
        btn.textContent = '✦ 创世';
        window.Toast.error('创建失败: ' + (e.message || '云端保存失败'));
      });
    }

    destroy() {}
  }

  window.CreateWorldPage = CreateWorldPage;
})();
