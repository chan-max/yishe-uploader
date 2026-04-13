# 电商采集平台能力报告

生成时间：2026-04-12T07:37:22.792Z

> 说明：这里输出的是 capability schema 中声明的“平台功能、参数字段、预期返回字段和可分析方向”。真实运行后，可在 admin 原始数据详情中查看“实际字段目录”和“字段对照”。

## 1688 (`1688`)

- 状态：启发式可用
- 可执行：是
- 平台说明：1688 已接入独立平台模块，当前优先覆盖同款搜索与详情采集，适合作为供应链侧数据源。
- 说明：1688 容易触发验证码或风控；命中时会尽快返回受限状态，不会长时间卡住任务。
- 说明：当前选择器以启发式兼容为主，后续可按真实页面持续补细节字段。

### 关键词搜索 (`1688.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：进入 1688 搜索结果页，提取供货商品卡片原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 默认会规范化详情链接，方便后续继续进入详情页补充信息。

- 示例
- 1688 搜索采集

### 商品详情 (`1688.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开 1688 商品详情页，提取标题、价格、图集和描述摘要等原始信息。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 如果详情页触发验证码，当前会返回受限状态，便于上游决定是否重试。

- 示例
- 1688 商品详情采集

### 店铺热门商品 (`1688.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开 1688 店铺商品列表页，提取热门供货商品卡片原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- 1688 店铺热门商品采集

## Amazon (`amazon`)

- 状态：可用
- 可执行：是
- 访问限制：建议登录 / 偶发验证码 / 中风控
- 平台说明：Amazon 当前是首批优先平台，搜索、详情、店铺热门商品三类场景都已做过真实 DOM 调试。
- 说明：适合先作为稳定平台上线，后续再逐步扩更多跨境站点。
- 说明：当前以原始数据保真入库为主，不强行在采集时做深度结构化。

### 关键词搜索 (`amazon.search`)

- 可执行：是
- 可用性：可用
- 验证状态：已验证
- 访问限制：建议登录 / 偶发验证码 / 中风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：进入 Amazon 搜索页后先抓取商品卡片，再按商品链接逐个进入详情页补抓详情信息。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 评分/评论 / 详情文本 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 列表页原始卡片快照，便于和详情页补抓结果对照。
- `asin` ASIN (type=string, stability=platform): Amazon 商品唯一标识，适合用于跨列表和详情关联。
- `originalSourceUrl` 原始链接 (type=url, stability=platform): 保留跳转前或带追踪参数的原始页面链接。
- `detailFetchStatus` 详情补抓状态 (type=string, stability=platform): search 场景补抓详情页时的执行状态，如 success / blocked / failed。
- `detailFetchError` 详情补抓异常 (type=string, stability=platform): 详情页补抓失败时的错误摘要。
- `detailRisk` 详情风险对象 (type=object, stability=platform): 命中登录、验证码或风控时返回的风险对象。
- `detailData` 详情原始对象 (type=object, stability=platform): 详情页保真结果，search 场景会在补抓成功后挂载在这里。
- `detailRecordKey` 详情记录标识 (type=string, stability=platform): 详情页层级的记录主键。
- `detailCapturedAt` 详情采集时间 (type=datetime, stability=platform): 详情页补抓完成时间。
- `brand` 品牌 (type=string, stability=platform): 从详情页同步回搜索记录的品牌字段。
- `sellerName` 卖家 (type=string, stability=platform): Amazon 卖家或 merchant 名称。
- `availabilityText` 库存文本 (type=string, stability=platform): 详情页可售状态、库存状态等文本。
- `deliveryText` 配送文本 (type=string, stability=platform): 配送承诺、到货时间等原始文本。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 推荐先从搜索场景验证平台是否可用。
- 支持 keyword 与 keywords 两种入参，keywords 适合批量跑词。
- 搜索结果会保留原始卡片数据，同时新增详情页字段，方便比对列表信息与详情信息。
- 搜索场景较稳定，但批量翻页或高频请求时仍要保留 login/captcha 风险退出。

- 示例
- Amazon 搜索采集：按关键词抓取搜索结果卡片。

### 搜索联想词 (`amazon.search_suggestions`)

