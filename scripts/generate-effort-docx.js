const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = require("docx");

const outputPath = path.resolve(__dirname, "../docs/华宁矿产竞拍平台PC端一期开发人天拆解-排版优化版.docx");

const page = {
  width: 11906,
  height: 16838,
  margin: { top: 1200, right: 1100, bottom: 1200, left: 1100 },
};
const contentWidth = page.width - page.margin.left - page.margin.right;

const colors = {
  primary: "1F4E79",
  primaryLight: "D9EAF7",
  accent: "F4B183",
  lightAccent: "FFF2CC",
  border: "B7C9D6",
  text: "1F2933",
  muted: "5B6770",
  tableHead: "D9EAF7",
  total: "EAF3F8",
};

const border = { style: BorderStyle.SINGLE, size: 1, color: colors.border };
const borders = { top: border, bottom: border, left: border, right: border };

function run(text, options = {}) {
  return new TextRun({
    text,
    font: "Microsoft YaHei",
    size: options.size ?? 21,
    bold: options.bold,
    italics: options.italics,
    color: options.color ?? colors.text,
  });
}

function p(text, options = {}) {
  return new Paragraph({
    children: Array.isArray(text) ? text : [run(text, options.run)],
    alignment: options.alignment,
    spacing: { before: options.before ?? 0, after: options.after ?? 120, line: 320 },
    indent: options.indent,
    numbering: options.numbering,
    heading: options.heading,
    border: options.border,
    shading: options.shading,
  });
}

function heading(text, level) {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    children: [run(text, { bold: true, size: level === 1 ? 30 : 25, color: colors.primary })],
    spacing: { before: level === 1 ? 360 : 240, after: 140 },
  });
}

function cell(children, width, options = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: Array.isArray(children) ? children : [p(children, { after: 0, run: { bold: options.bold, color: options.color, size: options.size } })],
  });
}

function table(headers, rows, widths, options = {}) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((header, i) =>
      cell(
        [p(header, { after: 0, alignment: options.alignments?.[i], run: { bold: true, color: colors.primary, size: 20 } })],
        widths[i],
        { fill: colors.tableHead }
      )
    ),
  });

  const bodyRows = rows.map((row, rowIndex) => {
    const isTotal = options.totalRows?.includes(rowIndex);
    return new TableRow({
      children: row.map((value, i) =>
        cell(
          [p(String(value), { after: 0, alignment: options.alignments?.[i], run: { bold: isTotal, size: 19 } })],
          widths[i],
          { fill: isTotal ? colors.total : undefined }
        )
      ),
    });
  });

  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}

function bullet(text) {
  return p(text, {
    numbering: { reference: "bullets", level: 0 },
    after: 80,
  });
}

function numberItem(text) {
  return p(text, {
    numbering: { reference: "numbers", level: 0 },
    after: 80,
  });
}

function spacer(size = 120) {
  return new Paragraph({ children: [], spacing: { after: size } });
}

const moduleRows = [
  ["1", "需求确认与产品设计", "PRD 澄清、业务流程细化、状态规则确认、验收口径整理、评审修改", "12"],
  ["2", "原型与 UI 设计", "PC 前台门户、列表详情、竞价详情、企业入驻、个人中心、管理后台核心页面设计", "18"],
  ["3", "基础架构与通用能力", "项目初始化、前后端工程结构、登录注册、角色权限、文件上传、字典配置、操作日志基础能力", "22"],
  ["4", "首页门户与公开内容", "首页、数据看板、矿产资源卡片、即将拍卖公告、正在竞价入口、成交公示入口、信息资讯、公开说明页", "20"],
  ["5", "拍品与标的管理", "拍品新建/编辑/草稿、竞价规则配置、附件/检测报告、发布复核、发布驳回、公示、关闭/取消", "24"],
  ["6", "企业入驻与认证审核", "企业注册/入驻表单、资料附件、认证状态、驳回重提、后台认证复核、企业资料查看", "18"],
  ["7", "意向金凭证与资格审核", "保证金说明、付款凭证上传、意向金状态、后台凭证复核、驳回重传、竞价资格控制", "16"],
  ["8", "在线竞价核心流程", "竞价详情、报价校验、加价幅度/次数、服务器时间顺序、最高价刷新、出价记录、竞价结束自动确认中标", "28"],
  ["9", "成交、合同、退款与黑名单", "成交公示生成、成交通知/失败通知、合同状态登记、退款状态登记、违约处理、黑名单封禁/解除", "18"],
  ["10", "个人中心与站内消息", "企业认证状态、意向金状态、我的竞价记录、我的通知、站内消息列表与详情", "12"],
  ["11", "内容管理后台", "政策法规、交易公告、矿能动态、公开说明页内容维护、分类与发布管理", "10"],
  ["12", "测试与缺陷修复", "功能测试、流程测试、权限测试、竞价边界测试、浏览器兼容测试、缺陷修复回归", "22"],
  ["13", "部署上线与项目管理", "测试/生产部署支持、接口联调、上线检查、使用说明、项目例会、进度协调、验收支持", "20"],
  ["", "合计", "", "240"],
];

