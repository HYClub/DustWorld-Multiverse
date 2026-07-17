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

  var DEMO_WORLDS = [
    {
      id: 'demo_001',
      name: '火焰荒原',
      creator: '旅者',
      creatorAvatar: '',
      description: '一片被烈焰吞噬的荒芜之地，幸存者在灰烬中寻找希望。',
      year: 247,
      era: 'iron',
      settlements: 5,
      population: 3420,
      likes: 128,
      mapSize: 40,
      techLevel: 3,
      resources: 'normal',
      climate: 'harsh'
    },
    {
      id: 'demo_002',
      name: '翡翠群岛',
      creator: '航海家',
      creatorAvatar: '',
      description: '碧绿的海岛上孕育着独特的文明，部落之间通过船只往来。',
      year: 189,
      era: 'bronze',
      settlements: 8,
      population: 5600,
      likes: 95,
      mapSize: 60,
      techLevel: 2,
      resources: 'abundant',
      climate: 'mild'
    },
    {
      id: 'demo_003',
      name: '钢铁之心',
      creator: '工程师',
      creatorAvatar: '',
      description: '一个以巨大熔炉为中心的大陆，蒸汽与齿轮驱动着文明前行。',
      year: 412,
      era: 'steam',
      settlements: 12,
      population: 28400,
      likes: 256,
      mapSize: 80,
      techLevel: 4,
      resources: 'normal',
      climate: 'varied'
    },
    {
      id: 'demo_004',
      name: '星落平原',
      creator: '观星者',
      creatorAvatar: '',
      description: '传说星辰坠落之地，丰饶的土地孕育了繁荣的城邦文明。',
      year: 563,
      era: 'electric',
      settlements: 15,
      population: 67200,
      likes: 312,
      mapSize: 80,
      techLevel: 5,
      resources: 'abundant',
      climate: 'mild'
    },
    {
      id: 'demo_005',
      name: '迷雾沼泽',
      creator: '隐士',
      creatorAvatar: '',
      description: '终年被迷雾笼罩的沼泽地带，隐藏着古老的秘密与未知的危险。',
      year: 76,
      era: 'primitive',
      settlements: 3,
      population: 890,
      likes: 67,
      mapSize: 30,
      techLevel: 0,
      resources: 'scarce',
      climate: 'harsh'
    },
    {
      id: 'demo_006',
      name: '黄金城邦',
      creator: '领主',
      creatorAvatar: '',
      description: '建立在金山之上的城邦联盟，富饶但内斗不断。',
      year: 334,
      era: 'iron',
      settlements: 10,
      population: 15800,
      likes: 189,
      mapSize: 50,
      techLevel: 3,
      resources: 'abundant',
      climate: 'mild'
    },
    {
      id: 'demo_007',
      name: '冰原避难所',
      creator: '幸存者',
      creatorAvatar: '',
      description: '在永冻冰原上艰难求生的聚落，依靠地热能源维持文明火种。',
      year: 521,
      era: 'info',
      settlements: 4,
      population: 12000,
      likes: 234,
      mapSize: 60,
      techLevel: 6,
      resources: 'scarce',
      climate: 'harsh'
    },
    {
      id: 'demo_008',
      name: '风语沙漠',
      creator: '游牧者',
      creatorAvatar: '',
      description: '广袤沙漠中的绿洲文明，商队之路串联起散落的城邦。',
      year: 198,
      era: 'agriculture',
      settlements: 7,
      population: 7200,
      likes: 145,
      mapSize: 40,
      techLevel: 1,
      resources: 'scarce',
      climate: 'harsh'
    }
  ];

  var DEMO_STATES = {
    demo_001: {
      id: 'demo_001',
      year: 247,
      era: 'iron',
      population: 3420,
      settlements: [
        { id: 's1', name: '灰烬城', population: 1200, x: 15, y: 10, level: 'medium' },
        { id: 's2', name: '余烬村', population: 680, x: 28, y: 18, level: 'small' },
        { id: 's3', name: '铁砧堡', population: 900, x: 10, y: 25, level: 'small' },
        { id: 's4', name: '熔炉镇', population: 540, x: 32, y: 30, level: 'small' },
        { id: 's5', name: '焦土营地', population: 100, x: 5, y: 35, level: 'small' }
      ],
      tiles: [],
      resources: [
        { type: 'ore', x: 12, y: 8, amount: 500 },
        { type: 'wood', x: 25, y: 22, amount: 200 },
        { type: 'food', x: 8, y: 28, amount: 300 },
        { type: 'water', x: 30, y: 15, amount: 400 }
      ],
      events: [
        { year: 247, type: 'war', description: '灰烬城与铁砧堡爆发领土冲突，双方损失惨重。' },
        { year: 245, type: 'tech_breakthrough', description: '铁砧堡工匠发明了高炉炼铁技术，冶金水平大幅提升。' },
        { year: 242, type: 'disaster', description: '大地震摧毁了焦土营地一半的房屋。' },
        { year: 238, type: 'war', description: '余烬村被灰烬城吞并，成为附属领地。' },
        { year: 235, type: 'cultural_boom', description: '灰烬城的吟游诗人创作了史诗《火焰创世录》。' },
        { year: 230, type: 'tech_breakthrough', description: '熔炉镇发明了水车灌溉系统。' },
        { year: 225, type: 'plague', description: '黑死病在余烬村蔓延，夺走百余条生命。' },
        { year: 220, type: 'disaster', description: '连续三年大旱，粮食产量下降60%。' },
        { year: 215, type: 'intervention', description: '旅者降下恩赐，灰烬城周边土地变得肥沃。' },
        { year: 210, type: 'cultural_boom', description: '铁砧堡举办了第一届全大陆铁匠大赛。' }
      ],
      wars: 3,
      techBreakthroughs: 7
    },
    demo_002: {
      id: 'demo_002',
      year: 189,
      era: 'bronze',
      population: 5600,
      settlements: [
        { id: 's1', name: '碧玉城', population: 1500, x: 25, y: 20, level: 'medium' },
        { id: 's2', name: '珊瑚港', population: 1100, x: 40, y: 15, level: 'medium' },
        { id: 's3', name: '海风镇', population: 800, x: 15, y: 30, level: 'small' },
        { id: 's4', name: '珍珠岛', population: 600, x: 50, y: 25, level: 'small' },
        { id: 's5', name: '琥珀村', population: 400, x: 35, y: 35, level: 'small' },
        { id: 's6', name: '珊瑚礁营地', population: 300, x: 10, y: 10, level: 'small' }
      ],
      tiles: [],
      resources: [
        { type: 'wood', x: 20, y: 18, amount: 600 },
        { type: 'food', x: 30, y: 28, amount: 500 },
        { type: 'water', x: 42, y: 12, amount: 800 },
        { type: 'ore', x: 8, y: 32, amount: 200 }
      ],
      events: [
        { year: 189, type: 'cultural_boom', description: '碧玉城建成全大陆第一座剧场，戏剧艺术蓬勃发展。' },
        { year: 186, type: 'tech_breakthrough', description: '珊瑚港发明了三桅帆船，远洋航行成为可能。' },
        { year: 182, type: 'war', description: '海风镇与珍珠岛因渔业资源爆发冲突。' },
        { year: 178, type: 'disaster', description: '特大台风袭击群岛，多艘船只沉没。' },
        { year: 175, type: 'cultural_boom', description: '琥珀村的琉璃工艺达到巅峰，作品远销各岛。' }
      ],
      wars: 1,
      techBreakthroughs: 4
    },
    demo_003: {
      id: 'demo_003',
      year: 412,
      era: 'steam',
      population: 28400,
      settlements: [
        { id: 's1', name: '蒸汽之城', population: 8500, x: 30, y: 25, level: 'large' },
        { id: 's2', name: '齿轮镇', population: 4500, x: 50, y: 15, level: 'medium' },
        { id: 's3', name: '锅炉堡', population: 3800, x: 15, y: 35, level: 'medium' },
        { id: 's4', name: '管道村', population: 2800, x: 45, y: 40, level: 'medium' },
        { id: 's5', name: '活塞工厂', population: 2100, x: 55, y: 50, level: 'small' },
        { id: 's6', name: '锻炉镇', population: 3200, x: 8, y: 12, level: 'medium' },
        { id: 's7', name: '铆钉城', population: 2500, x: 65, y: 30, level: 'medium' },
        { id: 's8', name: '气阀哨站', population: 1500, x: 35, y: 55, level: 'small' }
      ],
      tiles: [],
      resources: [
        { type: 'ore', x: 25, y: 20, amount: 2000 },
        { type: 'wood', x: 48, y: 42, amount: 800 },
        { type: 'coal', x: 32, y: 28, amount: 3000 },
        { type: 'water', x: 55, y: 18, amount: 1000 }
      ],
      events: [
        { year: 412, type: 'tech_breakthrough', description: '蒸汽之城建成中央计算引擎，数据分析能力飞跃。' },
        { year: 408, type: 'war', description: '齿轮镇与铆钉城爆发资源战争，持续两年。' },
        { year: 405, type: 'tech_breakthrough', description: '锅炉堡发明了蒸汽压缩机，能源效率翻倍。' },
        { year: 400, type: 'disaster', description: '蒸汽之城发生特大锅炉爆炸，死伤逾千。' },
        { year: 395, type: 'cultural_boom', description: '齿轮镇出版了第一部机械工程百科全书。' },
        { year: 390, type: 'plague', description: '工业废气导致肺部疾病在铆钉城蔓延。' },
        { year: 385, type: 'tech_breakthrough', description: '锻炉镇攻克了合金钢大规模冶炼技术。' }
      ],
      wars: 4,
      techBreakthroughs: 9
    },
    demo_004: {
      id: 'demo_004',
      year: 563,
      era: 'electric',
      population: 67200,
      settlements: [
        { id: 's1', name: '星辉城', population: 18000, x: 35, y: 30, level: 'large' },
        { id: 's2', name: '灯塔市', population: 12000, x: 55, y: 18, level: 'large' },
        { id: 's3', name: '电网镇', population: 8000, x: 20, y: 42, level: 'medium' },
        { id: 's4', name: '无线港', population: 9500, x: 65, y: 45, level: 'medium' },
        { id: 's5', name: '晶体管村', population: 6000, x: 42, y: 55, level: 'medium' },
        { id: 's6', name: '光纤城', population: 7200, x: 10, y: 15, level: 'medium' },
        { id: 's7', name: '雷达哨站', population: 3500, x: 48, y: 8, level: 'small' }
      ],
      tiles: [],
      resources: [
        { type: 'ore', x: 30, y: 25, amount: 1500 },
        { type: 'water', x: 50, y: 15, amount: 2000 },
        { type: 'food', x: 25, y: 38, amount: 3000 },
        { type: 'ore', x: 60, y: 48, amount: 1200 }
      ],
      events: [
        { year: 563, type: 'cultural_boom', description: '星辉城举办了第一次跨大陆无线电广播音乐会。' },
        { year: 560, type: 'tech_breakthrough', description: '灯塔市发明了交流电远程传输技术。' },
        { year: 555, type: 'disaster', description: '电网镇遭遇雷暴，供电系统大面积瘫痪。' },
        { year: 550, type: 'war', description: '无线港与晶体管村因频谱资源发生争执。' },
        { year: 545, type: 'tech_breakthrough', description: '光纤城完成第一条海底通信光缆铺设。' },
        { year: 540, type: 'cultural_boom', description: '星辉大学成立，开设了电磁学、热力学等现代学科。' }
      ],
      wars: 2,
      techBreakthroughs: 12
    },
    demo_005: {
      id: 'demo_005',
      year: 76,
      era: 'primitive',
      population: 890,
      settlements: [
        { id: 's1', name: '苔藓部落', population: 350, x: 12, y: 8, level: 'small' },
        { id: 's2', name: '萤火村', population: 280, x: 22, y: 18, level: 'small' },
        { id: 's3', name: '泥潭营地', population: 260, x: 8, y: 22, level: 'small' }
      ],
      tiles: [],
      resources: [
        { type: 'food', x: 10, y: 10, amount: 150 },
        { type: 'wood', x: 20, y: 15, amount: 300 },
        { type: 'water', x: 15, y: 20, amount: 200 }
      ],
      events: [
        { year: 76, type: 'disaster', description: '沼泽毒气扩散，萤火村多人中毒。' },
        { year: 73, type: 'tech_breakthrough', description: '苔藓部落学会了用泥巴制作陶器。' },
        { year: 70, type: 'war', description: '萤火村与泥潭营地因狩猎领地发生械斗。' },
        { year: 68, type: 'cultural_boom', description: '苔藓部落的祭司发明了壁画记事法。' }
      ],
      wars: 1,
      techBreakthroughs: 2
    },
    demo_006: {
      id: 'demo_006',
      year: 334,
      era: 'iron',
      population: 15800,
      settlements: [
        { id: 's1', name: '黄金城', population: 5000, x: 30, y: 25, level: 'large' },
        { id: 's2', name: '白银堡', population: 3500, x: 15, y: 35, level: 'medium' },
        { id: 's3', name: '铜币镇', population: 2800, x: 45, y: 18, level: 'medium' },
        { id: 's4', name: '铁锭港', population: 2200, x: 50, y: 40, level: 'small' },
        { id: 's5', name: '宝石村', population: 1300, x: 8, y: 12, level: 'small' }
      ],
      tiles: [],
      resources: [
        { type: 'ore', x: 28, y: 22, amount: 2000 },
        { type: 'food', x: 42, y: 20, amount: 1200 },
        { type: 'water', x: 35, y: 30, amount: 900 },
        { type: 'ore', x: 12, y: 32, amount: 1500 }
      ],
      events: [
        { year: 334, type: 'war', description: '黄金城与白银堡因矿脉所有权爆发全面战争。' },
        { year: 330, type: 'tech_breakthrough', description: '铜币镇发明了标准化货币铸造工艺。' },
        { year: 325, type: 'cultural_boom', description: '黄金城建成大图书馆，收录了各邦典籍。' },
        { year: 320, type: 'plague', description: '铜币镇爆发痢疾，卫生系统面临考验。' },
        { year: 315, type: 'intervention', description: '领主降下启迪，白银堡冶金技术突飞猛进。' }
      ],
      wars: 5,
      techBreakthroughs: 6
    },
    demo_007: {
      id: 'demo_007',
      year: 521,
      era: 'info',
      population: 12000,
      settlements: [
        { id: 's1', name: '地热核心城', population: 5000, x: 30, y: 25, level: 'large' },
        { id: 's2', name: '数据中心', population: 3000, x: 20, y: 40, level: 'medium' },
        { id: 's3', name: '暖房基地', population: 2500, x: 45, y: 30, level: 'medium' },
        { id: 's4', name: '冰原观测站', population: 1500, x: 55, y: 15, level: 'small' }
      ],
      tiles: [],
      resources: [
        { type: 'ore', x: 28, y: 22, amount: 800 },
        { type: 'water', x: 35, y: 28, amount: 500 },
        { type: 'food', x: 42, y: 32, amount: 400 },
        { type: 'water', x: 50, y: 18, amount: 300 }
      ],
      events: [
        { year: 521, type: 'tech_breakthrough', description: '地热核心城建成量子计算机，计算能力突破极限。' },
        { year: 518, type: 'cultural_boom', description: '数据中心创建了虚拟现实博物馆，保存文明记忆。' },
        { year: 515, type: 'disaster', description: '冰原遭遇百年一遇暴风雪，暖房基地受损。' },
        { year: 510, type: 'tech_breakthrough', description: '冰原观测站发现新型地热利用技术。' }
      ],
      wars: 0,
      techBreakthroughs: 8
    },
    demo_008: {
      id: 'demo_008',
      year: 198,
      era: 'agriculture',
      population: 7200,
      settlements: [
        { id: 's1', name: '绿洲之城', population: 2500, x: 25, y: 20, level: 'medium' },
        { id: 's2', name: '驼铃驿站', population: 1800, x: 40, y: 30, level: 'medium' },
        { id: 's3', name: '月牙泉镇', population: 1200, x: 15, y: 35, level: 'small' },
        { id: 's4', name: '沙枣村', population: 800, x: 35, y: 12, level: 'small' },
        { id: 's5', name: '古道客栈', population: 500, x: 48, y: 42, level: 'small' },
        { id: 's6', name: '红柳营地', population: 400, x: 8, y: 18, level: 'small' }
      ],
      tiles: [],
      resources: [
        { type: 'water', x: 22, y: 18, amount: 600 },
        { type: 'food', x: 28, y: 22, amount: 800 },
        { type: 'wood', x: 38, y: 28, amount: 300 },
        { type: 'ore', x: 12, y: 32, amount: 150 }
      ],
      events: [
        { year: 198, type: 'cultural_boom', description: '绿洲之城建成空中花园，成为沙漠奇迹。' },
        { year: 195, type: 'tech_breakthrough', description: '驼铃驿站发明了沙地行走辅助装置。' },
        { year: 190, type: 'war', description: '月牙泉镇与沙枣村因水源分配发生冲突。' },
        { year: 185, type: 'disaster', description: '特大沙尘暴掩埋了古道客栈的商路。' },
        { year: 180, type: 'tech_breakthrough', description: '月牙泉镇开发了地下暗渠引水系统。' }
      ],
      wars: 2,
      techBreakthroughs: 5
    }
  };

  var DEMO_EVENT_TYPES = [
    'war', 'disaster', 'tech_breakthrough', 'cultural_boom', 'plague', 'intervention', 'hero_birth'
  ];

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  var GitHubAPI = function (token) {
    this.baseURL = API_BASE;
    this.token = token || null;
    this.owner = 'HYClub';
    this.repo = 'DustWorld-Multiverse';
    this.useDemo = !token;
  };

  GitHubAPI.prototype.request = function (endpoint, options) {
    var self = this;
    options = options || {};
    var url = this.baseURL + endpoint;
    var headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (this.token) {
      headers['Authorization'] = 'token ' + this.token;
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

  GitHubAPI.prototype.getWorldList = function () {
    if (this.useDemo) return Promise.resolve(this.getDemoWorlds());
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/data/worlds')
      .then(function (data) {
        if (!Array.isArray(data)) return [];
        return data.filter(function (item) { return item.type === 'dir'; });
      })
      .catch(function () { return self.getDemoWorlds(); });
  };

  GitHubAPI.prototype.getWorldState = function (worldId) {
    if (this.useDemo) return Promise.resolve(this.getDemoWorldState(worldId));
    var self = this;
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/data/worlds/' + worldId + '/state.json')
      .then(function (data) {
        if (data && data.content) {
          try {
            return JSON.parse(atob(data.content.replace(/\s/g, '')));
          } catch (e) {
            return null;
          }
        }
        return null;
      })
      .catch(function () { return self.getDemoWorldState(worldId); });
  };

  GitHubAPI.prototype.getWorldConfig = function (worldId) {
    if (this.useDemo) return Promise.resolve(this.getDemoWorldState(worldId));
    var self = this;
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/data/worlds/' + worldId + '/config.json')
      .then(function (data) {
        if (data && data.content) {
          try {
            return JSON.parse(atob(data.content.replace(/\s/g, '')));
          } catch (e) {
            return null;
          }
        }
        return null;
      })
      .catch(function () { return null; });
  };

  GitHubAPI.prototype.getWorldHistory = function (worldId) {
    if (this.useDemo) return Promise.resolve(this.getDemoWorldState(worldId));
    var self = this;
    return this.request('/repos/' + this.owner + '/' + this.repo + '/contents/data/worlds/' + worldId + '/history.json')
      .then(function (data) {
        if (data && data.content) {
          try {
            return JSON.parse(atob(data.content.replace(/\s/g, '')));
          } catch (e) {
            return [];
          }
        }
        return [];
      })
      .catch(function () { return []; });
  };

  GitHubAPI.prototype.getUserData = function (username) {
    if (this.useDemo) return Promise.resolve({ login: username || 'demo_user', name: 'Demo User', avatar_url: '', bio: '' });
    return this.request('/users/' + encodeURIComponent(username)).catch(function () {
      return null;
    });
  };

  GitHubAPI.prototype.getRawFile = function (path) {
    if (this.useDemo) return Promise.resolve(null);
    return fetch(RAW_BASE + '/' + this.owner + '/' + this.repo + '/main/' + path).then(function (res) {
      if (!res.ok) throw new Error('File not found');
      return res.text();
    });
  };

  GitHubAPI.prototype.submitIntervention = function (worldId, intervention) {
    if (this.useDemo) return Promise.resolve({ id: 'issue_' + generateId(), status: 'created' });
    return this.request('/repos/' + this.owner + '/' + this.repo + '/issues', {
      method: 'POST',
      body: {
        title: '干预: ' + worldId + ' - ' + (intervention.type || 'unknown'),
        body: JSON.stringify(intervention, null, 2),
        labels: ['intervention', 'world:' + worldId, intervention.type || 'general']
      }
    });
  };

  GitHubAPI.prototype.getWorldListFromDirectory = function () {
    return this.getWorldList();
  };

  GitHubAPI.prototype.getDemoWorlds = function () {
    return DEMO_WORLDS.map(function (w) {
      return {
        name: w.name,
        path: 'data/worlds/' + w.id,
        type: 'dir',
        worldId: w.id
      };
    });
  };

  GitHubAPI.prototype.getDemoWorldState = function (id) {
    var state = DEMO_STATES[id];
    if (!state) return null;
    var worldMeta = null;
    for (var i = 0; i < DEMO_WORLDS.length; i++) {
      if (DEMO_WORLDS[i].id === id) {
        worldMeta = DEMO_WORLDS[i];
        break;
      }
    }
    if (worldMeta) {
      state.name = worldMeta.name;
      state.creator = worldMeta.creator;
      state.creatorAvatar = worldMeta.creatorAvatar;
      state.description = worldMeta.description;
      state.likes = worldMeta.likes;
      state.mapSize = worldMeta.mapSize;
      state.techLevel = worldMeta.techLevel;
      state.resources = worldMeta.resources;
      state.climate = worldMeta.climate;
    }
    if (!state.tiles || state.tiles.length === 0) {
      state.tiles = this._generateDemoTiles(state.mapSize || 40, state.id);
    }
    return state;
  };

  GitHubAPI.prototype._generateDemoTiles = function (size, seed) {
    var tiles = [];
    var pseudoRand = function (s) {
      return function () {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };
    var rng = pseudoRand(seed ? seed.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0) : 42);
    for (var y = 0; y < size; y++) {
      tiles[y] = [];
      for (var x = 0; x < size; x++) {
        var val = rng();
        if (val < 0.3) tiles[y][x] = 0;
        else if (val < 0.55) tiles[y][x] = 1;
        else if (val < 0.75) tiles[y][x] = 2;
        else if (val < 0.88) tiles[y][x] = 3;
        else tiles[y][x] = 4;
      }
    }
    return tiles;
  };

  GitHubAPI.prototype.getDemoWorldById = function (id) {
    for (var i = 0; i < DEMO_WORLDS.length; i++) {
      if (DEMO_WORLDS[i].id === id) return DEMO_WORLDS[i];
    }
    return null;
  };

  GitHubAPI.prototype.getAllDemoWorlds = function () {
    return DEMO_WORLDS;
  };

  window.GitHubAPI = GitHubAPI;
})();