- 可执行：是
- 可用性：可用
- 验证状态：已验证
- 访问限制：无需登录 / 无明显验证码风险 / 低风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：缺少稳定图片字段
- 功能说明：根据输入关键词抓取 Amazon 搜索联想词，可作为热搜词和需求验证的轻量信号源。
- 可分析维度：商品标题 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做趋势热词、排序信号和多平台趋势对比

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。
- `marketplace` 站点 (component=select, type=string, required): 按 Amazon 站点获取对应语言和市场的联想词。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 联想词或补全建议的唯一键。
- `title` 联想词 (type=string, stability=core): 联想词、热搜词或补全建议文本。
- `keyword` 输入关键词 (type=string, stability=optional): 本次触发联想的输入关键词。
- `seedKeyword` 种子词 (type=string, stability=optional): 原始主关键词。
- `suggestionType` 建议类型 (type=string, stability=optional): 联想词类型、来源类型。
- `rank` 排序/序号 (type=number, stability=optional): 联想词排序。
- `sourceUrl` 来源链接 (type=url, stability=optional): 联想词来源页或搜索链接。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 记录采集时间。
- `sourceType` 来源类型 (type=string, stability=platform): 当前记录属于搜索联想信号。
- `signalType` 信号类型 (type=string, stability=platform): 信号子类型，当前为 search_suggestion。
- `marketplace` 站点代码 (type=string, stability=platform): Amazon 站点代码，例如 US / UK / DE / JP。
- `marketplaceLabel` 站点名称 (type=string, stability=platform): 站点的人类可读名称。
- `suggestionSource` 建议来源 (type=string, stability=platform): 来自 API 还是 UI 回退抓取。
- `strategyId` 策略 ID (type=string, stability=platform): Amazon 联想词接口返回的策略标识。
- `candidateSources` 候选来源 (type=string, stability=platform): 联想词候选来源标记。
- `refTag` 引用标签 (type=string, stability=platform): 联想词接口返回的 refTag 等来源上下文。
- `prior` 优先级 (type=number, stability=platform): 联想词优先级或排序权重。
- `uiSeen` 页面可见 (type=boolean, stability=platform): 该联想词是否也在 UI 下拉中被看到。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 优先通过公开联想接口获取结果，必要时再回退到页面搜索框补抓。
- 适合作为趋势词到商品采集之间的中间层信号。
- 联想词优先走公开接口，适合作为低风险的趋势信号源。

- 示例
- Amazon 搜索联想词采集

### 商品详情 (`amazon.product_detail`)

- 可执行：是
- 可用性：可用
- 验证状态：已验证
- 访问限制：建议登录 / 偶发验证码 / 中风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开商品详情页，尽量保真地提取标题、主图、描述等详情原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。
- `asin` ASIN (type=string, stability=platform): Amazon 商品唯一标识。
- `originalSourceUrl` 原始链接 (type=url, stability=platform): 详情页跳转前的原始链接，必要时保留追踪参数。
- `sellerName` 卖家 (type=string, stability=platform): 卖家或 merchant 名称。
- `merchantInfoText` 商家信息文本 (type=string, stability=platform): Amazon 商家说明、发货方说明等原始文本。
- `deliveryText` 配送文本 (type=string, stability=platform): 配送承诺、到货时间等原始文本。
- `pageTitle` 页面标题 (type=string, stability=platform): 浏览器页面 title，适合辅助判断页面是否跳流。
- `bulletPointsText` 卖点摘要文本 (type=text, stability=platform): bulletPoints 的拼接摘要，适合轻量分析和 AI 输入。
- `breadcrumbText` 类目路径文本 (type=string, stability=platform): breadcrumb 的拼接摘要。
- `specSummaryText` 规格摘要文本 (type=text, stability=platform): specPairs 的拼接摘要。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 如果跳国家站点，优先补详情页 URL 规范化和地区选择逻辑。
- 详情页通常可抓，但地区跳转、库存校验和登录提示仍可能打断执行。

- 示例
- Amazon 商品详情采集

### 店铺热门商品 (`amazon.shop_hot_products`)

- 可执行：是
- 可用性：可用
- 验证状态：已验证
- 访问限制：建议登录 / 偶发验证码 / 中风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开店铺热门商品页或榜单页，提取卡片原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 店铺热门商品场景更依赖目标页链接的稳定性。
- 榜单和店铺页对目标链接稳定性更敏感，仍建议保留异常页截图。

- 示例
- Amazon 店铺热门商品采集

## Google Trends (`google_trends`)

