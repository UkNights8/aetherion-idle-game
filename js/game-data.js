/**
 * Game Data & Balance Definitions
 * Contains buildings, upgrades, prestige skill tree, achievements and default state.
 */

const GameData = {
    // Starting balance and settings
    INITIAL_COINS: new BigNum(10), // Section 4.3: start with 10 coins
    INITIAL_PRESTIGE_SHARDS: new BigNum(0),

    // 8 Tiered Core Generators (Section 1.2, 2.1, 2.2)
    BUILDINGS: [
        {
            id: 'b1',
            name: 'Quantum Resonator',
            nameRu: 'Квантовый резонатор',
            description: 'Manipulates quantum fluctuations to harvest zero-point energy.',
            descriptionRu: 'Генерирует чистую энергию из квантовых флуктуаций вакуума.',
            icon: '⚡',
            baseCost: new BigNum(15),
            baseProduction: new BigNum(1),
            multiplier: 1.15,
            accentColor: '#00f2fe'
        },
        {
            id: 'b2',
            name: 'Aether Condenser',
            nameRu: 'Эфирный конденсатор',
            description: 'Condenses ambient cosmic ether into crystallised currency.',
            descriptionRu: 'Конденсирует окружающий космический эфир в стабильную валюту.',
            icon: '🌀',
            baseCost: new BigNum(100),
            baseProduction: new BigNum(6),
            multiplier: 1.15,
            accentColor: '#4facfe'
        },
        {
            id: 'b3',
            name: 'Plasma Extractor',
            nameRu: 'Плазменный экстрактор',
            description: 'Extracts superheated solar plasma directly from stellar crowns.',
            descriptionRu: 'Добывает высокотемпературную плазму прямо из корон звезд.',
            icon: '🔥',
            baseCost: new BigNum(1100),
            baseProduction: new BigNum(48),
            multiplier: 1.15,
            accentColor: '#ff9900'
        },
        {
            id: 'b4',
            name: 'Nanite Swarm Core',
            nameRu: 'Ядро нанитов',
            description: 'Self-replicating nanobots transmuting base matter into wealth.',
            descriptionRu: 'Самореплицирующиеся наниты, трансмутирующие материю в ресурсы.',
            icon: '💠',
            baseCost: new BigNum(12000),
            baseProduction: new BigNum(320),
            multiplier: 1.15,
            accentColor: '#00e5ff'
        },
        {
            id: 'b5',
            name: 'Fusion Supercollider',
            nameRu: 'Термоядерный коллайдер',
            description: 'Collides exotic hadrons to release immense energetic yields.',
            descriptionRu: 'Сталкивает экзотические адроны, высвобождая колоссальную энергию.',
            icon: '⚛️',
            baseCost: new BigNum(130000),
            baseProduction: new BigNum(2600),
            multiplier: 1.15,
            accentColor: '#a855f7'
        },
        {
            id: 'b6',
            name: 'Antimatter Synthesizer',
            nameRu: 'Синтезатор антиматерии',
            description: 'Traps and stabilizes antiparticles for explosive resource amplification.',
            descriptionRu: 'Улавливает и стабилизирует античастицы для взрывного роста доходов.',
            icon: '🔮',
            baseCost: new BigNum(1400000),
            baseProduction: new BigNum(24000),
            multiplier: 1.15,
            accentColor: '#ec4899'
        },
        {
            id: 'b7',
            name: 'Dyson Sphere Grid',
            nameRu: 'Сетка сферы Дайсона',
            description: 'Envelops whole stars to capture 100% of their radiant flux.',
            descriptionRu: 'Опоясывает целые звёзды для улавливания 100% лучистой энергии.',
            icon: '☀️',
            baseCost: new BigNum(20000000),
            baseProduction: new BigNum(260000),
            multiplier: 1.15,
            accentColor: '#f59e0b'
        },
        {
            id: 'b8',
            name: 'Singularity Harvester',
            nameRu: 'Жнец сингулярности',
            description: 'Taps the event horizon of supermassive black holes.',
            descriptionRu: 'Черпает бесконечную гравитационную мощь горизонта событий черных дыр.',
            icon: '🌌',
            baseCost: new BigNum(330000000),
            baseProduction: new BigNum(3500000),
            multiplier: 1.15,
            accentColor: '#8b5cf6'
        }
    ],

    // Upgrades available for Soft Currency (Resets on Prestige)
    UPGRADES: [
        // Click upgrades
        {
            id: 'u_click_1',
            name: 'Overcharged Capacitor',
            nameRu: 'Форсированный конденсатор',
            descriptionRu: 'Сила клика удваивается (x2 к базовому клику).',
            cost: new BigNum(100),
            type: 'click',
            multiplier: 2,
            requirement: { type: 'clicks', value: 10 },
            icon: '👆'
        },
        {
            id: 'u_click_2',
            name: 'Kinetic Resonance',
            nameRu: 'Кинетический резонанс',
            descriptionRu: 'Клики дополнительно дают 2% от общего пассивного дохода (CPS).',
            cost: new BigNum(2500),
            type: 'click_cps',
            percentCPS: 0.02,
            requirement: { type: 'clicks', value: 50 },
            icon: '⚡'
        },
        {
            id: 'u_click_3',
            name: 'Hyper-Density Tap',
            nameRu: 'Гиперплотный импульс',
            descriptionRu: 'Клики дополнительно дают еще +3% от общего CPS (всего 5%).',
            cost: new BigNum(50000),
            type: 'click_cps',
            percentCPS: 0.03,
            requirement: { type: 'clicks', value: 150 },
            icon: '💥'
        },
        // Building specific upgrades
        {
            id: 'u_b1_1',
            name: 'Subatomic Tuning',
            nameRu: 'Субатомная юстировка',
            descriptionRu: 'Квантовые резонаторы работают в 2 раза эффективнее (x2).',
            cost: new BigNum(250),
            type: 'building',
            targetBuilding: 'b1',
            multiplier: 2,
            requirement: { type: 'building_count', buildingId: 'b1', count: 10 },
            icon: '🔧'
        },
        {
            id: 'u_b1_2',
            name: 'Zero-Point Extraction',
            nameRu: 'Экстракция нулевой точки',
            descriptionRu: 'Квантовые резонаторы работают в 3 раза эффективнее (x3).',
            cost: new BigNum(5000),
            type: 'building',
            targetBuilding: 'b1',
            multiplier: 3,
            requirement: { type: 'building_count', buildingId: 'b1', count: 50 },
            icon: '🔬'
        },
        {
            id: 'u_b2_1',
            name: 'Aether Distillation',
            nameRu: 'Дистилляция эфира',
            descriptionRu: 'Эфирные конденсаторы производят на 150% больше (x2.5).',
            cost: new BigNum(1500),
            type: 'building',
            targetBuilding: 'b2',
            multiplier: 2.5,
            requirement: { type: 'building_count', buildingId: 'b2', count: 10 },
            icon: '🧪'
        },
        {
            id: 'u_b2_2',
            name: 'Luminiferous Flow',
            nameRu: 'Светоносный поток',
            descriptionRu: 'Эфирные конденсаторы производят в 3 раза больше (x3).',
            cost: new BigNum(25000),
            type: 'building',
            targetBuilding: 'b2',
            multiplier: 3,
            requirement: { type: 'building_count', buildingId: 'b2', count: 50 },
            icon: '✨'
        },
        {
            id: 'u_b3_1',
            name: 'Magnetic Pinch Confinement',
            nameRu: 'Магнитное удержание плазмы',
            descriptionRu: 'Плазменные экстракторы производят в 2.5 раза больше (x2.5).',
            cost: new BigNum(15000),
            type: 'building',
            targetBuilding: 'b3',
            multiplier: 2.5,
            requirement: { type: 'building_count', buildingId: 'b3', count: 10 },
            icon: '🧲'
        },
        {
            id: 'u_b3_2',
            name: 'Corona Resonance',
            nameRu: 'Корональный резонанс',
            descriptionRu: 'Плазменные экстракторы производят в 3 раза больше (x3).',
            cost: new BigNum(200000),
            type: 'building',
            targetBuilding: 'b3',
            multiplier: 3,
            requirement: { type: 'building_count', buildingId: 'b3', count: 50 },
            icon: '☀️'
        },
        {
            id: 'u_b4_1',
            name: 'Recursive Replication',
            nameRu: 'Рекурсивная репликация',
            descriptionRu: 'Ядра нанитов производят в 3 раза больше (x3).',
            cost: new BigNum(180000),
            type: 'building',
            targetBuilding: 'b4',
            multiplier: 3,
            requirement: { type: 'building_count', buildingId: 'b4', count: 10 },
            icon: '🤖'
        },
        {
            id: 'u_b4_2',
            name: 'Molecular Weaver',
            nameRu: 'Молекулярный ткач',
            descriptionRu: 'Ядра нанитов производят в 4 раза больше (x4).',
            cost: new BigNum(2500000),
            type: 'building',
            targetBuilding: 'b4',
            multiplier: 4,
            requirement: { type: 'building_count', buildingId: 'b4', count: 50 },
            icon: '🕸️'
        },
        {
            id: 'u_b5_1',
            name: 'Higgs Stabilization',
            nameRu: 'Стабилизация бозона Хиггса',
            descriptionRu: 'Термоядерные коллайдеры производят в 3 раза больше (x3).',
            cost: new BigNum(2000000),
            type: 'building',
            targetBuilding: 'b5',
            multiplier: 3,
            requirement: { type: 'building_count', buildingId: 'b5', count: 10 },
            icon: '💫'
        },
        {
            id: 'u_b6_1',
            name: 'Positron Matrix',
            nameRu: 'Позитронная матрица',
            descriptionRu: 'Синтезаторы антиматерии производят в 3 раза больше (x3).',
            cost: new BigNum(25000000),
            type: 'building',
            targetBuilding: 'b6',
            multiplier: 3,
            requirement: { type: 'building_count', buildingId: 'b6', count: 10 },
            icon: '💎'
        },
        {
            id: 'u_b7_1',
            name: 'Photonic Harnessing',
            nameRu: 'Фотонная обвязка звезды',
            descriptionRu: 'Сетки сферы Дайсона производят в 3.5 раза больше (x3.5).',
            cost: new BigNum(300000000),
            type: 'building',
            targetBuilding: 'b7',
            multiplier: 3.5,
            requirement: { type: 'building_count', buildingId: 'b7', count: 10 },
            icon: '🌟'
        },
        {
            id: 'u_b8_1',
            name: 'Hawking Radiation Siphon',
            nameRu: 'Сифон излучения Хокинга',
            descriptionRu: 'Жнецы сингулярности производят в 4 раза больше (x4).',
            cost: new BigNum(5000000000),
            type: 'building',
            targetBuilding: 'b8',
            multiplier: 4,
            requirement: { type: 'building_count', buildingId: 'b8', count: 10 },
            icon: '🕳️'
        },
        // Global synergy upgrades
        {
            id: 'u_glob_1',
            name: 'Galactic Commerce Protocol',
            nameRu: 'Галактический протокол',
            descriptionRu: 'Глобальное производство всех генераторов увеличивается на 50% (x1.5).',
            cost: new BigNum(500000),
            type: 'global',
            multiplier: 1.5,
            requirement: { type: 'total_buildings', count: 75 },
            icon: '🌐'
        },
        {
            id: 'u_glob_2',
            name: 'Stellar Harmonization',
            nameRu: 'Звёздная гармонизация',
            descriptionRu: 'Глобальное производство всех генераторов удваивается (x2).',
            cost: new BigNum(50000000),
            type: 'global',
            multiplier: 2.0,
            requirement: { type: 'total_buildings', count: 200 },
            icon: '🌌'
        }
    ],

    // Meta Prestige Upgrades (Permanent, bought with Prestige Shards, Section 4.3)
    PRESTIGE_UPGRADES: [
        {
            id: 'meta_bonus_per_shard',
            nameRu: 'Резонанс Осколков',
            nameEn: 'Shard Resonance',
            descriptionRu: 'Увеличивает бонус за каждый Осколок Престижа на +0.5% (базово +2%).',
            baseCost: new BigNum(10),
            costMultiplier: 2.5,
            maxLevel: 10,
            effectPerLevel: 0.005,
            icon: '💎'
        },
        {
            id: 'meta_offline_time',
            nameRu: 'Хронос-Экспансия',
            nameEn: 'Chronos Expansion',
            descriptionRu: 'Увеличивает максимальное время оффлайн-прогресса на +2 часа (базово 2ч).',
            baseCost: new BigNum(15),
            costMultiplier: 3.0,
            maxLevel: 5,
            effectPerLevel: 7200, // +7200 sec per rank
            icon: '⏳'
        },
        {
            id: 'meta_offline_eff',
            nameRu: 'Теневая Энергетика',
            nameEn: 'Shadow Efficiency',
            descriptionRu: 'Увеличивает эффективность генерации в оффлайне на +10% (базово 50%).',
            baseCost: new BigNum(20),
            costMultiplier: 2.0,
            maxLevel: 5,
            effectPerLevel: 0.10,
            icon: '🌙'
        },
        {
            id: 'meta_click_power',
            nameRu: 'Импульс Сингулярности',
            nameEn: 'Singularity Pulse',
            descriptionRu: 'Клики перманентно наносят дополнительно +1% от общего CPS за уровень.',
            baseCost: new BigNum(25),
            costMultiplier: 2.5,
            maxLevel: 5,
            effectPerLevel: 0.01,
            icon: '💥'
        },
        {
            id: 'meta_cost_discount',
            nameRu: 'Космический Демпинг',
            nameEn: 'Cosmic Discount',
            descriptionRu: 'Снижает коэффициент удорожания зданий на 0.01 (например, с 1.15 до 1.14).',
            baseCost: new BigNum(250),
            costMultiplier: 4.0,
            maxLevel: 4,
            effectPerLevel: 0.01,
            icon: '📉'
        }
    ],

    // Achievements (Permanent bonuses, Section 4.3)
    ACHIEVEMENTS: [
        { id: 'ach_c1', nameRu: 'Первая искра', descRu: 'Сделать 1 клик по реактору', icon: '✨', check: s => s.totalClicks >= 1 },
        { id: 'ach_c100', nameRu: 'Импульсный шторм', descRu: 'Сделать 100 кликов по реактору', icon: '⚡', check: s => s.totalClicks >= 100 },
        { id: 'ach_c1000', nameRu: 'Властелин клика', descRu: 'Сделать 1,000 кликов по реактору', icon: '👆', check: s => s.totalClicks >= 1000 },
        
        { id: 'ach_b1_25', nameRu: 'Первый майлстоун', descRu: 'Улучшить любое здание до 25 уровня', icon: '🎯', check: s => Object.values(s.buildings).some(b => b.level >= 25) },
        { id: 'ach_b1_50', nameRu: 'Инженерная веха', descRu: 'Улучшить любое здание до 50 уровня', icon: '🏅', check: s => Object.values(s.buildings).some(b => b.level >= 50) },
        { id: 'ach_b1_100', nameRu: 'Век прогресса', descRu: 'Улучшить любое здание до 100 уровня', icon: '🏆', check: s => Object.values(s.buildings).some(b => b.level >= 100) },
        
        { id: 'ach_tot_50', nameRu: 'Начало экспансии', descRu: 'Построить 50 зданий суммарно', icon: '🏭', check: s => Object.values(s.buildings).reduce((acc, b) => acc + b.level, 0) >= 50 },
        { id: 'ach_tot_200', nameRu: 'Индустриальный флот', descRu: 'Построить 200 зданий суммарно', icon: '🚀', check: s => Object.values(s.buildings).reduce((acc, b) => acc + b.level, 0) >= 200 },
        { id: 'ach_tot_500', nameRu: 'Галактический кластер', descRu: 'Построить 500 зданий суммарно', icon: '🌌', check: s => Object.values(s.buildings).reduce((acc, b) => acc + b.level, 0) >= 500 },

        { id: 'ach_e_1k', nameRu: 'Первый капитал', descRu: 'Заработать 1,000 монет', icon: '💰', check: s => s.allTimeEarned.gte(1000) },
        { id: 'ach_e_1m', nameRu: 'Миллионер пустоты', descRu: 'Заработать 1.00 M монет', icon: '💵', check: s => s.allTimeEarned.gte(1e6) },
        { id: 'ach_e_1b', nameRu: 'Миллиардер эфира', descRu: 'Заработать 1.00 B монет', icon: '🏦', check: s => s.allTimeEarned.gte(1e9) },
        { id: 'ach_e_1t', nameRu: 'Триллионер галактики', descRu: 'Заработать 1.00 T монет', icon: '👑', check: s => s.allTimeEarned.gte(1e12) },
        { id: 'ach_e_1qa', nameRu: 'Квадриллионный магнат', descRu: 'Заработать 1.00 Qa монет (1.0e15)', icon: '💠', check: s => s.allTimeEarned.gte(1e15) },

        { id: 'ach_pres_1', nameRu: 'Перерождение сингулярности', descRu: 'Совершить первый Престиж (Soft Reset)', icon: '🌀', check: s => s.prestigeCount >= 1 },
        { id: 'ach_pres_5', nameRu: 'Циклический странник', descRu: 'Совершить 5 Престижей', icon: '🔄', check: s => s.prestigeCount >= 5 },
        { id: 'ach_shard_1k', nameRu: 'Осколочный титан', descRu: 'Накопить 1,000 Осколков Престижа', icon: '💎', check: s => s.prestigeShards.gte(1000) },

        { id: 'ach_cps_1k', nameRu: 'Турбо-генерация', descRu: 'Достичь 1,000 CPS дохода', icon: '📈', check: s => s.currentCPS.gte(1000) },
        { id: 'ach_cps_1m', nameRu: 'Плазменный поток', descRu: 'Достичь 1.00 M CPS дохода', icon: '🔥', check: s => s.currentCPS.gte(1e6) },
        { id: 'ach_cps_1b', nameRu: 'Звездный генератор', descRu: 'Достичь 1.00 B CPS дохода', icon: '☀️', check: s => s.currentCPS.gte(1e9) },

        { id: 'ach_all_b', nameRu: 'Полный ансамбль', descRu: 'Иметь хотя бы по 1 зданию каждого типа', icon: '🪐', check: s => GameData.BUILDINGS.every(b => (s.buildings[b.id]?.level || 0) >= 1) },
        { id: 'ach_upg_10', nameRu: 'Технократ', descRu: 'Приобрести 10 улучшений', icon: '🔬', check: s => Object.keys(s.purchasedUpgrades || {}).length >= 10 }
    ]
};

if (typeof window !== 'undefined') {
    window.GameData = GameData;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameData;
}
