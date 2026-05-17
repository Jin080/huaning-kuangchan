const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
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

const outputPath = path.resolve(__dirname, "../docs/华宁矿产竞拍平台PC端一期开发人天拆解-100人天版.docx");

const page = {
  width: 11906,
  height: 16838,
  margin: { top: 1200, right: 1100, bottom: 1200, left: 1100 },
};
const contentWidth = page.width - page.margin.left - page.margin.right;

const colors = {
  primary: "1F4E79",
  primaryLight: "D9EAF7",
  border: "B7C9D6",
  text: "1F2933",
  muted: "5B6770",
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
    color: options.color ?? colors.text,
  });
}

function p(text, options = {}) {
  return new Paragraph({
    children: Array.isArray(text) ? text : [run(text, options.run)],
    alignment: options.alignment,
    spacing: { before: options.before ?? 0, after: options.after ?? 120, line: 320 },
    heading: options.heading,
  });
}

function heading(text) {
  return p(text, { heading: HeadingLevel.HEADING_1, run: { bold: true, size: 30, color: colors.primary }, before: 300, after: 140 });
}

function cell(children, width, options = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: Array.isArray(children)
      ? children
      : [p(String(children), { after: 0, alignment: options.alignment, run: { bold: options.bold, color: options.color, size: options.size } })],
  });
}

function table(headers, rows, widths, alignments = [], totalRowIndex = -1) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((header, i) =>
      cell([p(header, { after: 0, alignment: alignments[i], run: { bold: true, color: colors.primary, size: 20 } })], widths[i], {
        fill: colors.primaryLight,
      })
    ),
  });

  const bodyRows = rows.map((row, rowIndex) => {
    const isTotal = rowIndex === totalRowIndex;
    return new TableRow({
      children: row.map((value, i) =>
        cell([p(String(value), { after: 0, alignment: alignments[i], run: { bold: isTotal, size: 19 } })], widths[i], {
          fill: isTotal ? colors.total : undefined,
        })
      ),
    });
  });

  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}

function spacer(size = 160) {
  return new Paragraph({ children: [], spacing: { after: size } });
}

const moduleRows = [
  ["1", "需求确认与项目启动", "PRD 范围确认、开发排期、接口与页面清单确认、验收口径确认", "5"],
  ["2", "UI 与前端基础页面", "首页门户、列表页、详情页、登录/入驻入口、基础管理后台页面框架", "12"],
  ["3", "账号、权限与基础能力", "企业用户登录注册、管理员登录、角色权限、文件上传、基础操作日志", "10"],
  ["4", "拍品与公告管理", "拍品创建编辑、公告展示、附件/检测报告、发布复核、公示状态管理", "14"],
  ["5", "企业认证与意向金审核", "企业资料提交、认证审核、付款凭证上传、意向金复核、竞价资格控制", "14"],
  ["6", "竞价核心流程", "竞价详情、报价校验、当前最高价、出价记录、截止后最高价中标确认", "20"],
  ["7", "成交、合同、退款与黑名单", "成交公示、合同状态登记、退款状态登记、违约标记、黑名单管理", "9"],
  ["8", "个人中心与消息通知", "认证状态、意向金状态、我的竞价记录、站内成交通知和失败通知", "6"],
  ["9", "数据看板与内容维护", "成交量/成交额统计、资讯分类、公开说明页维护", "5"],
  ["10", "测试、部署与验收支持", "功能测试、流程联调、缺陷修复、部署上线、验收支持", "5"],
  ["", "合计", "", "100"],
];

const roleRows = [
  ["产品经理", "需求确认、范围控制、验收支持", "8"],
  ["UI/UX 设计师", "核心页面设计与设计走查", "8"],
  ["前端工程师", "前台门户、企业端、个人中心、管理后台页面开发", "28"],
  ["后端工程师", "业务接口、权限、审核、竞价、状态流转与统计", "36"],
  ["测试工程师", "测试用例、流程测试、缺陷回归", "12"],
  ["项目经理/部署支持", "进度协调、环境部署、上线与验收支持", "8"],
  ["合计", "", "100"],
];

const scheduleRows = [
  ["第 1 周", "需求确认、页面设计、项目初始化、基础权限"],
  ["第 2 周", "拍品管理、企业认证、意向金审核、前台列表详情"],
  ["第 3 周", "竞价核心流程、成交公示、合同退款、个人中心"],
  ["第 4 周", "数据看板、内容维护、联调测试、缺陷修复、上线验收"],
];

const children = [
  p("华宁矿产竞拍平台", { alignment: AlignmentType.CENTER, before: 600, after: 120, run: { bold: true, size: 38, color: colors.primary } }),
  p("PC 端一期开发人天拆解", { alignment: AlignmentType.CENTER, after: 420, run: { bold: true, size: 32, color: colors.primary } }),
  new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [contentWidth / 4, contentWidth / 4, contentWidth / 4, contentWidth / 4],
    rows: [
      new TableRow({
        children: [
          cell("本期开发人天", contentWidth / 4, { fill: colors.primaryLight, bold: true, color: colors.primary }),
          cell("100 人天", contentWidth / 4, { bold: true, color: colors.primary, alignment: AlignmentType.CENTER }),
          cell("开发周期", contentWidth / 4, { fill: colors.primaryLight, bold: true, color: colors.primary }),
          cell("约 1 个月", contentWidth / 4, { bold: true, color: colors.primary, alignment: AlignmentType.CENTER }),
        ],
      }),
    ],
  }),
  spacer(260),
  heading("1. 本期开发范围"),
  p("本期开发内容为华宁矿产竞拍平台 PC 端一期功能，覆盖前台门户、企业入驻认证、拍品公告、意向金审核、在线竞价、成交公示、个人中心、管理后台、数据看板与内容维护等功能。"),
  heading("2. 功能模块人天拆解"),
  table(["序号", "模块", "开发内容", "人天"], moduleRows, [700, 2300, 5700, 1106], [AlignmentType.CENTER, undefined, undefined, AlignmentType.CENTER], moduleRows.length - 1),
  heading("3. 岗位人天汇总"),
  table(["岗位", "工作内容", "人天"], roleRows, [1900, 6200, 1706], [undefined, undefined, AlignmentType.CENTER], roleRows.length - 1),
  heading("4. 开发周期安排"),
  table(["周期", "主要工作"], scheduleRows, [1900, contentWidth - 1900], [AlignmentType.CENTER, undefined]),
  heading("5. 结论"),
  p([
    run("本期开发周期按 ", { size: 22 }),
    run("约 1 个月", { bold: true, color: colors.primary, size: 24 }),
    run(" 估算，整体开发投入为 ", { size: 22 }),
    run("100 人天", { bold: true, color: colors.primary, size: 24 }),
    run("。", { size: 22 }),
  ]),
];

const doc = new Document({
  creator: "Codex",
  title: "华宁矿产竞拍平台 PC 端一期开发人天拆解",
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
        paragraph: { spacing: { before: 300, after: 140 }, outlineLevel: 0 },
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
          children: [p("华宁矿产竞拍平台 PC 端一期开发人天拆解", { alignment: AlignmentType.RIGHT, after: 80, run: { size: 18, color: colors.muted } })],
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