- 状态：可用
- 可执行：是
- 访问限制：无需登录 / 无明显验证码风险 / 低风控
- 平台说明：Google Trends 通过公开 RSS 趋势源采集热搜词，并保留新闻线索、趋势排名和预估热度，适合作为选品前置信号。
- 说明：当前优先走 RSS 数据源，减少页面脚本波动和接口 429 对稳定性的影响。
- 说明：更适合做需求趋势洞察，不直接替代商品详情采集。

### 趋势热词 (`google_trends.trend_keywords`)

- 可执行：是
- 可用性：可用
- 验证状态：已验证
- 访问限制：无需登录 / 无明显验证码风险 / 低风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：采集 Google Trends 当前地区热搜词，并保留预估流量、相关新闻和趋势链接。
- 可分析维度：商品标题 / 图片素材 / 详情文本 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做卖点抽取、规格归一化和 AI 摘要；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。
- `geo` 地区 (component=select, type=string, required): Google Trends 地区代码，不同地区会返回不同热词榜。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 趋势热词记录唯一键。
- `title` 趋势词 (type=string, stability=core): 热词、趋势词、榜单词。
- `sourceUrl` 来源链接 (type=url, stability=core): 趋势词详情页或来源页链接。
- `rank` 排序 (type=number, stability=optional): 趋势排序或榜单位置。
- `approxTraffic` 热度文本 (type=string, stability=optional): 近似流量、热度、趋势强度等文本。
- `signalType` 信号类型 (type=string, stability=optional): 趋势信号类型，例如 daily_search_trend。
- `geo` 地区 (type=string, stability=optional): 地区或市场标识。
- `pubDate` 发布时间 (type=datetime, stability=optional): 原始发布时间。
- `newsTitles[]` 关联新闻标题 (type=array, stability=optional): 趋势词关联的新闻标题列表。
- `newsSources[]` 关联新闻来源 (type=array, stability=optional): 趋势词关联的新闻来源列表。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 记录采集时间。
- `sourceType` 来源类型 (type=string, stability=platform): 当前记录属于趋势信号。
- `imageUrl` 趋势配图 (type=url, stability=platform): 趋势条目或相关新闻首图。
- `imageUrls[]` 趋势图片列表 (type=array, stability=platform): 趋势条目和相关新闻中提取到的图片列表。
- `pictureSource` 图片来源 (type=string, stability=platform): 趋势图片来源站点。
- `cardText` 卡片摘要文本 (type=text, stability=platform): 为轻量搜索和 AI 输入准备的短文本摘要。
- `descriptionText` 描述文本 (type=text, stability=platform): 趋势描述与相关新闻摘要拼接后的文本。
- `newsItems[]` 关联新闻对象 (type=array, stability=platform): 相关新闻对象列表，通常含标题、来源、链接、摘要、图片。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 结果以趋势词为主，适合给 AI 提供热度线索。
- 如果需要更细的平台商品验证，可将趋势词再投喂到 Amazon、1688 等平台继续采集。
- 趋势词场景不依赖登录态，适合优先用于多平台对比前的需求信号采集。

- 示例
- Google Trends 热搜词采集

## eBay (`ebay`)

- 状态：启发式可用
- 可执行：是
- 访问限制：无需登录 / 偶发验证码 / 中风控
- 平台说明：eBay 已接入独立平台模块，优先覆盖搜索、商品详情、店铺/卖家商品列表三类核心页面。
- 说明：搜索页和店铺页沿用列表抽取公共流程，详情页补充了 eBay Evo 页面常见语义选择器。
- 说明：当前以启发式可用为主，后续可以继续补更多卖家、物流、规格等字段。

### 关键词搜索 (`ebay.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：无需登录 / 偶发验证码 / 中风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：进入 eBay 搜索结果页，提取商品卡片标题、价格、卖家等原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。
- `itemId` eBay Item ID (type=string, stability=platform): eBay 商品唯一标识，适合做链接规范化和去重。
- `originalSourceUrl` 原始链接 (type=url, stability=platform): 保留规范化前的原始商品链接。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 列表记录会尽量规范化为 eBay item canonical URL，减少追踪参数污染。
- 搜索页主要风险来自高频翻页和地区化结果差异。

- 示例
- eBay 搜索采集

### 搜索联想词 (`ebay.search_suggestions`)

