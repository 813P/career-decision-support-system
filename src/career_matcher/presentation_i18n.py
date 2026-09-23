from __future__ import annotations

from typing import Any


ROLE_TRANSLATIONS_ZH: dict[str, dict[str, Any]] = {
    "strategic_analysis": {
        "definition": "评估长期内外部变化、新兴机会、风险与战略选项，为集团或业务层面的方向制定和资源配置提供支持，通常关注三至五年的时间跨度。",
        "core_task_areas": [
            "分析宏观经济、行业、技术、监管、客户与竞争格局的变化。",
            "评估内部能力、业务组合位置及长期经营表现驱动因素。",
            "识别新兴市场、新业务机会、结构性风险与重大变化。",
            "开展市场规模测算、情景分析与长期预测。",
            "比较战略选项及其资源配置影响。",
            "为集团或业务决策者形成长期战略报告与建议。",
        ],
    },
    "business_performance_goal_management": {
        "definition": "将业务目标转化为可衡量的指标，持续监控表现、解释偏差，并支持周期性的规划、预算、预测和经营复盘。",
        "core_task_areas": [
            "拆解业务目标并定义绩效衡量指标。",
            "设计和维护 KPI 与绩效管理体系。",
            "支持预算、滚动预测与经营计划。",
            "比较实际表现与目标、预算或历史期间。",
            "诊断绩效偏差及其业务驱动因素。",
            "组织周期性经营复盘并跟进改善行动。",
        ],
    },
    "business_strategy_focused_analysis": {
        "definition": "拆解模糊且非例行的业务问题，结合定量与定性证据比较方案，并针对增长、产品、客户、商业、流程或运营决策提出可执行建议。",
        "core_task_areas": [
            "定义并拆解模糊的业务问题。",
            "提出分析假设并建立问题框架。",
            "开展聚焦的定量分析与业务诊断。",
            "通过访谈、案头研究或跨部门协作收集定性证据。",
            "比较商业案例、备选方案、成本、收益与潜在影响。",
            "形成并沟通可执行的建议。",
        ],
    },
    "data_analytics": {
        "definition": "通过数据准备、指标体系设计、分析数据基础、报告、可视化以及描述性或诊断性分析，将原始数据转化为可靠、可解释且可复用的业务决策证据。",
        "core_task_areas": [
            "获取、清洗、转换、验证并核对数据。",
            "设计指标体系、口径、维度与计算标准。",
            "开发或维护可复用的分析数据集、数据集市、语义层与数据字典。",
            "定义数据质量检查并支持面向分析的数据治理。",
            "使用 SQL 等工具查询和分析数据。",
            "制作报告、仪表盘与数据可视化。",
            "开展描述性和诊断性分析，并向业务相关方沟通发现。",
        ],
    },
    "data_science": {
        "definition": "运用统计建模、机器学习、实验、因果推断与优化方法，从数据中构建和评估预测模型或决策支持模型。",
        "core_task_areas": [
            "开展探索性分析并准备建模数据。",
            "进行特征工程与模型选择。",
            "构建预测、分类、推荐、因果或优化模型。",
            "设计并分析 A/B 测试、随机实验、多变量实验、准实验与增益分析。",
            "训练、验证、比较并监控模型。",
            "解释模型与实验结果。",
            "说明模型或实验证据应如何支持决策。",
        ],
    },
}


OCCUPATION_NAMES_ZH = {
    "artificial intelligence engineer": "人工智能工程师",
    "budget analyst": "预算分析师",
    "business analyst": "业务分析师",
    "business consultant": "业务顾问",
    "business valuer": "企业估值分析师",
    "cost analyst": "成本分析师",
    "data analyst": "数据分析师",
    "data scientist": "数据科学家",
    "economic adviser": "经济顾问",
    "economist": "经济学家",
    "financial analyst": "财务分析师",
    "market research analyst": "市场研究分析师",
    "pricing specialist": "定价专家",
    "statistician": "统计学家",
    "strategic planning manager": "战略规划经理",
}


