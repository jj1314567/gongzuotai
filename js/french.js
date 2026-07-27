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

  // 听说读任务模板（按等级给不同难度）
  const TASK_BANK = {
    listen: {
      A1: ['听一段"自我介绍"对话，跟读 2 遍，注意 liason 连读', '盲听数字 1-20 录音，写出你听到的 5 个', '听一首法语儿歌，圈出学过的颜色词'],
      A2: ['听一段假期叙述，记录 3 个 passé composé 动词', '听播客片段，概括说话人去了哪里', '听点餐对话，写下点的两道菜'],
      B1: ['听 TED-Ed 法语短片，记 3 个表达观点的短语', '听新闻 1 分钟，复述核心事件', '听辩论片段，判断双方态度'],
      B2: ['听一篇社论，提炼作者论点与支持论据', '听访谈，分析语气与潜台词', '听无字幕报道，写 100 字摘要'],
      C1: ['听学术讲座 5 分钟，做结构化笔记', '听文学朗读，体会节奏与停顿', '听辩论，辨析逻辑谬误'],
    },
    speak: {
      A1: ['用 3 个新词各造 1 句并录音', '对着镜子做 30 秒法语自我介绍', '模仿音频跟读，注意语调'],
      A2: ['用 passé composé 讲一件上周发生的事（1 分钟）', '角色扮演：在咖啡馆点单', '描述一张照片里的人'],
      B1: ['就"是否应该环保出行"说 1 分钟看法', '用 si 条件句描述一个假设场景', '模拟一次面试自我介绍'],
      B2: ['就一个社会话题做 2 分钟陈述', '反驳一段给定观点，限时 1 分钟', '用近义词替换复述同一句话'],
      C1: ['做 3 分钟学术主题演讲', '即兴评论一则新闻', '用法语总结你正在读的书'],
    },
    read: {
      A1: ['朗读课文第 1 课，注意发音与停顿', '阅读短句，标出主语和动词', '看图读词，建立图文对应'],
      A2: ['朗读旅行日记，划出过去时', '读菜单，说出 3 道菜的主要成分', '读一封短信，回答 2 个问题'],
      B1: ['精读观点短文，划出连接词', '对比两篇立场不同的文章', '朗读并翻译一段文化介绍'],
      B2: ['精读社论，标注论点结构', '阅读文学节选，赏析修辞', '速读报道，30 秒概括'],
      C1: ['研读学术论文摘要，写批判笔记', '分析文学段落的叙事视角', '对照中英版本做视译练习'],
    },
  };

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

  // 生成听说读任务（各取 1 条）
  function genTasks(key) {
    const pick = (bank) => {
      const arr = bank[key] || bank.A1;
      return arr[Math.floor(Math.random() * arr.length)];
    };
    return {
      listen: pick(TASK_BANK.listen),
      speak: pick(TASK_BANK.speak),
      read: pick(TASK_BANK.read),
    };
  }

  // 生成随堂测试（n 题）
  function genQuiz(key, n) {
    n = n || 4;
    const pool = QUIZ[key] || QUIZ.A1;
    return shuffle(pool).slice(0, Math.min(n, pool.length));
  }

  global.French = { LEVELS, getLevel, lessonTopics, genTasks, genQuiz, shuffle, VIDEO_TOPICS, biliSearchUrl, dailyVideos };
})(window);