- 可执行：是
- 可用性：可用
- 验证状态：已验证
- 访问限制：无需登录 / 无明显验证码风险 / 低风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：缺少稳定图片字段
- 功能说明：根据输入关键词抓取 eBay 公开搜索联想词，可作为热搜词和需求验证的轻量信号源。
- 可分析维度：商品标题 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做趋势热词、排序信号和多平台趋势对比

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 联想词或补全建议的唯一键。
- `title` 联想词 (type=string, stability=core): 联想词、热搜词或补全建议文本。
- `keyword` 输入关键词 (type=string, stability=optional): 本次触发联想的输入关键词。
- `seedKeyword` 种子词 (type=string, stability=optional): 原始主关键词。
- `suggestionType` 建议类型 (type=string, stability=optional): 联想词类型、来源类型。
- `rank` 排序/序号 (type=number, stability=optional): 联想词排序。
- `sourceUrl` 来源链接 (type=url, stability=optional): 联想词来源页或搜索链接。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 记录采集时间。
- `sourceType` 来源类型 (type=string, stability=platform): 当前记录属于搜索联想信号。
- `signalType` 信号类型 (type=string, stability=platform): 信号子类型，当前为 search_suggestion。
- `marketplace` 站点代码 (type=string, stability=platform): 当前联想词所属站点代码。
- `marketplaceLabel` 站点名称 (type=string, stability=platform): 站点的人类可读名称。
- `suggestionSource` 建议来源 (type=string, stability=platform): 当前联想词来自 autosuggest API 还是 UI 下拉抓取。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 优先走 eBay autosuggest 公共接口，减少页面波动影响。
- 开启截图时会补抓首页搜索下拉，方便人工核验真实联想结果。
- 联想词走公开 autosuggest 接口，适合低风险探词。

- 示例
- eBay 搜索联想词采集

### 商品详情 (`ebay.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：无需登录 / 偶发验证码 / 中风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开 eBay 商品详情页，提取标题、价格、图集、卖家与描述相关原始信息。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。
- `itemId` eBay Item ID (type=string, stability=platform): eBay 商品唯一标识，适合做链接规范化和去重。
- `originalSourceUrl` 原始链接 (type=url, stability=platform): 保留规范化前的原始商品链接。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 当前详情抽取偏保真，后续适合继续扩充运输、退货、规格摘要等字段。
- 详情页通常可抓，但部分商品会有地区、年龄或卖家限制。

- 示例
- eBay 商品详情采集

### 店铺热门商品 (`ebay.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：无需登录 / 偶发验证码 / 中风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开 eBay 卖家或类目商品列表页，提取热门商品卡片原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。
- `itemId` eBay Item ID (type=string, stability=platform): eBay 商品唯一标识，适合做链接规范化和去重。
- `originalSourceUrl` 原始链接 (type=url, stability=platform): 保留规范化前的原始商品链接。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 适合先从固定卖家链接跑，后续再逐步补充不同列表形态的兼容性。
- 卖家商品页适合小批量验证，过快翻页时容易进入访问限制。

- 示例
- eBay 店铺热门商品采集

## Newegg (`newegg`)

- 状态：启发式可用
- 可执行：是
- 平台说明：Newegg 已接入独立平台模块，覆盖搜索、商品详情与列表页场景，适合承接公开可抓取的 3C/电子商品数据。
- 说明：搜索页结构稳定，已优先命中 `.item-cell`、`.item-title`、`.price-current` 等核心节点。
- 说明：详情页除了可见 DOM，还会补抓 JSON-LD、要点 bullet 和规格表，让明细信息更完整。

### 关键词搜索 (`newegg.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：进入 Newegg 搜索结果页，提取商品卡片标题、价格、促销、卖家与局部特征文本。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 搜索记录会尽量规范化为 `https://www.newegg.com/p/{itemId}`，减少推广参数干扰。

- 示例
- Newegg 搜索采集

### 商品详情 (`newegg.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开 Newegg 商品详情页，补充标题、价格、图集、卖家、规格和要点说明。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 详情页会尽量合并页面可见内容与 JSON-LD 结构化信息，便于后续比对商品卡片与详情差异。

- 示例
- Newegg 商品详情采集

### 店铺热门商品 (`newegg.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开 Newegg 任意商品列表页，提取热门商品卡片原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 卖家店铺、类目页、搜索页基本复用同一套卡片结构，后续只需要按目标 URL 持续回归即可。

- 示例
- Newegg 列表页采集

## Walmart (`walmart`)