const roleRows = [
  ["产品经理", "需求澄清、流程设计、验收标准、评审与变更协调", "18"],
  ["UI/UX 设计师", "PC 端页面设计、组件规范、交互细节与设计走查", "18"],
  ["前端工程师", "前台门户、企业端、个人中心、管理后台页面与交互开发", "62"],
  ["后端工程师", "业务接口、权限、竞价逻辑、审核流、状态流转、消息与数据统计", "78"],
  ["测试工程师", "测试用例、功能测试、权限测试、竞价边界、回归测试", "32"],
  ["项目经理/交付", "排期协调、会议沟通、风险跟踪、上线与验收支持", "20"],
  ["运维/部署支持", "环境部署、配置、上线检查、基础监控与问题支持", "12"],
  ["合计", "", "240"],
];

const quoteRows = [
  ["基础交付口径", "240"],
  ["含 10% 风险缓冲口径", "264"],
];

const scheduleRows = [
  ["需求确认与原型/UI", "第 1 至 2 周", "需求确认稿、核心流程、页面原型、UI 设计"],
  ["核心开发", "第 3 至 8 周", "前台门户、企业端、后台管理、竞价主流程"],
  ["联调测试", "第 9 至 10 周", "联调完成、测试报告、缺陷修复"],
  ["上线验收", "第 11 至 12 周", "生产部署、使用说明、验收支持"],
];

const riskRows = [
  ["短信供应商和短信模板是否确定", "正式接入会增加联调与测试成本"],
  ["竞价实时性要求是否为秒级强实时", "强实时、高并发会增加架构和测试成本"],
  ["客户是否要求政务统一身份认证或 CA", "会增加第三方对接成本"],
  ["是否需要严格权限分级和多管理员审批流", "会增加后台权限和审核流复杂度"],
  ["部署环境是否由客户提供并配合开放权限", "环境不明确会增加部署与联调成本"],
  ["页面视觉是否要求完全仿照参考平台", "可能增加设计与前端精修成本"],
];