SKILL_NAMES_ZH = {
    "A/B testing": "A/B 测试",
    "Excel": "Excel",
    "KPI system design": "KPI 体系设计",
    "Python": "Python",
    "Python (computer programming)": "Python 编程",
    "SQL": "SQL",
    "advise on economic development": "提供经济发展建议",
    "advise on efficiency improvements": "提供效率改善建议",
    "advise on market strategies": "提供市场策略建议",
    "algorithms": "算法",
    "analyse big data": "分析大数据",
    "analyse business plans": "分析商业计划",
    "analyse business processes": "分析业务流程",
    "analyse business requirements": "分析业务需求",
    "analyse consumer buying trends": "分析消费者购买趋势",
    "analyse economic trends": "分析经济趋势",
    "analyse external factors of companies": "分析企业外部因素",
    "analyse financial performance of a company": "分析企业财务表现",
    "analyse internal factors of companies": "分析企业内部因素",
    "analyse market financial trends": "分析市场金融趋势",
    "analyse the context of an organisation": "分析组织环境",
    "apply scientific methods": "应用科学方法",
    "apply statistical analysis techniques": "应用统计分析技术",
    "apply strategic thinking": "运用战略思维",
    "artificial neural networks": "人工神经网络",
    "assess financial viability": "评估财务可行性",
    "assess risk factors": "评估风险因素",
    "budgetary principles": "预算原则",
    "budgeting": "预算管理",
    "build recommender systems": "构建推荐系统",
    "business analysis": "业务分析",
    "business analytics": "商业分析",
    "business case development": "商业案例设计",
    "business communication": "业务沟通",
    "business intelligence": "商业智能",
    "business management principles": "企业管理原则",
    "business problem framing": "业务问题界定",
    "business process modelling": "业务流程建模",
    "business processes": "业务流程",
    "business valuation techniques": "企业估值技术",
    "carry out statistical forecasts": "开展统计预测",
    "causal inference": "因果推断",
    "commercial analysis": "商业分析",
    "competitive analysis": "竞争分析",
    "computer programming": "计算机编程",
    "computer simulation": "计算机仿真",
    "conduct qualitative research": "开展定性研究",
    "conduct quantitative research": "开展定量研究",
    "consider economic criteria in decision making": "在决策中考虑经济标准",
    "cost management": "成本管理",
    "create data sets": "创建数据集",
    "data engineering": "数据工程",
    "data ethics": "数据伦理",
    "data mining": "数据挖掘",
    "data models": "数据模型",
    "data quality assessment": "数据质量评估",
    "data science": "数据科学",
    "data validation": "数据验证",
    "data visualisation software": "数据可视化软件",
    "data visualization": "数据可视化",
    "define data quality criteria": "定义数据质量标准",
    "deliver visual presentation of data": "以可视化方式呈现数据",
    "descriptive statistics": "描述性统计",
    "develop business plans": "制定商业计划",
    "develop company strategies": "制定公司战略",
    "develop financial statistics reports": "编制财务统计报告",
    "digital data processing": "数字数据处理",
    "draw conclusions from market research results": "从市场研究结果中得出结论",
    "economics": "经济学",
    "empirical analysis": "实证分析",
    "establish data processes": "建立数据流程",
    "evaluate budgets": "评估预算",
    "executive communication": "高管沟通",
    "execute analytical mathematical calculations": "执行分析性数学计算",
    "experiment design": "实验设计",
    "feature engineering": "特征工程",
    "financial forecasting": "财务预测",
    "financial modelling": "财务建模",
    "forecasting": "预测",
    "gather data": "收集数据",
    "goal management": "目标管理",
    "hypothesis development": "假设构建",
    "identify market niches": "识别细分市场",
    "identify potential markets for companies": "识别企业潜在市场",
    "identify process improvements": "识别流程改善机会",
    "identify statistical patterns": "识别统计模式",
    "industry research": "行业研究",
    "information extraction": "信息提取",
    "interpret current data": "解读当前数据",
    "machine learning": "机器学习",
    "macroeconomics": "宏观经济学",
    "manage data": "管理数据",
    "market analysis": "市场分析",
    "market research": "市场研究",
    "market sizing": "市场规模测算",
    "mathematical modelling": "数学建模",
    "metric design": "指标设计",
    "metric governance": "指标治理",
    "model evaluation": "模型评估",
    "model monitoring": "模型监控",
    "normalise data": "数据标准化",
    "operational research": "运筹学",
    "optimization": "优化",
    "perform business analysis": "开展业务分析",
    "perform business research": "开展商业研究",
    "perform data analysis": "开展数据分析",
    "perform data cleansing": "开展数据清洗",
    "perform data mining": "开展数据挖掘",
    "perform market research": "开展市场研究",
    "perform risk analysis": "开展风险分析",
    "perform scientific research": "开展科学研究",
    "performance management": "绩效管理",
    "presentation": "演示表达",
    "process data": "处理数据",
    "process modelling": "流程建模",
    "provide cost benefit analysis reports": "提供成本效益分析报告",
    "quantitative analysis": "定量分析",
    "query languages": "查询语言",
    "quasi-experimental analysis": "准实验分析",
    "report analysis results": "报告分析结果",
    "research design": "研究设计",
    "reusable analytical dataset design": "可复用分析数据集设计",
    "rolling forecast": "滚动预测",
    "scenario planning": "情景规划",
    "stakeholder management": "利益相关方管理",
    "statistical analysis system software": "统计分析软件",
    "statistical modeling techniques": "统计建模技术",
    "statistics": "统计学",
    "strategic option evaluation": "战略选项评估",
    "strategic planning": "战略规划",
    "synthesise information": "综合信息",
    "uplift modelling": "增益建模",
    "variance analysis": "偏差分析",
    "visual presentation techniques": "可视化呈现技术",
}