- 状态：启发式可用
- 可执行：是
- 平台说明：Walmart 已接入独立平台模块，当前先覆盖搜索、商品详情和通用列表页，方便后续在真实浏览器上下文里继续回归验证。
- 说明：当前首版选择器主要基于公开页面结构与商品卡片语义属性，适合先在有真实浏览器环境和正常 Cookie 的上下文里试跑。
- 说明：Walmart 较容易触发机器人校验，运行期如果被拦截，会由通用风险检测流程返回 `skipped/failed` 结果。

### 关键词搜索 (`walmart.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：进入 Walmart 搜索结果页，提取商品卡片标题、价格、评分、卖家与基础卡片信息。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 搜索链接会尽量规范化为 `https://www.walmart.com/ip/{itemId}`，减少追踪参数和推广跳转影响。

- 示例
- Walmart 搜索采集

### 商品详情 (`walmart.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开 Walmart 商品详情页，抓取标题、价格、图集、卖家与页面正文摘要。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 详情页可用性更依赖真实浏览器环境；如遇机器人页，建议在实际运行环境里多回归几次。

- 示例
- Walmart 商品详情采集

### 店铺热门商品 (`walmart.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：打开 Walmart 任意商品列表页，提取热门商品卡片原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 店铺页与专题页仍需要结合真实目标链接继续验证，但可以先沿用统一列表卡片抽取逻辑。

- 示例
- Walmart 列表页采集

## AliExpress (`aliexpress`)

- 状态：部分可用
- 可执行：是
- 平台说明：AliExpress 搜索场景已有真实样本，详情页与店铺页仍以启发式选择器为主。
- 说明：适合作为跨境平台第二批稳定入口，优先对外开放搜索场景。

### 关键词搜索 (`aliexpress.search`)

- 可执行：是
- 可用性：可用
- 验证状态：已验证
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：进入 AliExpress 搜索结果页后抓取商品卡片。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 当前是 AliExpress 优先推荐场景。

- 示例
- AliExpress 搜索采集

### 商品详情 (`aliexpress.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：详情场景已接入，但仍需要结合真实页面持续回归。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 若页面频繁跳国家站点，可在平台目录内单独补地区逻辑。

- 示例
- AliExpress 商品详情采集

### 店铺热门商品 (`aliexpress.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：店铺热门商品页支持度依赖目标页结构稳定性。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 如店铺页结构差异大，建议针对单店页面单独补选择器。

- 示例
- AliExpress 店铺热门商品采集

## Temu (`temu`)

- 状态：启发式可用
- 可执行：是
- 访问限制：需要登录 / 偶发验证码 / 高风控
- 平台说明：Temu 平台已经接入独立模块，但页面风控和地区跳转较重，当前以启发式可用为主。
- 说明：建议先在少量关键词与固定目标页上验证，再扩大任务规模。

### 关键词搜索 (`temu.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：需要登录 / 偶发验证码 / 高风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：Temu 搜索页目前通过启发式方式抓取卡片数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 当前搜索页在真实环境里会直接跳到 login.html，命中后应立即结束而不是继续重试。

- 示例
- Temu 搜索采集

### 商品详情 (`temu.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：需要登录 / 偶发验证码 / 高风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：详情场景已接入，适合在固定商品页做持续回归。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 详情页建议在已登录会话下执行，未登录环境可能被登录层或地区跳转打断。

- 示例
- Temu 商品详情采集

### 店铺热门商品 (`temu.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：需要登录 / 偶发验证码 / 高风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：店铺热门商品场景以页面卡片列表为主。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 店铺/活动页同样受登录态影响，批量翻页时容易进一步触发风控。

- 示例
- Temu 店铺热门商品采集

## TikTok Shop (`tiktok_shop`)

- 状态：启发式可用
- 可执行：是
- 平台说明：TikTok Shop 页面波动较大，当前采用独立平台目录持续维护搜索、详情和店铺场景。
- 说明：若命中登录、地区限制或验证码，需要快速返回风险结果。

### 关键词搜索 (`tiktok_shop.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：TikTok Shop 搜索场景以启发式选择器为主。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- TikTok Shop 搜索采集

### 商品详情 (`tiktok_shop.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：适合抓取详情页原始信息与截图回溯。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- TikTok Shop 商品详情采集

### 店铺热门商品 (`tiktok_shop.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：店铺热门商品场景适合小流量持续调试。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- TikTok Shop 店铺热门商品采集

## 抖音店铺 (`douyin_shop`)

