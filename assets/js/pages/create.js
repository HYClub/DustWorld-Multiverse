(function () {
  'use strict';

  class CreateWorldPage {
    constructor() {
      this.step = 1;
      this.total = 5;
      this.data = { name: '', description: '' };
      this._cards = [];
      this.civs = [];
      this.selectedCiv = null;
      this.origins = {};
      this.selectedOrigin = null;
      this.selectedSpecies = null;
    }

    init() {
      this._cache();
      this._bind();
      this._loadOrigins();
      this._loadCivilizations();
      this._checkPending();
    }

    _loadOrigins() {
      var self = this;
      fetch('data/origins.json').then(function(r) { return r.json(); }).then(function(data) {
        self.origins = data;
        self._renderOriginGrid();
        self.show(1);
      }).catch(function() {
        self.origins = {};
        self.show(1);
      });
    }

    _renderOriginGrid() {
      if (!this.originGrid) return;
      var self = this;
      this.originGrid.innerHTML = '';
      var keys = ['history', 'evolution', 'awakening', 'xeno', 'arrival'];
      keys.forEach(function(key) {
        var origin = self.origins[key];
        if (!origin) return;
        var card = document.createElement('div');
        card.className = 'origin-card';
        card.dataset.originId = key;
        card.innerHTML =
          '<div class="origin-card-icon">' + (origin.icon || '❓') + '</div>' +
          '<div class="origin-card-name">' + (origin.name || key) + '</div>' +
          '<div class="origin-card-desc">' + (origin.description || '').slice(0, 50) + '…</div>';
        card.addEventListener('click', function() {
          self.originGrid.querySelectorAll('.origin-card').forEach(function(c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          self.selectedOrigin = origin;
          self.selectedSpecies = null;
          self.selectedCiv = null;
          self._showOriginDetail(origin);
        });
        self.originGrid.appendChild(card);
      });
      if (this.originGrid.children.length > 0) {
        this.originGrid.firstChild.click();
      }
    }

    _showOriginDetail(origin) {
      if (!this.originDetail) return;
      var speciesList = (origin.species || []).map(function(s) { return '<span class="origin-species-tag">' + (s.icon || '') + ' ' + s.name + '</span>'; }).join(' ');
      var extra = '';
      if (origin.extra_params) {
        extra = '<div style="margin-top:8px;font-size:12px;color:var(--text-secondary);">额外参数将在参数页中显示</div>';
      }
      this.originDetail.innerHTML =
        '<div class="origin-detail-box">' +
        '<div class="origin-detail-name">' + (origin.icon || '') + ' ' + origin.name + '</div>' +
        '<div class="origin-detail-desc">' + (origin.description || '') + '</div>' +
        (speciesList ? '<div class="origin-species-list">可能物种：' + speciesList + '</div>' : '') +
        extra +
        '</div>';
    }

    _readAllParams() {
      var g = function(id, def) {
        var el = document.getElementById(id);
        return el ? el.value : (def || 'normal');
      };
      var params = {
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
      if (this.selectedOrigin && this.selectedOrigin.extra_params) {
        for (var ek in this.selectedOrigin.extra_params) {
          var ep = this.selectedOrigin.extra_params[ek];
          params[ek] = g('p-extra-' + ek, ep.default || 'normal');
        }
      }
      return params;
    }

    _checkPending() {
      var self = this;
      var pendingData = null;
      try { pendingData = JSON.parse(localStorage.getItem('dustworld_pending_create')); } catch(e) {}
      if (!pendingData) return;
      localStorage.removeItem('dustworld_pending_create');

      var auth = window.AuthManager && window.AuthManager._instance;
      if (!auth || !auth.isLoggedIn()) return;

      this.data.name = pendingData.name || '';
      this.data.description = pendingData.description || '';
      if (this.nameInput) this.nameInput.value = this.data.name;
      if (this.descInput) this.descInput.value = this.data.description;

      if (pendingData.origin_id && this.origins[pendingData.origin_id]) {
        this.selectedOrigin = this.origins[pendingData.origin_id];
      }

      if (pendingData.species) {
        this.selectedSpecies = pendingData.species;
      } else if (pendingData.civ) {
        this.selectedCiv = pendingData.civ;
        var cards = this.civGrid ? this.civGrid.querySelectorAll('.civ-card') : [];
        cards.forEach(function(c) {
          if (c.dataset.civId === pendingData.civ.id) {
            c.classList.add('selected');
            self._showLeaderInfo(pendingData.civ);
          }
        });
      }

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
      this.originGrid = document.getElementById('origin-grid');
      this.originDetail = document.getElementById('origin-detail');
      this.civGrid = document.getElementById('civ-grid');
      this.leaderInfo = document.getElementById('leader-info');
      this.step3Icon = document.getElementById('step3-icon');
      this.step3Title = document.getElementById('step3-title');
      this.step3Desc = document.getElementById('step3-desc');
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
      if (window.CIVILIZATIONS) {
        self.civs = window.CIVILIZATIONS.antiquity || [];
        self._renderCivGrid();
        return;
      }
      fetch('data/civilizations.json').then(function(r) { return r.json(); }).then(function(data) {
        window.CIVILIZATIONS = data;
        if (window.CivEngine) window.CivEngine.setCivData(data);
        self.civs = data.antiquity || [];
        self._renderCivGrid();
      }).catch(function() {
        self.civs = [];
        self._renderCivGrid();
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
        card.style.display = 'none';
        card.innerHTML =
          '<div class="civ-card-name">' + civ.name + '</div>' +
          '<div class="civ-card-leader">' + civ.leader_name + '</div>' +
          '<div class="civ-card-ability">' + civ.ability.split('—')[0].trim() + '</div>' +
          '<div class="civ-card-unit">' + civ.unique_unit.split('—')[0].trim() + '</div>';
        card.addEventListener('click', function() {
          self.civGrid.querySelectorAll('.civ-card').forEach(function(c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          self.selectedCiv = civ;
          self.selectedSpecies = null;
          self._showLeaderInfo(civ);
        });
        self.civGrid.appendChild(card);
      });
    }

    _renderSpeciesGrid(speciesList) {
      if (!this.civGrid) return;
      var self = this;
      this.civGrid.innerHTML = '';
      speciesList.forEach(function(species) {
        var card = document.createElement('div');
        card.className = 'civ-card';
        card.dataset.speciesId = species.id;
        card.innerHTML =
          '<div class="civ-card-icon-large">' + (species.icon || '❓') + '</div>' +
          '<div class="civ-card-name">' + species.name + '</div>' +
          '<div class="civ-card-ability">' + (species.desc || '') + '</div>';
        card.addEventListener('click', function() {
          self.civGrid.querySelectorAll('.civ-card').forEach(function(c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          self.selectedSpecies = species;
          self.selectedCiv = null;
          self._showSpeciesInfo(species);
        });
        self.civGrid.appendChild(card);
      });
      if (speciesList.length > 0) {
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

    _showSpeciesInfo(species) {
      if (!this.leaderInfo) return;
      var bonuses = [];
      var bm = species.bonuses || {};
      if (bm.military_multiply) bonuses.push('⚔️ 战力 x' + bm.military_multiply);
      if (bm.tech_multiply) bonuses.push('🔬 科技 x' + bm.tech_multiply);
      if (bm.culture_multiply) bonuses.push('🎭 文化 x' + bm.culture_multiply);
      if (bm.growth_rate) bonuses.push('📈 生长 x' + bm.growth_rate);
      if (bm.population_growth) bonuses.push('👥 人口 x' + bm.population_growth);
      if (bm.trade_income) bonuses.push('💰 贸易 x' + bm.trade_income);
      if (bm.stability) bonuses.push('⚖️ 稳定 +' + Math.round(bm.stability * 100) + '%');
      if (bm.health_bonus) bonuses.push('❤️ 健康 +' + Math.round(bm.health_bonus * 100) + '%');
      if (bm.diplomacy_bonus !== undefined) bonuses.push('🤝 外交 ' + (bm.diplomacy_bonus >= 0 ? '+' : '') + Math.round(bm.diplomacy_bonus * 100) + '%');
      if (bm.production_bonus) bonuses.push('🏭 生产 x' + bm.production_bonus);
      this.leaderInfo.innerHTML =
        '<div class="leader-detail">' +
        '<div class="leader-name">' + (species.icon || '') + ' ' + species.name + '</div>' +
        '<div class="leader-desc">' + (species.desc || '') + '</div>' +
        (bonuses.length > 0 ? '<div class="species-bonuses">' + bonuses.join('') + '</div>' : '') +
        '</div>';
    }

    show(n) {
      if (n < 1 || n > this.total) return;
      this.step = n;

      // Update step 3 based on origin
      if (n === 3 && this.selectedOrigin) {
        if (this.selectedOrigin.id === 'history') {
          if (this.step3Icon) this.step3Icon.textContent = '🏛️';
          if (this.step3Title) this.step3Title.textContent = '选择文明';
          if (this.step3Desc) this.step3Desc.textContent = '古典时代的先民将奠定你文明的根基';
          // Show civ cards
          var self = this;
          this.civGrid.querySelectorAll('.civ-card').forEach(function(c) { c.style.display = ''; });
          this._renderCivGrid();
          if (this.civs.length > 0) this.civGrid.firstChild.click();
        } else {
          if (this.step3Icon) this.step3Icon.textContent = this.selectedOrigin.icon || '🧬';
          if (this.step3Title) this.step3Title.textContent = this.selectedOrigin.name + ' — 选择物种';
          if (this.step3Desc) this.step3Desc.textContent = '在演化之路的尽头，哪种智慧将主宰这个世界？';
          this._renderSpeciesGrid(this.selectedOrigin.species || []);
        }
      }

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
      if (this.step === 2 && !this.selectedOrigin) {
        window.Toast.warning('请选择创世起源');
        return false;
      }
      if (this.step === 3) {
        if (this.selectedOrigin && this.selectedOrigin.id === 'history' && !this.selectedCiv) {
          window.Toast.warning('请选择一个文明');
          return false;
        }
        if (this.selectedOrigin && this.selectedOrigin.id !== 'history' && !this.selectedSpecies) {
          window.Toast.warning('请选择一个物种');
          return false;
        }
      }
      return true;
    }

    _updateSummary() {
      var setText = function(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text || '-';
      };
      setText('summary-name', this.data.name || '未命名');
      setText('summary-desc', this.data.description || '(无描述)');
      if (this.selectedOrigin) {
        setText('summary-origin', (this.selectedOrigin.icon || '') + ' ' + this.selectedOrigin.name);
      } else {
        setText('summary-origin', '-');
      }
      if (this.selectedSpecies) {
        setText('summary-civ', (this.selectedSpecies.icon || '') + ' ' + this.selectedSpecies.name);
        setText('summary-leader', (this.selectedSpecies.flavor ? this.selectedSpecies.flavor.leader_title : '首领'));
        setText('summary-civ-ability', this.selectedSpecies.desc || '-');
        setText('summary-civ-unit', '-');
        setText('summary-civ-building', '-');
      } else if (this.selectedCiv) {
        setText('summary-civ', this.selectedCiv.name);
        setText('summary-leader', this.selectedCiv.leader_name);
        setText('summary-civ-ability', this.selectedCiv.ability.split('—')[0].trim());
        setText('summary-civ-unit', this.selectedCiv.unique_unit.split('—')[0].trim());
        setText('summary-civ-building', this.selectedCiv.unique_building ? this.selectedCiv.unique_building.split('—')[0].trim() : '-');
      } else {
        setText('summary-civ', '-');
        setText('summary-leader', '-');
        setText('summary-civ-ability', '-');
        setText('summary-civ-unit', '-');
        setText('summary-civ-building', '-');
      }
      var params = this._readAllParams();
      setText('summary-map', params.map_size || 'medium');
      setText('summary-ocean', (params.ocean_ratio || 50) + '%');
    }

    submit() {
      if (!this._validate()) return;
      if (!this.selectedOrigin) { window.Toast.warning('请选择创世起源'); return; }
      if (this.selectedOrigin.id === 'history' && !this.selectedCiv) { window.Toast.warning('请选择文明'); return; }
      if (this.selectedOrigin.id !== 'history' && !this.selectedSpecies) { window.Toast.warning('请选择物种'); return; }

      var auth = window.AuthManager && window.AuthManager._instance;
      if (!auth || !auth.isLoggedIn()) {
        var pending = {
          name: this.data.name,
          description: this.data.description,
          origin_id: this.selectedOrigin.id,
          species: this.selectedSpecies,
          civ: this.selectedCiv,
          params: this._readAllParams()
        };
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
      config.origin = this.selectedOrigin.id;

      var engine, worldData;
      if (this.selectedOrigin.id === 'history') {
        var civ = this.selectedCiv;
        engine = new window.WorldEngine(config);
        engine.initialize();
        engine.setCivilization('antiquity', civ.id, civ.leader, civ);
        worldData = engine.getState();
        worldData.config = config;
      } else {
        var species = this.selectedSpecies;
        config.species = species.id;
        engine = new window.WorldEngine(config);
        engine.initialize();
        // Set species as the active civilization with its bonuses
        var speciesCiv = {
          id: species.id,
          name: species.name,
          leader_name: (species.flavor ? species.flavor.leader_title : '首领'),
          ability: species.desc,
          unique_unit: '',
          unique_building: '',
          bonuses: species.bonuses || {},
          agenda: { name: '物种生存', weights: {} }
        };
        engine.state.civilization.antiquity = { civ: species.id, leader: '自然', data: speciesCiv };
        engine.state.active_civ = speciesCiv;
        engine.state.active_leader = speciesCiv.leader_name;
        worldData = engine.getState();
        worldData.config = config;
        worldData.origin_species = species;
      }

      worldData.world_id = id;
      var user = auth.getUser && auth.getUser();
      if (user) {
        worldData.creator = user.login || user.name;
        worldData.creator_avatar = user.avatar_url || '';
      }

      var firstEntry = this._createFirstChronicle(config, this.selectedSpecies || this.selectedCiv);
      if (!worldData.history) worldData.history = [];
      worldData.history.unshift(firstEntry);

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

    _createFirstChronicle(config, entity) {
      if (!this.selectedOrigin) {
        return { year: 0, type: 'milestone', title: '创世记', description: '世界诞生了。' };
      }
      if (this.selectedOrigin.id === 'history') {
        var civ = entity;
        var labels = {
          world_shape: { continent: '一片广袤的大陆', archipelago: '星罗棋布的群岛', pangaea: '一块巨大的泛大陆', islands: '散布的岛屿' },
          latitude: { tropical: '热带', temperate: '温带', arctic: '寒带' },
          temperature: { hot: '炎热的', warm: '温暖的', moderate: '宜人的', cool: '凉爽的', cold: '寒冷的' },
          rainfall: { none: '极度干旱', low: '少雨', moderate: '雨量适中', high: '多雨', constant: '终年降雨' },
          map_size: { small: '方寸之地', medium: '广阔天地', large: '浩瀚世界' },
          government_type: { chiefdom: '酋长部落', theocracy: '神权统治', oligarchy: '寡头议会', democracy: '民主萌芽', autocracy: '独裁专制' },
          economic_system: { primitive: '原始共产', barter: '以物易物', mercantile: '重商主义', capitalist: '资本主义萌芽' },
          religion_type: { animist: '万物有灵', polytheist: '多神信仰', monotheist: '一神信仰', secular: '世俗主义' },
          war_tendency: { peaceful: '爱好和平', defensive: '注重防守', balanced: '务实稳健', aggressive: '崇尚武力' }
        };
        var parts = [];
        var shape = labels.world_shape[config.world_shape] || '一片未知的大陆';
        var lat = labels.latitude[config.latitude] || '温和';
        var temp = labels.temperature[config.temperature] || '宜人';
        var rain = labels.rainfall[config.rainfall] || '雨量适中';
        var size = labels.map_size[config.map_size] || '广阔';
        parts.push('在' + size + '上，' + shape + '铺展开来。' + temp + '、' + rain + '的' + lat + '气候笼罩着这片土地');
        if (labels.government_type[config.government_type]) parts.push(civ.name + '文明在' + labels.government_type[config.government_type] + '制度下崛起');
        if (civ.leader_name) parts.push('领袖' + civ.leader_name + '带领着人民开始了漫长的征程');
        if (civ.ability) parts.push('这个民族以「' + civ.ability.split('—')[0].trim() + '」著称');
        if (config.religion_type && config.religion_type !== 'secular' && labels.religion_type[config.religion_type]) {
          parts.push(labels.religion_type[config.religion_type] + '的信仰在人们心中扎根');
        }
        if (config.resource_abundance === 'rich' || config.resource_abundance === 'abundant') parts.push('大自然是慷慨的——资源丰富，万物丰饶');
        else if (config.resource_abundance === 'scarce') parts.push('生存是艰难的——资源匮乏，每一步都如履薄冰');
        if (config.war_tendency === 'aggressive') parts.push('武力的阴影笼罩着这片土地，冲突一触即发');
        else if (config.war_tendency === 'peaceful') parts.push('和平的曙光普照大地，文明将在安宁中繁荣');
        return { year: 0, type: 'milestone', title: '创世记', description: parts.join('。') + '。' };
      }

      // Non-history origins
      var species = entity;
      if (!species) return { year: 0, type: 'milestone', title: '创世记', description: '世界诞生了。' };

      var awakeningLabels = {
        meteor: '天外陨石撞击改变了大气成分',
        radiation: '强烈的背景辐射加速了基因突变',
        disease: '一场席卷全球的瘟疫重塑了生态系统',
        gift: '某种未知的力量赋予了生物全新的认知能力'
      };
      var envLabels = {
        high_temp: '高温高压的极端环境',
        cold: '冰封万里的严寒世界',
        vacuum: '近乎真空的稀薄环境',
        high_pressure: '深海般的高压世界'
      };

      if (this.selectedOrigin.id === 'evolution') {
        var desc = '在原始的海洋中，第一个能够自我复制的分子诞生了。经过了亿万年的自然选择，' + species.name + '这个物种最终站了起来，开始书写自己的历史。';
        return { year: 0, type: 'milestone', title: '生命起源', description: desc };
      }
      if (this.selectedOrigin.id === 'awakening') {
        var cause = awakeningLabels[config.awakening_cause] || '一场剧变';
        var desc = cause + '改变了这颗星球的命运。' + species.name + '的智慧在剧变中觉醒，它们用全新的方式感知和改造这个世界。';
        return { year: 0, type: 'milestone', title: '灵智觉醒', description: desc };
      }
      if (this.selectedOrigin.id === 'xeno') {
        var env = envLabels[config.environment_medium] || '一个完全不同的环境中';
        var suffix = (species.flavor && species.flavor.settlement_suffix) ? species.flavor.settlement_suffix : '聚落';
        var desc = '在' + env + '，' + species.name + '诞生了。它们不以人类理解的方式生存，却同样构建了辉煌的' + suffix + '文明。';
        return { year: 0, type: 'milestone', title: '异种纪元', description: desc };
      }
      if (this.selectedOrigin.id === 'arrival') {
        var diffLabels = { similar: '似曾相识的', different: '完全陌生的', extreme: '极端恶劣的' };
        var survLabels = { few: '寥寥无几的幸存者', some: '一批幸存者', many: '大量幸存者' };
        var diff = diffLabels[config.home_diff] || '陌生';
        var surv = survLabels[config.survivors] || '幸存者';
        var desc = '一艘来自星海深处的飞船穿越宇宙，坠毁在这片' + diff + '土地上。' + surv + '从残骸中走出，面对未知的世界，他们必须用故土的知识重建一切。';
        return { year: 0, type: 'milestone', title: '天外来客', description: desc };
      }
      return { year: 0, type: 'milestone', title: '创世记', description: '世界诞生了。' };
    }

    destroy() {}
  }

  window.CreateWorldPage = CreateWorldPage;
})();
