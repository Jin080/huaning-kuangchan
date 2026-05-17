import type {
  BidRecord,
  ContentRecord,
  ContractRecord,
  DepositRecord,
  Enterprise,
  Lot,
  NotificationRecord,
  RefundRecord,
  ResultRecord,
  Stat,
} from '../types';

export const stats: Stat[] = [
  { label: '本年成交量', value: '36 宗', helper: '合同已完成口径', tone: 'blue' },
  { label: '本年成交额', value: '8,426.50 万元', helper: '较上月 +12.4%', tone: 'orange' },
  { label: '累计成交量', value: '219 宗', helper: '平台累计完成', tone: 'green' },
  { label: '累计成交额', value: '42,918.80 万元', helper: '已完成合同汇总', tone: 'blue' },
];

export const lots: Lot[] = [
  {
    id: 'HN-2026-0517-01',
    title: '甘肃白银市平川区红会煤矿煤矸石一批',
    startPrice: '186.00 元/吨',
    currentPrice: '218.00 元/吨',
    quantity: '30,000 吨',
    category: '煤矸石 / 中热值',
    supplier: '华宁矿产运营有限公司',
    origin: '甘肃白银',
    deposit: '560,000 元',
    publicityPeriod: '2026-05-18 至 2026-05-24',
    auctionTime: '2026-05-25 10:00 至 11:00',
    countdown: '01:36:18',
    status: '竞拍中',
    updatedAt: '2026-05-17 14:30',
  },
  {
    id: 'HN-2026-0517-02',
    title: '新疆维吾尔自治区乌恰县乌拉根铅锌矿石',
    startPrice: '420.00 元/吨',
    currentPrice: '420.00 元/吨',
    quantity: '12,500 吨',
    category: '铅锌矿 / 低硫',
    supplier: '紫金矿业集团股份有限公司',
    origin: '新疆克州',
    deposit: '320,000 元',
    publicityPeriod: '2026-05-17 至 2026-05-22',
    auctionTime: '2026-05-23 09:30 至 10:30',
    countdown: '公示中',
    status: '公示中',
    updatedAt: '2026-05-17 11:05',
  },
  {
    id: 'HN-2026-0517-03',
    title: '内蒙古自治区赤峰市荣胡栏子金矿尾矿资源',
    startPrice: '92.00 元/吨',
    currentPrice: '116.00 元/吨',
    quantity: '48,000 吨',
    category: '尾矿 / 综合利用',
    supplier: '山东黄金矿业股份有限公司',
    origin: '内蒙古赤峰',
    deposit: '480,000 元',
    publicityPeriod: '2026-05-12 至 2026-05-16',
    auctionTime: '2026-05-17 15:00 至 16:00',
    countdown: '00:42:10',
    status: '竞拍中',
    updatedAt: '2026-05-17 13:22',
  },
  {
    id: 'HN-2026-0517-04',
    title: '云南玉溪华宁工业园区建筑用砂石料',
    startPrice: '68.00 元/吨',
    currentPrice: '68.00 元/吨',
    quantity: '55,000 吨',
    category: '砂石料 / 建筑用',
    supplier: '华宁国有资产运营有限公司',
    origin: '云南玉溪',
    deposit: '260,000 元',
    publicityPeriod: '2026-05-20 至 2026-05-26',
    auctionTime: '2026-05-27 14:00 至 15:00',
    countdown: '公示中',
    status: '公示中',
    updatedAt: '2026-05-17 10:40',
  },
];

export const enterprises: Enterprise[] = [
  {
    id: 'E001',
    name: '中核华原钛白股份有限公司',
    contact: '张建华',
    phone: '138****6201',
    category: '矿产品加工',
    type: '企业用户',
    creditCode: '9162************3F',
    status: '待审核',
    submittedAt: '2026-05-17 09:42',
  },
  {
    id: 'E002',
    name: '紫金矿业集团股份有限公司',
    contact: '林晓峰',
    phone: '136****8127',
    category: '矿产贸易',
    type: '企业用户',
    creditCode: '9135************8X',
    status: '审核通过',
    submittedAt: '2026-05-15 16:21',
  },
  {
    id: 'E003',
    name: '山东黄金矿业股份有限公司',
    contact: '陈明',
    phone: '139****7204',
    category: '冶炼加工',
    type: '企业用户',
    creditCode: '9137************2A',
    status: '审核驳回',
    submittedAt: '2026-05-14 13:18',
    rejectReason: '营业执照附件不清晰，请重新上传。',
  },
];