const children = [
  new Paragraph({
    children: [run("华宁矿产竞拍平台", { bold: true, size: 38, color: colors.primary })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 120 },
  }),
  new Paragraph({
    children: [run("PC 端一期开发人天拆解", { bold: true, size: 32, color: colors.primary })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 420 },
  }),
  new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [contentWidth / 4, contentWidth / 4, contentWidth / 4, contentWidth / 4],
    rows: [
      new TableRow({
        children: [
          cell("基础交付", contentWidth / 4, { fill: colors.primaryLight, bold: true, color: colors.primary }),
          cell("240 人天", contentWidth / 4, { bold: true, color: colors.primary }),
          cell("商务建议口径", contentWidth / 4, { fill: colors.lightAccent, bold: true, color: colors.primary }),
          cell("264 人天", contentWidth / 4, { bold: true, color: colors.primary }),
        ],
      }),
      new TableRow({
        children: [
          cell("建议周期", contentWidth / 4, { fill: colors.primaryLight, bold: true, color: colors.primary }),
          cell("10 至 12 周", contentWidth / 4, { bold: true }),
          cell("估算范围", contentWidth / 4, { fill: colors.primaryLight, bold: true, color: colors.primary }),
          cell("PC 端一期", contentWidth / 4, { bold: true }),
        ],
      }),
    ],
  }),
  spacer(260),
  p("文档用途", { heading: HeadingLevel.HEADING_1, run: { bold: true, size: 30, color: colors.primary } }),
  p("本文档基于《华宁矿产竞拍平台 PC 端一期 PRD》进行开发工作量拆解，用于商务确认项目费用。人天估算为一期 PC 端完整交付口径，包含需求确认、原型/UI、前后端开发、测试、项目管理、部署联调与上线支持。"),
  heading("1. 估算假设", 1),
  numberItem("一期仅建设 PC 端，包含前台门户、企业用户能力、个人中心、管理后台与竞价业务闭环。"),
  numberItem("不包含手机 H5、APP、线上支付、电子合同、在线退款、第三方供应商自行发布拍品、违约拍品二次竞拍。"),
  numberItem("意向金、保证金、合同签署、尾款支付、退款均按线下办理，系统只做凭证上传、状态记录与通知。"),
  numberItem("短信供应商暂未确定，本期仅预留短信接口和发送记录，正式供应商接入按实际接口另行评估。"),
  numberItem("数据看板按 PRD 指标建设，不包含复杂 BI、多维监管报表或大屏。"),
  numberItem("竞价刷新按常规实时刷新方案估算；如要求强实时 WebSocket、高并发压测、灾备或等保专项，需另行评估。"),
  numberItem("估算不包含客户侧材料整理、历史数据清洗导入、第三方系统深度对接和正式等保测评。"),
  heading("2. 功能模块人天拆解", 1),
  table(["序号", "模块", "主要工作内容", "估算人天"], moduleRows, [700, 2300, 5700, 1106], {
    alignments: [AlignmentType.CENTER, undefined, undefined, AlignmentType.CENTER],
    totalRows: [moduleRows.length - 1],
  }),
  heading("3. 岗位人天汇总", 1),
  table(["岗位", "工作内容", "估算人天"], roleRows, [1900, 6200, 1706], {
    alignments: [undefined, undefined, AlignmentType.CENTER],
    totalRows: [roleRows.length - 1],
  }),
  heading("4. 建议商务报价口径", 1),
  p("基础建设工作量建议按 240 人天核算。考虑到 PRD 中仍存在短信供应商、竞价实时性、客户最终页面细节、部署环境、安全要求等不确定项，建议商务在报价中预留 10% 风险缓冲，即 24 人天。"),
  table(["报价口径", "人天"], quoteRows, [contentWidth - 1700, 1700], {
    alignments: [undefined, AlignmentType.CENTER],
  }),
  p("如客户要求压缩预算，建议优先保留竞价主链路、企业认证、意向金审核、拍品管理、成交公示和基础后台；可将资讯内容管理、部分看板优化、短信正式对接、页面视觉精修作为后续优化项。", {
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: colors.accent } },
    indent: { left: 220 },
    shading: { fill: colors.lightAccent, type: ShadingType.CLEAR },
  }),
  heading("5. 建议实施周期", 1),
  p("在人员投入稳定、需求评审及时、客户反馈不阻塞的前提下，建议周期为 10 至 12 周。"),
  table(["阶段", "周期", "主要产出"], scheduleRows, [2600, 1800, contentWidth - 4400], {
    alignments: [undefined, AlignmentType.CENTER, undefined],
  }),
  heading("6. 不包含项", 1),
  numberItem("手机 H5、APP 或小程序。"),
  numberItem("线上支付、银行接口、保证金自动退款。"),
  numberItem("CA、电子签章、在线合同签署。"),
  numberItem("第三方统一身份认证、政务平台深度对接。"),
  numberItem("正式短信供应商接入与短信费用。"),
  numberItem("等保测评、渗透测试、安全整改专项。"),
  numberItem("历史数据迁移、数据清洗、复杂 BI 报表或监管大屏。"),
  numberItem("高并发专项压测、容灾双活、异地备份专项。"),
  numberItem("违约拍品二次竞拍流程。"),
  heading("7. 关键风险与确认项", 1),
  table(["风险/确认项", "对费用的影响"], riskRows, [4300, contentWidth - 4300], {}),
  heading("8. 结论", 1),
  p([
    run("本项目 PC 端一期按 PRD 完整范围估算，基础交付工作量为 ", { size: 22 }),
    run("240 人天", { bold: true, color: colors.primary, size: 24 }),
    run("；建议商务费用确认时按 ", { size: 22 }),
    run("264 人天", { bold: true, color: colors.primary, size: 24 }),
    run(" 预留风险缓冲。若客户预算或周期受限，建议以竞价业务闭环为优先级进行范围裁剪。", { size: 22 }),
  ]),
];

const doc = new Document({
  creator: "Codex",
  title: "华宁矿产竞拍平台 PC 端一期开发人天拆解",
  description: "用于商务确认费用的开发人天拆解文档",
  styles: {
    default: {
      document: {
        run: { font: "Microsoft YaHei", size: 21, color: colors.text },
        paragraph: { spacing: { line: 320 } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Microsoft YaHei", size: 30, bold: true, color: colors.primary },
        paragraph: { spacing: { before: 360, after: 140 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Microsoft YaHei", size: 25, bold: true, color: colors.primary },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 420, hanging: 260 } } },
          },
        ],
      },
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "·",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 420, hanging: 260 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: page.width, height: page.height },
          margin: page.margin,
        },
      },
      headers: {
        default: new Header({
          children: [
            p("华宁矿产竞拍平台 PC 端一期开发人天拆解", {
              alignment: AlignmentType.RIGHT,
              after: 80,
              run: { size: 18, color: colors.muted },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run("第 ", { size: 18, color: colors.muted }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: colors.muted }), run(" 页", { size: 18, color: colors.muted })],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(outputPath);
});
