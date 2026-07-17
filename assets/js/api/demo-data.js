(function () {
  'use strict';

  function randomTiles(w, h) {
    var tiles = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        var r = Math.random();
        row.push(r < 0.4 ? 0 : r < 0.6 ? 1 : r < 0.75 ? 2 : r < 0.87 ? 3 : 4);
      }
      tiles.push(row);
    }
    return tiles;
  }

  function randomResources(w, h) {
    var types = ['wood', 'ore', 'food', 'water'];
    var resources = [];
    var count = 3 + Math.floor(Math.random() * 4);
    for (var i = 0; i < count; i++) {
      resources.push({
        type: types[i % 4],
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        amount: 30 + Math.floor(Math.random() * 70)
      });
    }
    return resources;
  }

  var DEMO_WORLDS = [
    {
      world_id: 'demo_001',
      name: '火焰荒原',
      creator: 'zhangsan',
      creator_avatar: 'https://avatars.githubusercontent.com/u/1',
      year: 347,
      era: 'steam',
      eraName: '蒸汽时代',
      description: '一片被火焰与灰烬覆盖的荒原，生命在极端环境中顽强求存。',
      map_size: { width: 40, height: 40 },
      terrain: {
        tiles: randomTiles(40, 40),
        resources: randomResources(40, 40)
      },
      settlements: [
        { id: 'SET001', name: '河畔城', x: 20, y: 25, population: 320, tech_level: 4, status: '繁荣', resources: { food: 80, wood: 45, ore: 30 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET002', name: '山麓部落', x: 8, y: 12, population: 45, tech_level: 1, status: '发展', resources: { food: 30, wood: 60, ore: 10 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET003', name: '湖畔村', x: 32, y: 28, population: 120, tech_level: 2, status: '繁荣', resources: { food: 60, wood: 30, ore: 20 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET004', name: '铁炉堡', x: 15, y: 30, population: 210, tech_level: 3, status: '发展', resources: { food: 40, wood: 25, ore: 80 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 }
      ],
      active_events: [
        { id: 'EVT001', type: 'war', participants: ['SET001', 'SET003'], remaining_years: 5, description: '河畔城与湖畔村因资源争端爆发战争' },
        { id: 'EVT002', type: 'cultural_boom', participants: ['SET001'], remaining_years: 8, description: '河畔城迎来文化繁荣时期' }
      ],
      stats: { total_population: 695, total_settlements: 4, extinct_settlements: 1, total_wars: 5, tech_breakthroughs: 8 },
      likes: 89,
      history: [
        { year: 340, type: 'tech_breakthrough', description: '河畔城发明蒸汽机，进入蒸汽时代' },
        { year: 342, type: 'natural_disaster', description: '山麓部落遭遇严重干旱' },
        { year: 345, type: 'war', description: '河畔城与湖畔村因资源争端爆发战争' },
        { year: 346, type: 'plague', description: '瘟疫席卷东部平原' },
        { year: 347, type: 'cultural_boom', description: '河畔城迎来文化繁荣' }
      ],
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-17T12:00:00Z'
    },
    {
      world_id: 'demo_002',
      name: '翡翠森林',
      creator: 'lisi',
      creator_avatar: 'https://avatars.githubusercontent.com/u/2',
      year: 892,
      era: 'info',
      eraName: '信息时代',
      description: '广袤的翡翠色森林世界，多个文明在此兴衰交替。',
      map_size: { width: 60, height: 60 },
      terrain: {
        tiles: randomTiles(60, 60),
        resources: randomResources(60, 60)
      },
      settlements: [
        { id: 'SET001', name: '翠风城', x: 30, y: 30, population: 5200, tech_level: 6, status: '繁荣', resources: { food: 200, wood: 150, ore: 180 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET002', name: '叶语村', x: 10, y: 15, population: 340, tech_level: 3, status: '繁荣', resources: { food: 90, wood: 120, ore: 20 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET003', name: '石桥镇', x: 45, y: 40, population: 1800, tech_level: 5, status: '发展', resources: { food: 130, wood: 80, ore: 100 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET004', name: '北境要塞', x: 20, y: 50, population: 950, tech_level: 4, status: '发展', resources: { food: 60, wood: 40, ore: 160 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET005', name: '风车磨坊', x: 50, y: 10, population: 210, tech_level: 2, status: '发展', resources: { food: 70, wood: 50, ore: 10 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 }
      ],
      active_events: [],
      stats: { total_population: 8500, total_settlements: 5, extinct_settlements: 3, total_wars: 12, tech_breakthroughs: 28 },
      likes: 234,
      history: [
        { year: 800, type: 'tech_breakthrough', description: '翠风城发明印刷术，知识得以广泛传播' },
        { year: 820, type: 'war', description: '北境要塞与石桥镇爆发领土争端' },
        { year: 850, type: 'natural_disaster', description: '大地震摧毁了南方的古老文明' },
        { year: 870, type: 'cultural_boom', description: '翠风城迎来文艺复兴时期' },
        { year: 892, type: 'tech_breakthrough', description: '全境铺设光纤网络，进入信息时代' }
      ],
      created_at: '2026-06-15T00:00:00Z',
      updated_at: '2026-07-17T08:00:00Z'
    },
    {
      world_id: 'demo_003',
      name: '冰封世界',
      creator: 'wangwu',
      creator_avatar: 'https://avatars.githubusercontent.com/u/3',
      year: 156,
      era: 'primitive',
      eraName: '原始时代',
      description: '终年积雪的冰封世界，生命在严寒中艰难挣扎。',
      map_size: { width: 30, height: 30 },
      terrain: {
        tiles: randomTiles(30, 30),
        resources: randomResources(30, 30)
      },
      settlements: [
        { id: 'SET001', name: '冰壁村', x: 15, y: 15, population: 38, tech_level: 0, status: '发展', resources: { food: 15, wood: 10, ore: 5 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 3, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET002', name: '雪洞部落', x: 5, y: 8, population: 22, tech_level: 0, status: '发展', resources: { food: 8, wood: 5, ore: 2 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 3, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 }
      ],
      active_events: [
        { id: 'EVT001', type: 'natural_disaster', participants: ['SET001', 'SET002'], remaining_years: 2, description: '持续暴风雪威胁所有聚落' }
      ],
      stats: { total_population: 60, total_settlements: 2, extinct_settlements: 4, total_wars: 1, tech_breakthroughs: 0 },
      likes: 45,
      history: [
        { year: 100, type: 'natural_disaster', description: '历史上最大暴风雪导致两个部落灭绝' },
        { year: 120, type: 'war', description: '两个部落因狩猎区域爆发冲突' },
        { year: 145, type: 'plague', description: '寒冰瘟疫夺走了半数人口' },
        { year: 150, type: 'tech_breakthrough', description: '冰壁村发明火种保存技术' }
      ],
      created_at: '2026-07-10T00:00:00Z',
      updated_at: '2026-07-16T18:00:00Z'
    },
    {
      world_id: 'demo_004',
      name: '沙漠王国',
      creator: 'zhaoliu',
      creator_avatar: 'https://avatars.githubusercontent.com/u/4',
      year: 512,
      era: 'iron',
      eraName: '铁器时代',
      description: '浩瀚沙海中的绿洲文明，围绕珍贵的水资源展开了千年征战。',
      map_size: { width: 50, height: 50 },
      terrain: {
        tiles: randomTiles(50, 50),
        resources: randomResources(50, 50)
      },
      settlements: [
        { id: 'SET001', name: '黄金城', x: 25, y: 25, population: 1200, tech_level: 4, status: '繁荣', resources: { food: 60, wood: 20, ore: 90 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 2, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET002', name: '绿洲镇', x: 10, y: 35, population: 450, tech_level: 3, status: '繁荣', resources: { food: 80, wood: 15, ore: 30 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 2, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET003', name: '沙岩堡', x: 40, y: 15, population: 280, tech_level: 2, status: '发展', resources: { food: 30, wood: 5, ore: 60 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 3, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET004', name: '河口渔村', x: 35, y: 40, population: 120, tech_level: 1, status: '发展', resources: { food: 50, wood: 10, ore: 5 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 2, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 }
      ],
      active_events: [
        { id: 'EVT001', type: 'war', participants: ['SET001', 'SET003'], remaining_years: 6, description: '黄金城与沙岩堡争夺水源控制权' }
      ],
      stats: { total_population: 2050, total_settlements: 4, extinct_settlements: 6, total_wars: 23, tech_breakthroughs: 14 },
      likes: 167,
      history: [
        { year: 400, type: 'tech_breakthrough', description: '黄金城发明地下水开凿技术' },
        { year: 430, type: 'war', description: '黄金城统一周边部落，建立王国' },
        { year: 470, type: 'natural_disaster', description: '百年大旱导致两个绿洲消失' },
        { year: 490, type: 'cultural_boom', description: '黄金城建造了宏伟的太阳神殿' },
        { year: 512, type: 'plague', description: '水源污染引发瘟疫' }
      ],
      created_at: '2026-05-20T00:00:00Z',
      updated_at: '2026-07-15T14:00:00Z'
    },
    {
      world_id: 'demo_005',
      name: '天空群岛',
      creator: 'sunqi',
      creator_avatar: 'https://avatars.githubusercontent.com/u/5',
      year: 2034,
      era: 'electric',
      eraName: '电气时代',
      description: '漂浮在云海中的岛屿群，居民掌握了先进的空中交通技术。',
      map_size: { width: 45, height: 45 },
      terrain: {
        tiles: randomTiles(45, 45),
        resources: randomResources(45, 45)
      },
      settlements: [
        { id: 'SET001', name: '云端城', x: 22, y: 22, population: 3400, tech_level: 5, status: '繁荣', resources: { food: 140, wood: 60, ore: 120 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET002', name: '浮岛镇', x: 8, y: 30, population: 780, tech_level: 4, status: '繁荣', resources: { food: 90, wood: 40, ore: 50 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 },
        { id: 'SET003', name: '风车村', x: 35, y: 12, population: 210, tech_level: 2, status: '发展', resources: { food: 40, wood: 30, ore: 10 }, resource_bonus: 0, bonus_duration: 0, disaster_risk: 1, curse_duration: 0, discovery_bonus: 0, exploration_duration: 0, tech_bonus: 0, inspiration_duration: 0, immune: false, sanctuary_duration: 0 }
      ],
      active_events: [],
      stats: { total_population: 4390, total_settlements: 3, extinct_settlements: 2, total_wars: 8, tech_breakthroughs: 35 },
      likes: 312,
      history: [
        { year: 1900, type: 'tech_breakthrough', description: '云端城发明飞行船技术' },
        { year: 1950, type: 'cultural_boom', description: '天空艺术节成为跨岛盛会' },
        { year: 2000, type: 'war', description: '浮岛镇与云端城因贸易争端发生冲突' },
        { year: 2012, type: 'tech_breakthrough', description: '全岛铺设电力网络' },
        { year: 2034, type: 'cultural_boom', description: '建成世界最高观星台' }
      ],
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-07-16T20:00:00Z'
    }
  ];

  var DEMO_USER = {
    username: 'zhangsan',
    avatar_url: 'https://avatars.githubusercontent.com/u/1',
    worlds_created: ['demo_001'],
    worlds_liked: ['demo_002', 'demo_005'],
    intervention_quota: 3,
    created_at: '2026-07-01T00:00:00Z'
  };

  var DEMO_INTERVENTIONS = [
    { id: 'int_001', type: 'bless', target_world: 'demo_001', target_settlement: '河畔城', timestamp: '2026-07-15T10:00:00Z', status: 'executed' },
    { id: 'int_002', type: 'discover', target_world: 'demo_001', target_settlement: '山麓部落', timestamp: '2026-07-16T14:00:00Z', status: 'executed' },
    { id: 'int_003', type: 'shelter', target_world: 'demo_003', target_settlement: '冰壁村', timestamp: '2026-07-17T08:00:00Z', status: 'pending' }
  ];

  window.DEMO_WORLDS = DEMO_WORLDS;
  window.DEMO_USER = DEMO_USER;
  window.DEMO_INTERVENTIONS = DEMO_INTERVENTIONS;
})();