export const deposits: DepositRecord[] = [
  {
    id: 'D001',
    enterprise: '中核华原钛白股份有限公司',
    lotTitle: lots[0].title,
    amount: '560,000 元',
    voucher: '付款凭证-20260517.png',
    status: '待审核',
    submittedAt: '2026-05-17 10:26',
    reviewedAt: '-',
  },
  {
    id: 'D002',
    enterprise: '紫金矿业集团股份有限公司',
    lotTitle: lots[2].title,
    amount: '480,000 元',
    voucher: '银行回单-20260516.pdf',
    status: '审核通过',
    submittedAt: '2026-05-16 15:02',
    reviewedAt: '2026-05-16 17:20',
  },
  {
    id: 'D003',
    enterprise: '山东黄金矿业股份有限公司',
    lotTitle: lots[1].title,
    amount: '320,000 元',
    voucher: '凭证截图.jpg',
    status: '审核驳回',
    submittedAt: '2026-05-16 09:10',
    reviewedAt: '2026-05-16 11:44',
    rejectReason: '付款账户名称与认证企业名称不一致。',
  },
];

export const bids: BidRecord[] = [
  {
    id: 'B001',
    lotTitle: lots[0].title,
    enterprise: '紫金矿业集团股份有限公司',
    maskedEnterprise: '紫金矿业***有限公司',
    amount: '218.00 元/吨',
    incrementTimes: 4,
    bidTime: '2026-05-17 15:18:32',
    isHighest: true,
    auctionStatus: '竞拍中',
  },
  {
    id: 'B002',
    lotTitle: lots[0].title,
    enterprise: '中核华原钛白股份有限公司',
    maskedEnterprise: '中核华原***有限公司',
    amount: '210.00 元/吨',
    incrementTimes: 3,
    bidTime: '2026-05-17 15:12:08',
    isHighest: false,
    auctionStatus: '竞拍中',
  },
  {
    id: 'B003',
    lotTitle: lots[2].title,
    enterprise: '山东黄金矿业股份有限公司',
    maskedEnterprise: '山东黄金***有限公司',
    amount: '116.00 元/吨',
    incrementTimes: 6,
    bidTime: '2026-05-17 15:07:41',
    isHighest: true,
    auctionStatus: '竞拍中',
  },
];

export const results: ResultRecord[] = [
  {
    id: 'R001',
    lotTitle: '云南玉溪华宁县建筑石灰岩矿采剥废石',
    winner: '云南建投矿业有限公司',
    finalPrice: '3,286.00 万元',
    publicTime: '2026-05-14 10:00',
    status: '已公示',
  },
  {
    id: 'R002',
    lotTitle: '甘肃白银煤矸石综合利用资源包',
    winner: '甘肃恒源新材料有限公司',
    finalPrice: '1,126.40 万元',
    publicTime: '2026-05-11 09:30',
    status: '已生成',
  },
];

export const contracts: ContractRecord[] = [
  {
    id: 'C001',
    lotTitle: results[0].lotTitle,
    enterprise: results[0].winner,
    amount: results[0].finalPrice,
    status: '已签约',
    updatedAt: '2026-05-16 11:35',
    operator: 'Admin_01',
  },
  {
    id: 'C002',
    lotTitle: results[1].lotTitle,
    enterprise: results[1].winner,
    amount: results[1].finalPrice,
    status: '待签约',
    updatedAt: '2026-05-15 15:22',
    operator: 'Admin_02',
  },
];

