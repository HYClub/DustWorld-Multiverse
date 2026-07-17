(function () {
  'use strict';

  class CreateWorldPage {
    constructor() {
      this.currentStep = 1;
      this.totalSteps = 6;
      this.formData = {};
      this._bound = {};
    }

    init() {
      this.appEl = document.getElementById('app');
      this.stepIndicator = document.getElementById('step-indicator');
      this.formSections = this.appEl && this.appEl.querySelectorAll('.form-section');
      this.prevBtn = document.getElementById('create-prev-btn');
      this.nextBtn = document.getElementById('create-next-btn');
      this.submitBtn = document.getElementById('create-submit-btn');
      this.previewCanvas = document.getElementById('preview-map-canvas');
      this.previewSize = document.getElementById('preview-size');
      this.previewOcean = document.getElementById('preview-ocean');
      this.previewContinents = document.getElementById('preview-continents');
      this.previewTime = document.getElementById('preview-time');

      this._bindRadioCards();
      this._bindFormInputs();
      this._bindButtons();
      this._renderStepIndicator();
      this.showStep(1);
    }

    _bindRadioCards() {
      var groups = this.appEl && this.appEl.querySelectorAll('.radio-card-group');
      if (!groups) return;
      for (var g = 0; g < groups.length; g++) {
        var cards = groups[g].querySelectorAll('.radio-card');
        for (var i = 0; i < cards.length; i++) {
          (function (card) {
            card.addEventListener('click', function () {
              var parent = card.parentNode;
              var siblings = parent.querySelectorAll('.radio-card');
              for (var j = 0; j < siblings.length; j++) {
                siblings[j].classList.remove('selected');
              }
              card.classList.add('selected');
              var radio = card.querySelector('input[type="radio"]');
              if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          })(cards[i]);
        }
      }
    }

    _bindFormInputs() {
      var self = this;

      var nameInput = document.getElementById('world-name-input');
      if (nameInput) {
        nameInput.addEventListener('input', function () {
          self.formData.name = this.value;
          self.updatePreview();
        });
      }

      var descInput = document.getElementById('world-desc-input');
      if (descInput) {
        descInput.addEventListener('input', function () {
          self.formData.description = this.value;
        });
      }

      var radioInputs = this.appEl && this.appEl.querySelectorAll('.form-section input[type="radio"]');
      if (radioInputs) {
        for (var i = 0; i < radioInputs.length; i++) {
          (function (input) {
            input.addEventListener('change', function () {
              self.formData[this.name] = this.value;
              self.updatePreview();
            });
          })(radioInputs[i]);
        }
      }

      this._collectInitialFormData();
    }

    _collectInitialFormData() {
      this.formData = {};
      var inputs = this.appEl && this.appEl.querySelectorAll('.form-section input, .form-section textarea');
      if (inputs) {
        for (var i = 0; i < inputs.length; i++) {
          var inp = inputs[i];
          if (inp.type === 'radio' && inp.checked) {
            this.formData[inp.name] = inp.value;
          } else if (inp.type === 'text' || inp.type === 'textarea') {
            this.formData[inp.name] = inp.value;
          }
        }
      }
    }

    _bindButtons() {
      var self = this;

      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', function () { self.goPrev(); });
      }

      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', function () { self.goNext(); });
      }

      if (this.submitBtn) {
        this.submitBtn.addEventListener('click', function () { self.onSubmit(); });
      }

      var backBtn = this.appEl && this.appEl.querySelector('[data-action="back"]');
      if (backBtn) {
        backBtn.addEventListener('click', function () { window.history.back(); });
      }
    }

    _renderStepIndicator() {
      if (!this.stepIndicator) return;
      var stepLabels = ['基础', '地图', '环境', '时间', '事件', '规则'];
      var html = '';
      for (var i = 0; i < this.totalSteps; i++) {
        if (i > 0) {
          html += '<div class="step-line"></div>';
        }
        html += '<div class="step-item" data-step="' + (i + 1) + '">' +
          '<span class="step-dot">' + (i + 1) + '</span>' +
          '<span class="step-label">' + stepLabels[i] + '</span>' +
          '</div>';
      }
      this.stepIndicator.innerHTML = html;
    }

    showStep(step) {
      if (step < 1 || step > this.totalSteps) return;
      this.currentStep = step;

      if (this.formSections) {
        for (var i = 0; i < this.formSections.length; i++) {
          var section = this.formSections[i];
          var s = parseInt(section.getAttribute('data-step'), 10);
          section.classList.toggle('active', s === step);
          if (s === step) {
            section.style.display = '';
            setTimeout(function (el) {
              el.style.opacity = '1';
            }, 10, section);
            section.style.opacity = '0';
          }
        }
      }

      this._updateStepIndicator();
      this._updateButtons();
    }

    _updateStepIndicator() {
      if (!this.stepIndicator) return;
      var items = this.stepIndicator.querySelectorAll('.step-item');
      for (var i = 0; i < items.length; i++) {
        var s = parseInt(items[i].getAttribute('data-step'), 10);
        items[i].classList.toggle('completed', s < this.currentStep);
        items[i].classList.toggle('active', s === this.currentStep);
      }
    }

    _updateButtons() {
      if (this.prevBtn) {
        this.prevBtn.style.visibility = this.currentStep > 1 ? 'visible' : 'hidden';
      }
      if (this.nextBtn) {
        this.nextBtn.style.display = this.currentStep < this.totalSteps ? '' : 'none';
      }
      if (this.submitBtn) {
        this.submitBtn.style.display = this.currentStep === this.totalSteps ? '' : 'none';
      }
    }

    validateStep(step) {
      if (step === 1) {
        var name = this.formData.name || '';
        if (name.length < 2 || name.length > 20) {
          var errEl = document.querySelector('.form-section[data-step="1"] .form-error');
          if (errEl) errEl.style.display = 'block';
          var input = document.getElementById('world-name-input');
          if (input) input.classList.add('error');
          return false;
        }
        var errEl2 = document.querySelector('.form-section[data-step="1"] .form-error');
        if (errEl2) errEl2.style.display = 'none';
        var input2 = document.getElementById('world-name-input');
        if (input2) input2.classList.remove('error');
        return true;
      }

      var stepSections = {
        2: ['map_size', 'continents', 'ocean_ratio'],
        3: ['resources', 'climate', 'initial_life'],
        4: ['time_ratio', 'evo_frequency'],
        5: ['disaster_freq', 'war_tendency', 'tech_speed', 'miracle_chance'],
        6: ['creator_limit', 'allow_others', 'others_limit']
      };

      var fields = stepSections[step];
      if (fields) {
        var missing = false;
        for (var i = 0; i < fields.length; i++) {
          if (!this.formData[fields[i]]) {
            missing = true;
            break;
          }
        }
        if (missing) {
          window.Toast.warning('请完成所有选项');
          return false;
        }
      }

      return true;
    }

    updatePreview() {
      var canvas = this.previewCanvas;
      if (!canvas) return;

      var container = canvas.parentNode;
      var cw = container.clientWidth || 200;
      var ch = container.clientHeight || 200;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';

      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      var mapSize = parseInt(this.formData.map_size || '20', 10);
      var oceanRatio = parseInt(this.formData.ocean_ratio || '30', 10);
      var continents = this.formData.continents || '1';

      var tileSize = Math.floor(Math.min(cw, ch) / mapSize);
      var offsetX = Math.floor((cw - tileSize * mapSize) / 2);
      var offsetY = Math.floor((ch - tileSize * mapSize) / 2);

      var tempSeed = Date.now();
      var rng = this._seededRandom(tempSeed);

      var terrainColors = ['#3a5a4a', '#6b8e5a', '#8a7a5a', '#5a6a7a', '#4a7a8a', '#2a4a6a'];
      var oceanColor = '#1a2a4a';

      for (var y = 0; y < mapSize; y++) {
        for (var x = 0; x < mapSize; x++) {
          var isWater = rng() * 100 < oceanRatio;
          if (continents === 'archipelago') {
            var cx = mapSize / 2, cy = mapSize / 2;
            var dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
            var archipelagoR = mapSize * 0.35;
            var noiseVal = rng() * 60;
            isWater = (dist > archipelagoR - 5 + noiseVal * 0.3) && rng() * 100 < (oceanRatio + 10);
          } else if (continents === '2-3' || continents === '4-6') {
            var numCenters = continents === '2-3' ? 3 : 5;
            var centers = [];
            for (var ci = 0; ci < numCenters; ci++) {
              centers.push({
                cx: 5 + rng() * (mapSize - 10),
                cy: 5 + rng() * (mapSize - 10),
                r: mapSize * (0.12 + rng() * 0.12)
              });
            }
            var minDist = mapSize;
            for (var cj = 0; cj < centers.length; cj++) {
              var d = Math.sqrt(Math.pow(x - centers[cj].cx, 2) + Math.pow(y - centers[cj].cy, 2));
              if (d < minDist) minDist = d;
            }
            var radiusSum = 0;
            for (var ck = 0; ck < centers.length; ck++) {
              radiusSum += centers[ck].r;
            }
            var avgR = radiusSum / centers.length;
            isWater = minDist > avgR * (0.6 + rng() * 0.5);
          } else {
            var distFromCenter = Math.sqrt(Math.pow(x - mapSize / 2, 2) + Math.pow(y - mapSize / 2, 2));
            var normalized = distFromCenter / (mapSize * 0.5);
            isWater = (normalized > 0.7 - (100 - oceanRatio) * 0.004) || (normalized > 0.3 && rng() * 100 < oceanRatio * 0.3);
          }

          if (isWater) {
            ctx.fillStyle = oceanColor;
          } else {
            var idx = Math.floor(rng() * terrainColors.length);
            ctx.fillStyle = terrainColors[idx];
          }
          ctx.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
        }
      }

      if (this.previewSize) {
        this.previewSize.textContent = mapSize + '\u00D7' + mapSize;
      }
      if (this.previewOcean) {
        this.previewOcean.textContent = oceanRatio + '%';
      }
      if (this.previewContinents) {
        var continentLabels = { '1': '1块大陆', '2-3': '2-3块大陆', '4-6': '4-6块大陆', 'archipelago': '群岛' };
        this.previewContinents.textContent = continentLabels[continents] || continents;
      }
      if (this.previewTime) {
        this.previewTime.textContent = '1:' + (this.formData.time_ratio || '24');
      }
    }

    _seededRandom(seed) {
      return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    }

    goNext() {
      if (!this.validateStep(this.currentStep)) return;
      if (this.currentStep < this.totalSteps) {
        this.showStep(this.currentStep + 1);
      }
    }

    goPrev() {
      if (this.currentStep > 1) {
        this.showStep(this.currentStep - 1);
      }
    }

    async onSubmit() {
      if (!this.validateStep(this.currentStep)) return;

      var self = this;
      var worldId = 'world_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);

      var mapSize = parseInt(this.formData.map_size || '20', 10);

      var rng = this._seededRandom(Date.now());

      var tiles = [];
      for (var y = 0; y < mapSize; y++) {
        var row = [];
        for (var x = 0; x < mapSize; x++) {
          row.push(Math.floor(rng() * 5));
        }
        tiles.push(row);
      }

      var worldData = {
        world_id: worldId,
        name: this.formData.name || '未命名世界',
        description: this.formData.description || '',
        creator: 'anonymous',
        creator_avatar: '',
        year: 1,
        era: 'primitive',
        eraName: '原始时代',
        map_size: { width: mapSize, height: mapSize },
        terrain: {
          tiles: tiles,
          resources: this._generateResources(mapSize)
        },
        config: {
          map_size: parseInt(this.formData.map_size || '20', 10),
          continents: this.formData.continents || '1',
          ocean_ratio: parseInt(this.formData.ocean_ratio || '30', 10),
          resources: this.formData.resources || 'normal',
          climate: this.formData.climate || 'mild',
          initial_life: this.formData.initial_life || 'normal',
          time_ratio: parseInt(this.formData.time_ratio || '24', 10),
          evo_frequency: parseInt(this.formData.evo_frequency || '30', 10),
          disaster_freq: this.formData.disaster_freq || 'medium',
          war_tendency: this.formData.war_tendency || 'normal',
          tech_speed: this.formData.tech_speed || 'normal',
          miracle_chance: this.formData.miracle_chance || 'medium',
          creator_limit: this.formData.creator_limit || '3',
          allow_others: this.formData.allow_others || 'yes',
          others_limit: parseInt(this.formData.others_limit || '1', 10)
        },
        settlements: this._generateInitialSettlements(mapSize, this.formData.initial_life || 'normal'),
        active_events: [],
        stats: {
          total_population: 0,
          total_settlements: 0,
          extinct_settlements: 0,
          total_wars: 0,
          tech_breakthroughs: 0
        },
        likes: 0,
        history: [
          { year: 1, type: 'cultural_boom', description: this.formData.name + '诞生——一个全新的世界' }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      var pop = 0;
      var settlements = worldData.settlements || [];
      for (var i = 0; i < settlements.length; i++) {
        pop += settlements[i].population || 0;
      }
      worldData.stats.total_population = pop;
      worldData.stats.total_settlements = settlements.length;

      var auth = window.AuthManager && window.AuthManager._instance;
      if (auth && auth.isLoggedIn()) {
        var dm = window.DataManager;
        if (dm && typeof dm.createWorld === 'function') {
          try {
            await dm.createWorld(worldData);
          } catch (e) {
            console.error('Failed to save via DataManager, using localStorage fallback', e);
            this._saveToLocalStorage(worldData);
          }
        } else {
          this._saveToLocalStorage(worldData);
        }
      } else {
        this._saveToLocalStorage(worldData);
      }

      window.Toast.success('世界创建成功！');

      setTimeout(function () {
        window.location.hash = '#/world?id=' + worldId;
      }, 500);
    }

    _generateResources(mapSize) {
      var types = ['wood', 'ore', 'food', 'water'];
      var resources = [];
      var count = 2 + Math.floor(Math.random() * 4);
      for (var i = 0; i < count; i++) {
        resources.push({
          type: types[i % 4],
          x: Math.floor(Math.random() * mapSize),
          y: Math.floor(Math.random() * mapSize),
          amount: 30 + Math.floor(Math.random() * 70)
        });
      }
      return resources;
    }

    _generateInitialSettlements(mapSize, lifeSetting) {
      var count;
      switch (lifeSetting) {
        case 'sparse': count = 1; break;
        case 'abundant': count = 3 + Math.floor(Math.random() * 2); break;
        default: count = 1 + Math.floor(Math.random() * 2); break;
      }

      var settlements = [];
      for (var i = 0; i < count; i++) {
        var names = ['起始村', '黎明镇', '初生部落', '起源之地', '第一城'];
        var statuses = ['发展', '繁荣', '发展'];
        settlements.push({
          id: 'SET_' + (i + 1).toString().padStart(3, '0'),
          name: names[i % names.length] + (count > 1 ? ' ' + (i + 1) : ''),
          x: Math.floor(Math.random() * (mapSize - 4)) + 2,
          y: Math.floor(Math.random() * (mapSize - 4)) + 2,
          population: 10 + Math.floor(Math.random() * 40),
          tech_level: 0,
          status: statuses[i % statuses.length],
          resources: { food: 30 + Math.floor(Math.random() * 30), wood: 20 + Math.floor(Math.random() * 30), ore: 5 + Math.floor(Math.random() * 15) },
          resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0,
          discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0,
          immune: false, sanctuary_duration: 0
        });
      }
      return settlements;
    }

    _saveToLocalStorage(worldData) {
      try {
        var existing = JSON.parse(localStorage.getItem('dustworld_local_worlds') || '[]');
        existing.unshift(worldData);
        localStorage.setItem('dustworld_local_worlds', JSON.stringify(existing));

        if (window.DEMO_WORLDS) {
          window.DEMO_WORLDS.unshift(worldData);
        }
      } catch (e) {
        console.error('localStorage save failed:', e);
      }
    }

    destroy() {
      this._bound = {};
    }
  }

  window.CreateWorldPage = CreateWorldPage;
})();
