import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: '平台管理员',
      description: '管理拍品、审核、成交、合同、退款、黑名单和内容。',
    },
  });

  const enterpriseRole = await prisma.role.upsert({
    where: { code: 'ENTERPRISE' },
    update: {},
    create: {
      code: 'ENTERPRISE',
      name: '企业用户',
      description: '提交认证、上传意向金凭证并参与竞价。',
    },
  });

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { roleId: adminRole.id },
    create: {
      username: 'admin',
      passwordHash: 'CHANGE_ME_HASH',
      roleId: adminRole.id,
    },
  });

  const enterprise = await prisma.enterprise.upsert({
    where: { unifiedSocialCreditCode: '91530424MAHN000001' },
    update: {},
    create: {
      name: '华宁示例矿业有限公司',
      contactPerson: '张三',
      contactPhone: '13800000000',
      mainCategory: '矿产品贸易',
      legalRepresentative: '李四',
      legalRepresentativeIdNo: '530424199001010000',
      email: 'enterprise@example.com',
      userCategory: '企业',
      userType: '采购企业',
      registeredCapital: '10000000.00',
      region: '云南省玉溪市华宁县',
      address: '华宁县示例工业园区 1 号',
      unifiedSocialCreditCode: '91530424MAHN000001',
      companyProfile: '示例企业，用于本地开发与联调。',
      businessScope: '矿产品采购、销售与相关服务。',
      paymentBankAccount: '6217000000000000001',
      paymentAccountName: '华宁示例矿业有限公司',
      paymentBankName: '中国银行华宁支行',
      paymentBankLineNo: '104731000001',
      paymentIsBankOfChina: true,
      receivingBankAccount: '6217000000000000002',
      receivingAccountName: '华宁示例矿业有限公司',
      receivingBankName: '中国银行华宁支行',
      receivingBankLineNo: '104731000001',
      receivingIsBankOfChina: true,
      agreementAccepted: true,
      certificationStatus: 'APPROVED',
      certificationSubmittedAt: new Date('2026-05-01T02:00:00.000Z'),
      certificationReviewedAt: new Date('2026-05-01T03:00:00.000Z'),
      certificationReviewerId: admin.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'enterprise_demo' },
    update: {
      roleId: enterpriseRole.id,
      enterpriseId: enterprise.id,
    },
    create: {
      username: 'enterprise_demo',
      passwordHash: 'CHANGE_ME_HASH',
      roleId: enterpriseRole.id,
      enterpriseId: enterprise.id,
    },
  });

  await prisma.lot.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      title: '华宁磷矿石竞价标的一',
      imageOneUrl: '/uploads/lots/phosphate-1-a.jpg',
      imageTwoUrl: '/uploads/lots/phosphate-1-b.jpg',
      startPrice: '280.00',
      quantity: '5000.000',
      quantityUnit: '吨',
      supplier: '华宁矿产供应有限公司',
      origin: '云南省玉溪市华宁县',
      deadlineAt: new Date('2026-06-10T09:00:00.000Z'),
      deliveryMethod: '买方自提',
      productInfo: '磷矿石，品位约 28%。',
      productDetail: '以现场交付和检测报告为准，竞买人需在公示期内完成资料确认。',
      inspectionReportUrl: '/uploads/reports/phosphate-1-report.pdf',
      email: 'auction@example.com',
      phone: '0877-0000000',
      mineralCategory: '磷矿石',
      grade: 'P2O5 28%',
      assessedPrice: '300.00',
      depositRatio: '0.1000',
      depositAmount: '140000.00',
      bidIncrement: '5.00',
      announcementStartAt: new Date('2026-05-20T01:00:00.000Z'),
      announcementEndAt: new Date('2026-05-27T01:00:00.000Z'),
      biddingStartAt: new Date('2026-05-28T01:00:00.000Z'),
      biddingEndAt: new Date('2026-05-28T09:00:00.000Z'),
      customerNotice: '竞买人须完成企业认证并通过意向金审核后方可报价。',
      extensionEnabled: false,
      extensionRule: null,
      status: 'ANNOUNCING',
      createdById: admin.id,
    },
  });

  const publicContents = [
    {
      title: '用户黑名单管理说明',
      category: 'BLACKLIST_RULES' as const,
      body: '中标企业违约或存在严重违规行为时，平台可按规则拉黑并限制其参与竞拍。',
    },
    {
      title: '信息发布审核机制',
      category: 'PUBLISH_REVIEW_RULES' as const,
      body: '拍品、公告和说明内容发布前需经过平台复核，确保信息准确完整。',
    },
    {
      title: '竞拍规则说明',
      category: 'AUCTION_RULES' as const,
      body: '竞拍以服务器接收报价时间为准，报价需满足当前最高价和加价幅度要求。',
    },
    {
      title: '保证金缴纳与退还说明',
      category: 'DEPOSIT_RULES' as const,
      body: '保证金线下缴纳并上传凭证，未中标企业保证金按线下流程退还。',
    },
  ];

  for (const content of publicContents) {
    await prisma.content.upsert({
      where: {
        title: content.title,
      },
      update: {
        body: content.body,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-05-17T02:00:00.000Z'),
        createdById: admin.id,
      },
      create: {
        ...content,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-05-17T02:00:00.000Z'),
        createdById: admin.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