- 状态：启发式可用
- 可执行：是
- 访问限制：需要登录 / 偶发验证码 / 高风控
- 平台说明：抖音店铺平台受登录态与风控影响较大，目前保留独立平台模块，方便持续调试与替换选择器。
- 说明：如果命中登录或验证码，要快速返回风险结果，不在页面长时间卡住。

### 关键词搜索 (`douyin_shop.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：需要登录 / 偶发验证码 / 高风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：抖音店铺搜索页以启发式方式提取商品卡片。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 当前搜索场景受登录态影响明显。
- 搜索场景最容易被登录流拦住，命中后不建议继续自动重试。

- 示例
- 抖音店铺搜索采集

### 商品详情 (`douyin_shop.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：需要登录 / 偶发验证码 / 高风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：适合在已登录、稳定环境下抓取商品详情页原始数据。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 命中风险时直接返回 skipped / failed，不进行无限重试。
- 详情页适合在稳定登录环境下执行，否则容易被登录或验证页中断。

- 示例
- 抖音商品详情采集

### 店铺热门商品 (`douyin_shop.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：需要登录 / 偶发验证码 / 高风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：适合从店铺页抓取热门商品卡片。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 店铺页结构可能随登录态变化，建议优先保留原始数据。
- 店铺页结构会随登录态变化，未登录环境下结果不稳定。

- 示例
- 抖音店铺热门商品采集

## 淘宝 (`taobao`)

- 状态：启发式可用
- 可执行：是
- 平台说明：淘宝页面结构调整频率较高，平台模块需要保持独立维护，便于后续继续修正选择器。
- 说明：如果页面进入登录流，直接返回风险类型，不把任务长时间挂起。

### 关键词搜索 (`taobao.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：淘宝搜索页当前采用多候选选择器策略。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- 淘宝搜索采集

### 商品详情 (`taobao.product_detail`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：详情页支持已接入，但需要结合真实页面持续验证。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- 淘宝商品详情采集

### 店铺热门商品 (`taobao.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 使用建议：适合直接进入稳定回归和业务联调
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：店铺热门商品场景适合先做小批量试跑。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- 淘宝店铺热门商品采集

## 京东 (`jd`)

- 状态：受限
- 可执行：否
- 访问限制：需要登录 / 当前会被验证码拦截 / 强风控阻断
- 平台说明：京东平台保留独立目录和选择器实现，但默认标记为受限，避免把验证码平台加入常规调度。
- 备注：京东前台页面当前高频触发验证码，不建议进入默认可执行平台。
- 说明：如后续要重新启用，可在本平台目录内继续调试选择器与风控绕过策略。

### 关键词搜索 (`jd.search`)

- 可执行：否
- 可用性：受限
- 验证状态：受限
- 访问限制：需要登录 / 当前会被验证码拦截 / 强风控阻断
- 备注：搜索页高频触发验证码。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：保留接口文档和参数定义，等待后续重新调试。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 搜索入口当前稳定识别为 login_required 或风险校验，默认不建议进入自动调度。

- 示例
- 京东搜索采集

### 商品详情 (`jd.product_detail`)

- 可执行：否
- 可用性：受限
- 验证状态：受限
- 访问限制：需要登录 / 当前会被验证码拦截 / 强风控阻断
- 备注：详情页访问过程容易命中验证码与风控。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：默认不执行，仅保留参数与调用示例。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 详情页当前同样属于高风险入口，更适合保留文档而不是继续自动化重试。

- 示例
- 京东商品详情采集

### 店铺热门商品 (`jd.shop_hot_products`)

- 可执行：否
- 可用性：受限
- 验证状态：受限
- 访问限制：需要登录 / 当前会被验证码拦截 / 强风控阻断
- 备注：店铺页同样容易触发风险验证。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：默认不执行，仅保留参数与调用示例。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 店铺页与列表页一样受风险策略影响，当前应视为不可自动执行。

- 示例
- 京东店铺热门商品采集

## SHEIN (`shein`)

- 状态：部分可用
- 可执行：是
- 访问限制：建议登录 / 高概率验证码 / 高风控
- 平台说明：SHEIN 当前更推荐详情场景，搜索与店铺页虽然已有实现，但更容易受验证码或风控影响。
- 说明：平台模块里已经保留了额外的记录归一化逻辑，方便后续持续修正价格与链接。

### 关键词搜索 (`shein.search`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：无需登录 / 当前会被验证码拦截 / 高风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：搜索场景可用，但要预期存在验证码风险。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 如果稳定性下降，可先只保留详情场景对外。
- 搜索页当前实测会跳到 risk/challenge，应尽快返回 captcha 风险结果。