export const refunds: RefundRecord[] = [
  {
    id: 'F001',
    lotTitle: results[0].lotTitle,
    enterprise: '紫金矿业集团股份有限公司',
    amount: '260,000 元',
    status: '审核中',
    updatedAt: '2026-05-16 15:08',
    operator: 'Admin_01',
  },
  {
    id: 'F002',
    lotTitle: results[0].lotTitle,
    enterprise: '山东黄金矿业股份有限公司',
    amount: '260,000 元',
    status: '已退款',
    updatedAt: '2026-05-16 16:42',
    operator: 'Admin_02',
  },
];

export const contents: ContentRecord[] = [
  {
    id: 'N001',
    title: '关于进一步规范矿产资源交易信息公开的通知',
    category: '政策法规',
    summary: '明确矿产资源交易公告、公示、成交结果公开要求。',
    status: '已发布',
    publishedAt: '2026-05-12 09:00',
    updatedBy: '内容管理员',
  },
  {
    id: 'N002',
    title: '华宁矿产竞拍平台竞拍规则说明',
    category: '交易公告',
    summary: '说明报名、保证金、出价、成交确认等交易规则。',
    status: '已发布',
    publishedAt: '2026-05-10 15:30',
    updatedBy: '内容管理员',
  },
  {
    id: 'N003',
    title: '云南玉溪矿能产业绿色利用动态',
    category: '矿能动态',
    summary: '聚焦矿产资源综合利用和产业协同发展。',
    status: '草稿',
    publishedAt: '-',
    updatedBy: '内容管理员',
  },
];

export const notifications: NotificationRecord[] = [
  {
    id: 'M001',
    type: '成交通知',
    channel: '短信',
    enterprise: '中核华原钛白股份有限公司',
    lotTitle: lots[0].title,
    content: `您参与的${lots[0].title}竞拍已结束，已中标，请办理签约与尾款手续。`,
    status: '发送成功',
    sentAt: '2026-05-17 14:30:22',
    read: false,
  },
  {
    id: 'M002',
    type: '失败通知',
    channel: '站内消息',
    enterprise: '紫金矿业集团股份有限公司',
    lotTitle: lots[2].title,
    content: `您参与的${lots[2].title}竞拍已结束，未中标，保证金将退回。`,
    status: '发送失败',
    sentAt: '2026-05-17 14:28:15',
    read: true,
  },
];

export const blacklist = [
  {
    id: 'BL001',
    enterprise: '某某矿产品贸易有限公司',
    contact: '王某',
    phone: '137****1190',
    status: '已拉黑',
    reason: '中标后未按约定完成线下签约，构成违约。',
    operator: 'Admin_01',
    operatedAt: '2026-05-12 10:20',
  },
];

export const files = [
  { id: 'FILE001', name: '检测报告-HN-2026-0517-01.pdf', type: '检测报告', source: '拍品管理', uploader: 'Admin_01', uploadedAt: '2026-05-17 10:00', ref: lots[0].title },
  { id: 'FILE002', name: '营业执照-紫金矿业.pdf', type: '营业执照', source: '企业认证', uploader: '企业用户', uploadedAt: '2026-05-15 16:20', ref: '紫金矿业集团股份有限公司' },
  { id: 'FILE003', name: '付款凭证-20260517.png', type: '付款凭证', source: '意向金审核', uploader: '企业用户', uploadedAt: '2026-05-17 10:26', ref: lots[0].title },
];

export const logs = [
  { id: 'LOG001', operator: 'Admin_01', action: '审核通过', objectType: '企业认证', objectName: '紫金矿业集团股份有限公司', result: '成功', operatedAt: '2026-05-16 17:20' },
  { id: 'LOG002', operator: 'Admin_02', action: '审核驳回', objectType: '意向金凭证', objectName: '山东黄金矿业股份有限公司', result: '成功', operatedAt: '2026-05-16 11:44' },
  { id: 'LOG003', operator: 'Admin_01', action: '标记已签约', objectType: '合同状态', objectName: results[0].lotTitle, result: '成功', operatedAt: '2026-05-16 11:35' },
];