JD_KEYWORDS_ZH = {
    "strategic_analysis": ["战略", "长期规划", "行业研究", "竞争分析", "市场规模", "情景分析", "资源配置"],
    "business_performance_goal_management": ["目标管理", "绩效", "经营分析", "指标", "预算", "滚动预测", "经营复盘", "偏差分析"],
    "business_strategy_focused_analysis": ["业务策略", "专项分析", "业务问题", "分析假设", "商业案例", "方案比较", "改善建议"],
    "data_analytics": ["数据分析", "数据清洗", "数据质量", "指标体系", "仪表盘", "可视化", "SQL"],
    "data_science": ["数据科学", "机器学习", "预测模型", "推荐模型", "因果推断", "实验设计", "A/B 测试", "优化模型"],
}


def normalize_language(value: Any) -> str:
    return "en" if str(value or "").casefold().startswith("en") else "zh"


def role_for_presentation(role: dict[str, Any]) -> dict[str, Any]:
    translated = ROLE_TRANSLATIONS_ZH[role["role_profile_id"]]
    return {
        **role,
        "definition_en": role["definition"],
        "definition_zh": translated["definition"],
        "core_task_areas_en": role["core_task_areas"],
        "core_task_areas_zh": translated["core_task_areas"],
    }


def role_text(role: dict[str, Any], field: str, language: Any) -> Any:
    if normalize_language(language) == "en":
        return role[field]
    return ROLE_TRANSLATIONS_ZH[role["role_profile_id"]][field]


def occupation_name(title: str, language: Any) -> str:
    return title if normalize_language(language) == "en" else OCCUPATION_NAMES_ZH.get(title, title)


def skill_name(label: str, language: Any) -> str:
    return label if normalize_language(language) == "en" else SKILL_NAMES_ZH.get(label, label)