- 示例
- SHEIN 搜索采集

### 商品详情 (`shein.product_detail`)

- 可执行：是
- 可用性：可用
- 验证状态：启发式
- 访问限制：建议登录 / 偶发验证码 / 中风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：详情页是当前优先推荐场景。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 详情页通常更容易拿到图片、规格与页面标题原始数据。
- 详情页比搜索更稳定，但仍建议保留风控截图与失败原因。

- 示例
- SHEIN 商品详情采集

### 店铺热门商品 (`shein.shop_hot_products`)

- 可执行：是
- 可用性：启发式可用
- 验证状态：启发式
- 访问限制：建议登录 / 高概率验证码 / 高风控
- 使用建议：建议小批量验证后使用，适合人工值守回归
- POD 图案分析：可用于 POD 图案分析输入
- 功能说明：店铺热门商品场景可用，但仍需要结合真实页面继续调试。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 风控/限制说明
- 如果页面结构变化，可优先修复卡片根节点与链接定位。
- 列表和店铺流场景更容易被验证码覆盖，优先保证风险退出而不是强行补交互。

- 示例
- SHEIN 店铺热门商品采集

## Ozon (`ozon`)

- 状态：未实现
- 可执行：否
- 平台说明：Ozon 已预留独立平台目录，后续可在当前目录单独补 DOM 规则、页面交互与风险处理。
- 备注：当前版本只保留平台占位与参数定义，尚未进入稳定调试。
- 说明：当前主要是把平台能力声明、参数示例和维护入口先整理好。

### 关键词搜索 (`ozon.search`)

- 可执行：否
- 可用性：未实现
- 验证状态：待验证
- 备注：尚未完成真实页面调试。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：预留 Ozon 搜索场景参数结构。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- Ozon 搜索采集

### 商品详情 (`ozon.product_detail`)

- 可执行：否
- 可用性：未实现
- 验证状态：待验证
- 备注：尚未完成真实页面调试。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：预留 Ozon 商品详情参数结构。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- Ozon 商品详情采集

### 店铺热门商品 (`ozon.shop_hot_products`)

- 可执行：否
- 可用性：未实现
- 验证状态：待验证
- 备注：尚未完成真实页面调试。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：预留 Ozon 店铺热门商品参数结构。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- Ozon 店铺热门商品采集

## Mercado Libre (`mercadolibre`)

- 状态：未实现
- 可执行：否
- 平台说明：Mercado Libre 已预留独立平台目录，后续可以在当前目录内继续补 selectors.js、平台 hook 和真实调试样本。
- 备注：当前版本仅完成平台能力占位与文档整理，尚未进入真实 DOM 调试阶段。
- 说明：当前先提供平台占位、参数结构与调用示例，便于后续逐步落地。

### 关键词搜索 (`mercadolibre.search`)

- 可执行：否
- 可用性：未实现
- 验证状态：待验证
- 备注：尚未完成真实页面调试。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：预留 Mercado Libre 搜索场景参数结构。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `keyword` 关键词 (component=input, type=string, required): 单个主关键词，便于快速试跑。
- `keywords` 关键词列表 (component=array-text, type=string[]): 多关键词批量执行时使用；会自动去重并去空。
- `maxPages` 最大页数 (component=input-number, type=integer): 搜索场景最多翻页数，建议小批量逐步验证。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- Mercado Libre 搜索采集

### 商品详情 (`mercadolibre.product_detail`)

- 可执行：否
- 可用性：未实现
- 验证状态：待验证
- 备注：尚未完成真实页面调试。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：预留 Mercado Libre 商品详情参数结构。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 品牌 / 详情文本
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做卖点抽取、规格归一化和 AI 摘要；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条详情记录的稳定主键。
- `title` 标题 (type=string, stability=core): 商品详情标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 详情页链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 详情页主图链接。
- `imageUrls[]` 图片列表 (type=array, stability=optional): 详情页图片列表。
- `priceText` 价格文本 (type=string, stability=optional): 详情页价格文本。
- `originalPriceText` 原价文本 (type=string, stability=optional): 原价、划线价等文本。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `brand` 品牌 (type=string, stability=optional): 品牌字段。
- `descriptionText` 描述文本 (type=text, stability=optional): 详情正文摘要或长描述。
- `bulletPoints[]` 卖点列表 (type=array, stability=optional): 卖点、要点、亮点等列表。
- `specPairs[]` 规格键值对 (type=array, stability=optional): 规格或参数列表。
- `breadcrumb` 面包屑 (type=string, stability=optional): 类目路径或面包屑。
- `availabilityText` 库存/可售文本 (type=string, stability=optional): 库存、是否可售等文本。
- `detailData` 详情原始对象 (type=object, stability=platform): 保留平台详情页抽取的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- Mercado Libre 商品详情采集

