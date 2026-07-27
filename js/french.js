/* ============================================================
   french.js · 法语学习引擎
   入门→精通课程体系；听说读分项练习；每次学习后随堂测试。
   ============================================================ */
(function (global) {
  'use strict';

  const LEVELS = [
    { key: 'A1', name: '入门 A1', desc: '发音、基础词汇与日常问候', color: '#8b5cf6' },
    { key: 'A2', name: '基础 A2', desc: '过去时、生活场景表达', color: '#10b981' },
    { key: 'B1', name: '进阶 B1', desc: '观点表达、虚拟式初探', color: '#f59e0b' },
    { key: 'B2', name: '高级 B2', desc: '议论文、社会议题辩论', color: '#3b82f6' },
    { key: 'C1', name: '精通 C1', desc: '学术写作、文学与思辨', color: '#ec4899' },
  ];

  // 各等级课程主题（用户可在此添加自己的教学视频链接）
  const LESSON_TOPICS = {
    A1: ['打招呼与自我介绍', '数字、颜色与月份', '家庭与职业', '日常时间表达', '餐厅点餐用语', ' shopping 购物会话'],
    A2: ['复合过去时 Passé composé', '描述一次旅行', '健康与身体部位', '电话沟通', '问路与方向', '天气与四季'],
    B1: ['虚拟式初探', '表达观点与建议', '工作与面试', '环保话题', '中法文化比较', '条件式 si 从句'],
    B2: ['议论文结构', '媒体与 misinformation', '社会议题辩论', '文学节选精读', '近义词辨析', '口语流利度训练'],
    C1: ['学术写作规范', '修辞与论证', '哲学与思辨阅读', '商务法语邮件', '文学批评写法', '视译与同传入门'],
  };

  /* ---------------- 听说读写 · 四项技能 ----------------
     每个技能按等级给出「具体学习素材」（不是一句打卡提示）。
     听/说 素材可用浏览器 TTS 朗读；读 带生词；写 带题目+示例+核心词。
     每天从素材池按日期确定性轮排，保证"每天内容不同但可复现"。 */
  const SKILLS = [
    { key: 'listen', name: '听', ico: '🎧', label: '听力 Listen', perDay: 3, kind: 'audio' },
    { key: 'speak',  name: '说', ico: '🗣', label: '口语 Speak', perDay: 3, kind: 'audio' },
    { key: 'read',   name: '读', ico: '📖', label: '阅读 Read',  perDay: 2, kind: 'read' },
    { key: 'write',  name: '写', ico: '✍', label: '写作 Write',  perDay: 2, kind: 'write' },
  ];

  // raw 素材：listen/speak/read -> {fr, zh, tip}；write -> {prompt, model, vocab}
  const SKILL_RAW = {
    listen: {
      A1: [
        { fr: 'Bonjour, comment allez-vous ?', zh: '您好，您好吗？', tip: '注意 vous 的 /v/ 与 allez 的连读' },
        { fr: 'Je m\'appelle Marie.', zh: '我叫玛丽。', tip: 'appelle 中 ll 发 /j/' },
        { fr: 'Merci beaucoup !', zh: '非常感谢！', tip: 'beaucoup 重音在 beau' },
        { fr: 'Quel est votre nom ?', zh: '您叫什么名字？', tip: 'quel 发 /kɛl/' },
        { fr: 'Je ne comprends pas.', zh: '我没听懂。', tip: 'ne...pas 构成否定框' },
        { fr: 'À bientôt !', zh: '回头见！', tip: 'bientôt 发 /bjɛ̃to/' },
      ],
      A2: [
        { fr: 'Hier, je suis allé au cinéma.', zh: '昨天我去看电影了。', tip: '复合过去时：je suis allé' },
        { fr: 'On a visité un musée intéressant.', zh: '我们参观了一个有趣的博物馆。', tip: 'visitée 是过去分词' },
        { fr: 'Elle est tombée malade la semaine dernière.', zh: '她上周生病了。', tip: 'tomber 用 être 作助动词' },
        { fr: 'Nous avons pris le train pour Lyon.', zh: '我们坐火车去了里昂。', tip: 'pris 是 prendre 的过去分词' },
        { fr: 'Tu as déjà lu ce livre ?', zh: '你已经读过这本书了吗？', tip: 'déjà = 已经' },
        { fr: 'Il a plu toute la journée.', zh: '下了一整天的雨。', tip: 'plu 是 pleuvoir 的过去分词' },
      ],
      B1: [
        { fr: 'À mon avis, le vélo est écologique.', zh: '我认为自行车很环保。', tip: 'à mon avis = 我认为' },
        { fr: 'Il faut réduire notre consommation de plastique.', zh: '我们应当减少塑料消费。', tip: 'réduire = 减少' },
        { fr: 'Selon l\'étude, le climat se réchauffe.', zh: '据研究，气候正在变暖。', tip: 'selon = 根据' },
        { fr: 'Je trouve cette idée plutôt convaincante.', zh: '我觉得这个想法挺有说服力。', tip: 'convaincant = 有说服力的' },
        { fr: 'On devrait privilégier les transports en commun.', zh: '我们应当优先公共交通。', tip: 'privilégier = 优先' },
        { fr: 'Bien que ce soit cher, la qualité est là.', zh: '尽管贵，但质量摆在那里。', tip: 'bien que 后接虚拟式' },
      ],
      B2: [
        { fr: 'L\'auteur déconstruit le mythe du progrès infini.', zh: '作者解构了"无限进步"的神话。', tip: 'déconstruire = 解构' },
        { fr: 'Cette mesure soulève de vives critiques.', zh: '这项措施引发强烈批评。', tip: 'soulever = 引发' },
        { fr: 'Le débat oppose deux visions de la société.', zh: '辩论让两种社会愿景对立。', tip: 'opposer = 使对立' },
        { fr: 'On ne saurait réduire le bonheur au PIB.', zh: '不能把幸福简化为 GDP。', tip: 'ne saurait = 不应' },
        { fr: 'Ces données corroborent l\'hypothèse initiale.', zh: '这些数据证实了最初的假设。', tip: 'corroborer = 证实' },
        { fr: 'Le paradoxe réside dans notre dépendance technique.', zh: '悖论在于我们的技术依赖。', tip: 'paradoxe = 悖论' },
      ],
    },
    speak: {
      A1: [
        { fr: 'Bonsoir, je voudrais une table pour deux.', zh: '晚上好，我想要一张两人桌。', tip: 'voudrais 是礼貌虚拟式' },
        { fr: 'L\'addition, s\'il vous plaît.', zh: '买单，谢谢。', tip: 'addition 注意重音在末尾' },
        { fr: 'Où sont les toilettes ?', zh: '洗手间在哪里？', tip: 'toilettes 发 /twa.lɛt/' },
        { fr: 'Je voudrais un café crème.', zh: '我想要一杯奶咖。', tip: 'crème 含鼻化元音' },
        { fr: 'Combien ça coûte ?', zh: '这个多少钱？', tip: 'coûte 发 /kut/' },
        { fr: 'Parlez lentement, s\'il vous plaît.', zh: '请说慢一点。', tip: 'lentement 发 /lɑ̃tmɑ̃/' },
      ],
      A2: [
        { fr: 'La semaine dernière, je suis allé à la plage.', zh: '上周我去了海滩。', tip: 'plage = 海滩' },
        { fr: 'Si j\'avais le temps, je ferais du sport.', zh: '如果有时间，我会去运动。', tip: 'si + imparfait → 条件式' },
        { fr: 'Je voudrais réserver une chambre.', zh: '我想预订一个房间。', tip: 'réserver = 预订' },
        { fr: 'Pouvez-vous m\'aider, s\'il vous plaît ?', zh: '您能帮我一下吗？', tip: 'pouvez = pouvoir 的变位' },
        { fr: 'Je préfère le thé vert au café.', zh: '比起咖啡我更喜欢绿茶。', tip: 'préférer = 更喜欢' },
        { fr: 'Qu\'est-ce que tu fais ce week-end ?', zh: '你这个周末做什么？', tip: 'ce week-end = 这周末' },
      ],
      B1: [
        { fr: 'Je pense que nous devrions agir maintenant.', zh: '我认为我们现在就该行动。', tip: 'devrions = 应该（条件式）' },
        { fr: 'D\'une part... d\'autre part...', zh: '一方面…另一方面…', tip: '议论文常用连接词' },
        { fr: 'Si j\'étais maire, je créerais des pistes cyclables.', zh: '如果我是市长，我会建自行车道。', tip: '条件式表达假设' },
        { fr: 'Qu\'en penses-tu de cette proposition ?', zh: '你怎么看这个提议？', tip: 'proposition = 提议' },
        { fr: 'Il est essentiel de protéger la biodiversité.', zh: '保护生物多样性至关重要。', tip: 'essentiel = 必要的' },
        { fr: 'Je suis tout à fait d\'accord avec vous.', zh: '我完全同意您的看法。', tip: 'tout à fait = 完全' },
      ],
      B2: [
        { fr: 'Il conviendrait de nuancer cet argument.', zh: '应当为这个论点加上一些限定。', tip: 'nuancer = 使更 nuanced' },
        { fr: 'Loin de moi l\'idée de généraliser.', zh: '我绝无意一概而论。', tip: 'loin de moi = 绝非' },
        { fr: 'Certes, mais cela ne justifie pas tout.', zh: '诚然，但这并不能开脱一切。', tip: 'certes = 诚然' },
        { fr: 'Je réfute l\'idée selon laquelle le marché tout résout.', zh: '我驳斥"市场能解决一切"的观点。', tip: 'réfuter = 驳斥' },
        { fr: 'En définitive, le compromis s\'impose.', zh: '归根结底，必须妥协。', tip: 'en définitive = 归根结底' },
        { fr: 'Quoi qu\'il en soit, l\'urgence reste climatique.', zh: '无论如何，紧迫性仍在于气候。', tip: 'quoi qu\'il en soit = 无论如何' },
      ],
    },
    read: {
      A1: [
        { fr: 'Le chat noir dort sur le canapé.', zh: '黑猫睡在沙发上。', tip: '生词：chat=猫，canapé=沙发' },
        { fr: 'J\'aime les fleurs rouges.', zh: '我喜欢红色的花。', tip: '生词：fleur=花，rouge=红色' },
        { fr: 'Il fait beau aujourd\'hui.', zh: '今天天气很好。', tip: 'Il fait beau = 天气好' },
        { fr: 'Ma sœur habite à Paris.', zh: '我妹妹住在巴黎。', tip: '生词：sœur=姐妹，habiter=居住' },
        { fr: 'Nous mangeons à midi.', zh: '我们中午吃饭。', tip: '生词：midi=中午' },
      ],
      A2: [
        { fr: 'Après la pluie, le ciel est bleu.', zh: '雨后天空很蓝。', tip: '生词：après=在…之后' },
        { fr: 'Mon frère a préparé un dîner délicieux.', zh: '我哥哥准备了一顿美味的晚餐。', tip: '生词：délicieux=美味的' },
        { fr: 'Le train part à neuf heures moins le quart.', zh: '火车 8:45 出发。', tip: 'moins le quart = 差一刻' },
        { fr: 'Elle cherche un appartement à louer.', zh: '她在找一套出租公寓。', tip: '生词：chercher=寻找，louer=出租' },
        { fr: 'Le livre que je lis est passionnant.', zh: '我读的这本书很精彩。', tip: '生词：passionnant=精彩的' },
      ],
      B1: [
        { fr: 'La France compte plus de 67 millions d\'habitants.', zh: '法国人口超过 6700 万。', tip: 'compter = 共计/拥有' },
        { fr: 'Le vin et le fromage font partie du patrimoine.', zh: '葡萄酒和奶酪是文化遗产的一部分。', tip: 'patrimoine = 遗产' },
        { fr: 'De plus en plus de jeunes apprennent le chinois.', zh: '越来越多年轻人学习中文。', tip: 'de plus en plus = 越来越' },
        { fr: 'L\'éducation gratuite est un droit fondamental.', zh: '免费教育是基本权利。', tip: 'fondamental = 基本的' },
        { fr: 'Le réchauffement climatique menace les océans.', zh: '气候变暖威胁着海洋。', tip: 'menacer = 威胁' },
      ],
      B2: [
        { fr: 'La laïcité demeure un pilier de l\'identité républicaine.', zh: '世俗主义仍是共和认同的支柱。', tip: 'laïcité = 世俗主义' },
        { fr: 'L\'œuvre questionne le rapport à l\'altérité.', zh: '这部作品质疑与他者的关系。', tip: 'altérité = 他者性' },
        { fr: 'Le texte déploie une rhétorique de la responsabilité.', zh: '文本展开了关于责任的修辞。', tip: 'rhétorique = 修辞' },
        { fr: 'On observe un glissement sémantique du terme.', zh: '可观察到该词语义的偏移。', tip: 'sémantique = 语义' },
        { fr: 'L\'essai dénonce la fracture sociale croissante.', zh: '这篇随笔谴责日益加剧的社会裂痕。', tip: 'fracture = 裂痕' },
      ],
    },
    write: {
      A1: [
        { prompt: '写 3 句话介绍你自己（名字、来自哪里、喜欢什么）。', model: 'Je m\'appelle... Je viens de... J\'aime...', vocab: 'venir de = 来自' },
        { prompt: '写写你今天的早餐（2-3 句）。', model: 'Ce matin, j\'ai mangé... et bu...', vocab: 'petit-déjeuner = 早餐' },
        { prompt: '用「J\'adore...」写 2 样你喜欢的东西。', model: 'J\'adore le chocolat et les films français.', vocab: 'adorer = 喜爱' },
        { prompt: '用「Je veux...」写 2 个你的愿望。', model: 'Je veux voyager en France un jour.', vocab: 'voyager = 旅行' },
        { prompt: '写一句今天的天气和你的心情。', model: 'Il fait beau et je suis heureux.', vocab: 'heureux = 开心的' },
      ],
      A2: [
        { prompt: '用复合过去时写 3 句你上周做过的事。', model: 'La semaine dernière, je suis allé... j\'ai lu... j\'ai cuisiné...', vocab: 'la semaine dernière = 上周' },
        { prompt: '写一段约 50 字的餐厅点餐对话。', model: '- Je voudrais un steak, s\'il vous plaît. - Très bien, et comme boisson ?', vocab: 'commander = 点餐' },
        { prompt: '描述你现在住的地方（2-3 句）。', model: 'J\'habite un petit appartement. Il y a une cuisine et une chambre.', vocab: 'appartement = 公寓' },
        { prompt: '用 « si + imparfait » 写 2 个假设。', model: 'Si j\'avais plus de temps, je lirais davantage.', vocab: 'si = 如果' },
        { prompt: '写 2 句你对环保的看法。', model: 'Il faut protéger la nature. On doit recycler.', vocab: 'protéger = 保护' },
      ],
      B1: [
        { prompt: '就「是否应该少开车」写一段约 80 字的观点。', model: 'À mon avis, il faut prendre les transports en commun pour réduire la pollution.', vocab: 'voiture = 汽车' },
        { prompt: '用连接词写一段对比两座城市的文字。', model: 'D\'une part Paris est vaste, d\'autre part Lyon est plus calme.', vocab: 'comparer = 比较' },
        { prompt: '写一封约 60 字的正式邮件预约见面。', model: 'Madame, Monsieur, je souhaiterais fixer un rendez-vous la semaine prochaine.', vocab: 'rendez-vous = 预约' },
        { prompt: '用条件式写 2 句你对未来的设想。', model: 'Si j\'avais un jardin, je planterais des fleurs.', vocab: 'futur = 未来' },
        { prompt: '写 3 句你最近读的一本书的感想。', model: 'Ce livre parle de l\'amitié. L\'auteur écrit simplement. Je le recommande.', vocab: 'auteur = 作者' },
      ],
      B2: [
        { prompt: '写一篇约 120 字的议论文引言（抛出论点+背景）。', model: 'Dans un monde où l\'information circule vite, il convient de défendre une thèse claire.', vocab: 'thèse = 论点' },
        { prompt: '用近义词替换重写给定句子练习（important → essentiel）。', model: 'Ce point est essentiel pour la suite.', vocab: 'synonyme = 近义词' },
        { prompt: '写一段约 80 字反驳某个观点。', model: 'Au contraire, je soutiens que cette réforme aggrave les inégalités.', vocab: 'réfuter = 反驳' },
        { prompt: '就媒体与信息写一篇约 100 字评论。', model: 'Les médias doivent lutter contre la désinformation et vérifier les faits.', vocab: 'désinformation = 虚假信息' },
        { prompt: '用 « bien que + 虚拟式 » 写 2 句。', model: 'Bien que le sujet soit complexe, nous devons agir.', vocab: 'subjonctif = 虚拟式' },
      ],
    },
  };

  // 为每个素材生成稳定 id（skill-level-index），保证跨天可复现进度
  const SKILL_CONTENT = {};
  SKILLS.forEach((s) => {
    SKILL_CONTENT[s.key] = {};
    Object.keys(SKILL_RAW[s.key]).forEach((lv) => {
      SKILL_CONTENT[s.key][lv] = SKILL_RAW[s.key][lv].map((it, i) => Object.assign({ id: s.key + '-' + lv + '-' + i }, it));
    });
  });

  function skillPool(skill, level) {
    const bank = SKILL_CONTENT[skill] || {};
    return bank[level] || bank.B2 || [];
  }

  // 按日期确定性轮排：每个技能独立的偏移种子，保证四模块内容不同步
  function dailySkillItems(skill, dateStr, level, n) {
    const pool = skillPool(skill, level);
    if (!pool.length) return [];
    const ep = Math.floor(Date.parse(dateStr + 'T00:00:00') / 86400000);
    const seed = { listen: 1, speak: 2, read: 3, write: 4 }[skill] || 0;
    const start = (((ep + seed) % pool.length) + pool.length) % pool.length;
    const out = [];
    for (let i = 0; i < n; i++) out.push(pool[(start + i) % pool.length]);
    return out;
  }

  // 每天每项技能的素材条数（即进度分母）
  function skillTotals(dateStr, level) {
    const o = {};
    SKILLS.forEach((s) => { o[s.key] = s.perDay; });
    return o;
  }

  // 随堂测试题库（MCQ）。answer 为正确选项索引
  const QUIZ = {
    A1: [
      { q: '“你好”用法语怎么说？', options: ['Bonjour', 'Bonsoir', 'Salut', 'Merci'], a: 0, e: 'Bonjour 是白天/通用问候；Bonsoir 用于晚上。' },
      { q: '“谢谢”是？', options: ['Oui', 'Non', 'Merci', 'S\'il vous plaît'], a: 2, e: 'Merci = 谢谢；S\'il vous plaît = 请。' },
      { q: '数字“3”是？', options: ['deux', 'trois', 'un', 'quatre'], a: 1, e: 'trois = 3。' },
      { q: '“我是学生”正确表达？', options: ['Je suis étudiant', 'Je avoir étudiant', 'Étudiant je', 'Je étudiant'], a: 0, e: 'Je suis + 职业名词。' },
      { q: '“水”是？', options: ['pain', 'eau', 'lait', 'vin'], a: 1, e: 'eau = 水。' },
      { q: '"再见"常用？', options: ['Au revoir', 'Bonjour', 'Oui', 'Salut 仅白天'], a: 0, e: 'Au revoir = 再见。' },
    ],
    A2: [
      { q: '“我去看了电影”用复合过去时？', options: ['Je vais au cinéma', 'J\'ai vu un film', 'Je vois un film', 'Je verrai un film'], a: 1, e: 'voir 的复合过去时：j\'ai vu。' },
      { q: '“昨天”是？', options: ['demain', 'aujourd\'hui', 'hier', 'maintenant'], a: 2, e: 'hier = 昨天。' },
      { q: '“我很抱歉”正确？', options: ['Je suis désolé', 'Je désolé', 'Désolé je', 'Je avoir désolé'], a: 0, e: 'être désolé(e)。' },
      { q: '“天气好”怎么说？', options: ['Il fait beau', 'Il est beau', 'C\'est beau', 'Elle fait beau'], a: 0, e: '天气用 il fait + 形容词。' },
      { q: '“你叫什么名字？”', options: ['Comment tu vas', 'Comment t\'appelles-tu', 'Quel âge', 'Où habites-tu'], a: 1, e: 'Comment t\'appelles-tu = 你叫什么。' },
      { q: '“我想喝水”正确？', options: ['Je veux boire', 'Je bois veux', 'Je avoir boire', 'Boire je veux'], a: 0, e: 'vouloir + 动词原形。' },
    ],
    B1: [
      { q: '虚拟式常用于表达？', options: ['事实陈述', '愿望/情感/必要', '过去动作', '未来预测'], a: 1, e: '虚拟式表主观态度（愿望、情感、必要等）。' },
      { q: '“我认为应该去”较得体？', options: ['Je pense que nous devons y aller', 'Je pense nous allons', 'Je pense aller', 'Je pense de aller'], a: 0, e: 'Je pense que + 直陈式。' },
      { q: '“如果我有时间，我会去”条件式？', options: ['Si j\'ai le temps, je vais', 'Si j\'avais le temps, j\'irais', 'Si j\'ai eu le temps', 'Si j\'aurai le temps'], a: 1, e: 'si + imparfait → conditionnel（主句）。' },
      { q: '“无论什么”法语？', options: ['quelque chose', 'quoi que', 'rien', 'personne'], a: 1, e: 'quoi que + 虚拟式 = 无论什么。' },
      { q: '表达建议常用？', options: ['Je dois', 'Il faudrait', 'Je suis', 'J\'ai'], a: 1, e: 'il faudrait = 应该（委婉建议）。' },
    ],
    B2: [
      { q: '议论文引言通常？', options: ['直接给结论', '抛出论点+背景', '只讲故事', '不表态'], a: 1, e: '引言应引出主题与立场。' },
      { q: '“据研究表明”法语？', options: ['Selon l\'étude', 'Je pense', 'Il pleut', 'Bonjour'], a: 0, e: 'Selon + 名词 = 根据…' },
      { q: '反驳对方可用？', options: ['D\'accord', 'Au contraire', 'Peut-être', 'Merci'], a: 1, e: 'Au contraire = 相反/反驳。' },
      { q: '“尽管如此”是？', options: ['Cependant', 'Donc', 'Puis', 'Car'], a: 0, e: 'Cependant = 然而/尽管如此。' },
      { q: '近义词“重要”可选？', options: ['petit', 'important / essentiel', 'rouge', 'vite'], a: 1, e: 'essentiel 与 important 近义。' },
    ],
    C1: [
      { q: '学术写作应避免？', options: ['清晰论点', '第一人称随意抒情', '引用来源', '逻辑结构'], a: 1, e: '学术写作需客观，避免随意主观抒情。' },
      { q: '“换言之”法语？', options: ['En d\'autres termes', 'Bonjour', 'Voici', 'Toujours'], a: 0, e: 'En d\'autres termes = 换言之。' },
      { q: '视译指？', options: ['看稿即译', '背诵翻译', '机器翻译', '不读稿'], a: 0, e: '视译=边看原文边口译。' },
      { q: '“本文旨在”正式表达？', options: ['Ce texte veut', 'Cet article a pour but de', 'Je veux', 'On fait'], a: 1, e: 'avoir pour but de = 旨在。' },
      { q: '逻辑谬误的作用是？', options: ['增强论证', '削弱可信度', '无关', '装饰'], a: 1, e: '谬误会削弱论证可信度。' },
    ],
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getLevel(key) { return LEVELS.find((l) => l.key === key) || LEVELS[0]; }
  function lessonTopics(key) { return LESSON_TOPICS[key] || []; }

  /* ---------------- 每日跟学 · B站热门法语 ----------------
     说明：纯前端无法实时抓取 B站热门榜（接口有跨域限制），
     故用「热门法语学习主题池」按日期自动轮排成每日计划，
     每条都跳转到 B站对应主题搜索页（即按热度排序的相关视频）。 */
  const VIDEO_TOPICS = [
    { id: 'v-fayin', title: '法语发音入门（元音/辅音）', tag: 'A1', desc: '跟练标准法语发音', kw: '法语发音入门' },
    { id: 'v-richang', title: '法语日常会话 100 句', tag: 'A1', desc: '高频实用口语', kw: '法语日常会话' },
    { id: 'v-ertong', title: '法语儿歌 / 动画（轻松入门）', tag: 'A1', desc: '兴趣驱动磨耳朵', kw: '法语儿歌' },
    { id: 'v-yinbiao', title: '法语音标跟读', tag: 'A1', desc: '音准训练', kw: '法语音标' },
    { id: 'v-yufa', title: '法语基础语法（时态/性数）', tag: 'A2', desc: '搭建语法框架', kw: '法语基础语法' },
    { id: 'v-tingli', title: '法语听力训练', tag: 'A2', desc: '每日泛听', kw: '法语听力训练' },
    { id: 'v-cihui', title: '法语核心词汇 2000', tag: 'A2', desc: '高频词积累', kw: '法语词汇' },
    { id: 'v-kouyu', title: '法语口语情景对话', tag: 'A2', desc: '开口说', kw: '法语口语' },
    { id: 'v-podcast', title: '法语 Podcast 听力', tag: 'B1', desc: '进阶听力', kw: '法语podcast' },
    { id: 'v-jingting', title: '法语影视精听', tag: 'B1', desc: '跟读原声', kw: '法语影视 精听' },
    { id: 'v-bianlun', title: '法语辩论与观点表达', tag: 'B2', desc: '思辨输出', kw: '法语辩论' },
    { id: 'v-xinwen', title: '法语新闻听力', tag: 'B2', desc: '真实语料', kw: '法语新闻 听力' },
  ];

  function biliSearchUrl(kw) {
    return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(kw);
  }

  // 按日期确定性轮排：优先匹配用户当前等级，再补其它，每天换一批
  function dailyVideos(dateStr, level) {
    const ep = Math.floor(Date.parse(dateStr + 'T00:00:00') / 86400000);
    const matched = VIDEO_TOPICS.filter((t) => t.tag === level);
    const others = VIDEO_TOPICS.filter((t) => t.tag !== level);
    const pool = matched.length ? matched.concat(others) : VIDEO_TOPICS.slice();
    const n = 3;
    const start = ((ep % pool.length) + pool.length) % pool.length;
    const out = [];
    for (let i = 0; i < n; i++) out.push(pool[(start + i) % pool.length]);
    return out;
  }

  // 生成随堂测试（n 题）
  function genQuiz(key, n) {
    n = n || 4;
    const pool = QUIZ[key] || QUIZ.A1;
    return shuffle(pool).slice(0, Math.min(n, pool.length));
  }

  global.French = { LEVELS, getLevel, lessonTopics, genQuiz, shuffle, VIDEO_TOPICS, biliSearchUrl, dailyVideos, SKILLS, dailySkillItems, skillTotals };
})(window);