### 店铺热门商品 (`mercadolibre.shop_hot_products`)

- 可执行：否
- 可用性：未实现
- 验证状态：待验证
- 备注：尚未完成真实页面调试。
- 使用建议：当前不建议投入生产使用
- POD 图案分析：当前不建议
- 功能说明：预留 Mercado Libre 店铺热门商品参数结构。
- 可分析维度：商品标题 / 图片素材 / 价格带 / 店铺/卖家 / 评分/评论 / 趋势/关键词信号
- 推荐分析：适合商品初筛、价格带分层和跨平台价格对比；适合做店铺/品牌分布和头部卖家识别；适合做趋势热词、排序信号和多平台趋势对比；适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变；适合做主图理解、相似图聚类和图片素材提取

- 参数字段
- `targetUrl` 目标链接 (component=url, type=url, required): 填写商品详情页、店铺页或榜单页链接。
- `maxItems` 最大记录数 (component=input-number, type=integer): 单次任务最多保存的记录条数。
- `captureSnapshots` 执行截图 (component=switch, type=boolean): 是否在采集过程中保存执行截图；默认关闭，开启后会额外保存列表页、详情页或异常页截图。

- `records[]` 字段
- `recordKey` 记录标识 (type=string, stability=core): 单条记录的稳定主键，优先用于去重与追踪。
- `title` 标题 (type=string, stability=core): 商品标题或卡片主标题。
- `sourceUrl` 来源链接 (type=url, stability=core): 商品详情页、列表页或原始来源链接。
- `imageUrl` 主图链接 (type=url, stability=optional): 主图链接。
- `priceText` 价格文本 (type=string, stability=optional): 原始价格文本，保留平台原样格式。
- `shopName` 店铺/卖家 (type=string, stability=optional): 店铺名、卖家名或商家名。
- `badgeText` 标签文本 (type=string, stability=optional): 如销量、广告、热销、榜单等标签。
- `ratingText` 评分文本 (type=string, stability=optional): 评分或星级文本。
- `reviewCountText` 评论数文本 (type=string, stability=optional): 评论量、评价量等原始文本。
- `keyword` 触发关键词 (type=string, stability=optional): 本条记录所属的搜索关键词。
- `pageNo` 页码 (type=number, stability=optional): 该记录来自第几页。
- `capturedAt` 记录采集时间 (type=datetime, stability=optional): 该记录抓取时的时间。
- `listingData` 列表原始对象 (type=object, stability=platform): 保留平台列表页抽取时的原始结构，便于后续继续扩展。

- `collectData` 字段
- `packageType` 结果包类型 (type=string, stability=core): 固定为 run_result，用于标识这是一条按运行聚合的结果包。
- `taskId` 任务 ID (type=string, stability=core): 对应采集任务主键。
- `runId` 运行 ID (type=string, stability=core): 对应某次具体执行的运行主键。
- `platform` 平台标识 (type=string, stability=core): 平台唯一标识，例如 amazon / temu / google_trends。
- `taskType` 任务类型 (type=string, stability=core): 当前运行执行的 taskType。
- `status` 运行状态 (type=string, stability=core): success / failed / skipped 等运行结果状态。
- `message` 结果消息 (type=string, stability=core): 运行结果摘要信息。
- `capturedAt` 采集时间 (type=datetime, stability=core): 结果包最终采集时间。
- `summary` 摘要对象 (type=object, stability=optional): 聚合后的摘要对象，通常包含 message / recordsCount / snapshots 等字段。
- `records[]` 记录数组 (type=array, stability=core): 本次运行返回的明细记录列表，真正的业务数据在这一层展开。
- `snapshots[]` 快照数组 (type=array, stability=optional): 截图或快照引用列表。
- `debugMeta` 调试信息 (type=object, stability=platform): 调试辅助信息，不建议作为稳定业务字段依赖。

- 示例
- Mercado Libre 店铺热门商品采集
