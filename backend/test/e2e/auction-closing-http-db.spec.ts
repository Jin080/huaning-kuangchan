import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuctionResultStatus,
  EnterpriseCertificationStatus,
  LotStatus,
  PrismaClient,
  RoleCode,
} from '@prisma/client';

import { AppModule } from '../../src/app.module';
import { AppExceptionFilter } from '../../src/common/errors/app-exception.filter';

type ClosingSummaryResponse = {
  checkedLots: number;
  closedLots: number;
  endedWithoutBids: number;
  skippedLots: number;
};

const prisma = new PrismaClient();
const adminHeaders = { 'x-user-id': '', 'x-user-role': 'ADMIN' };
const enterpriseHeaders = { 'x-user-id': '', 'x-user-role': 'ENTERPRISE' };
let app: INestApplication;
let baseUrl: string;

describe('T18 auction closing HTTP operations entry', () => {
  beforeAll(async () => {
    await cleanup();
    const users = await seedUsers();
    adminHeaders['x-user-id'] = users.adminId;
    enterpriseHeaders['x-user-id'] = users.enterpriseUserId;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AppExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app?.close();
    await cleanup();
    await prisma.$disconnect();
  });

  it('lets an admin trigger ended auction closing over HTTP', async () => {
    const lotId = await seedEndedBiddingLot();

    await post('/api/admin/auction-closing/run', enterpriseHeaders, 401);
    const summary = await post<ClosingSummaryResponse>(
      '/api/admin/auction-closing/run',
      adminHeaders,
    );

    expect(summary.checkedLots).toBeGreaterThanOrEqual(1);
    expect(summary.closedLots).toBeGreaterThanOrEqual(1);

    const result = await prisma.auctionResult.findUnique({
      where: { lotId },
    });
    expect(result?.status).toBe(AuctionResultStatus.GENERATED);

    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    expect(lot?.status).toBe(LotStatus.RESULT_ANNOUNCING);
  });
});

async function seedEndedBiddingLot(): Promise<string> {
  const enterprise = await prisma.enterprise.create({
    data: {
      name: 'T18-E2E-竞拍结束企业',
      contactPerson: '张三',
      contactPhone: '13800000000',
      mainCategory: '矿产品贸易',
      legalRepresentative: '李四',
      legalRepresentativeIdNo: '530424199001010003',
      email: 't18-closing@example.com',
      userCategory: '企业',
      userType: '采购企业',
      region: '云南省玉溪市华宁县',
      address: 'T18 E2E 竞拍结束地址',
      unifiedSocialCreditCode: 'T18E2ECLOSING',
      companyProfile: 'T18 竞拍结束企业简介',
      businessScope: '矿产品采购',
      paymentBankAccount: '6217000000000000003',
      paymentAccountName: 'T18-E2E-竞拍结束企业',
      paymentBankName: '中国银行华宁支行',
      paymentBankLineNo: '104731000001',
      paymentIsBankOfChina: true,
      receivingBankAccount: '6217000000000001003',
      receivingAccountName: 'T18-E2E-竞拍结束企业',
      receivingBankName: '中国银行华宁支行',
      receivingBankLineNo: '104731000001',
      receivingIsBankOfChina: true,
      agreementAccepted: true,
      certificationStatus: EnterpriseCertificationStatus.APPROVED,
    },
  });
  await prisma.user.update({
    where: { username: 't18_e2e_closing_enterprise' },
    data: { enterpriseId: enterprise.id },
  });

  const lot = await prisma.lot.create({
    data: {
      title: 'T18-E2E-竞拍结束处理拍品',
      imageOneUrl: 'https://files.example.com/t18-closing-a.jpg',
      imageTwoUrl: 'https://files.example.com/t18-closing-b.jpg',
      startPrice: '100',
      quantity: '100.000',
      quantityUnit: '吨',
      supplier: 'T18-E2E-供应商',
      origin: '云南华宁',
      deadlineAt: new Date(Date.now() - 86_400_000),
      deliveryMethod: '买方自提',
      productInfo: 'T18 竞拍结束商品信息',
      productDetail: 'T18 竞拍结束商品详情',
      inspectionReportUrl: 'https://files.example.com/t18-closing-report.pdf',
      email: 'auction@example.com',
      mineralCategory: '磷矿石',
      grade: 'P2O5 28%',
      depositAmount: '1000',
      bidIncrement: '10',
      announcementStartAt: new Date(Date.now() - 7_200_000),
      announcementEndAt: new Date(Date.now() - 3_600_000),
      biddingStartAt: new Date(Date.now() - 1_800_000),
      biddingEndAt: new Date(Date.now() - 60_000),
      customerNotice: 'T18 竞拍结束客户须知',
      extensionEnabled: false,
      extensionRule: '不启用延时竞价',
      currentHighestPrice: '120',
      status: LotStatus.BIDDING,
    },
  });
  await prisma.bidRecord.create({
    data: {
      lotId: lot.id,
      enterpriseId: enterprise.id,
      enterpriseName: enterprise.name,
      maskedEnterpriseName: 'T18***业',
      sequenceNo: 1,
      amount: '120',
      incrementCount: 2,
      bidAt: new Date(Date.now() - 120_000),
      isCurrentHighest: true,
    },
  });

  return lot.id;
}

async function seedUsers() {
  const adminRole = await prisma.role.upsert({
    where: { code: RoleCode.ADMIN },
    update: {},
    create: { code: RoleCode.ADMIN, name: '平台管理员' },
  });
  const enterpriseRole = await prisma.role.upsert({
    where: { code: RoleCode.ENTERPRISE },
    update: {},
    create: { code: RoleCode.ENTERPRISE, name: '企业用户' },
  });
  const admin = await prisma.user.upsert({
    where: { username: 't18_e2e_closing_admin' },
    update: { roleId: adminRole.id, enterpriseId: null },
    create: {
      username: 't18_e2e_closing_admin',
      passwordHash: 'test',
      roleId: adminRole.id,
    },
  });
  const enterprise = await prisma.user.upsert({
    where: { username: 't18_e2e_closing_enterprise' },
    update: { roleId: enterpriseRole.id, enterpriseId: null },
    create: {
      username: 't18_e2e_closing_enterprise',
      passwordHash: 'test',
      roleId: enterpriseRole.id,
    },
  });

  return {
    adminId: admin.id,
    enterpriseUserId: enterprise.id,
  };
}

async function cleanup() {
  const lotIds = (
    await prisma.lot.findMany({
      where: { title: { startsWith: 'T18-E2E-' } },
      select: { id: true },
    })
  ).map((lot) => lot.id);
  const enterpriseIds = (
    await prisma.enterprise.findMany({
      where: { name: { startsWith: 'T18-E2E-' } },
      select: { id: true },
    })
  ).map((enterprise) => enterprise.id);

  await prisma.notification.deleteMany({
    where: {
      OR: [{ lotId: { in: lotIds } }, { receiverEnterpriseId: { in: enterpriseIds } }],
    },
  });
  await prisma.refund.deleteMany({
    where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] },
  });
  await prisma.contract.deleteMany({
    where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] },
  });
  await prisma.auctionResult.deleteMany({
    where: {
      OR: [{ lotId: { in: lotIds } }, { winningEnterpriseId: { in: enterpriseIds } }],
    },
  });
  await prisma.bidRecord.deleteMany({
    where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] },
  });
  await prisma.depositVoucher.deleteMany({
    where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] },
  });
  await prisma.user.updateMany({
    where: { enterpriseId: { in: enterpriseIds } },
    data: { enterpriseId: null },
  });
  await prisma.blacklist.deleteMany({ where: { enterpriseId: { in: enterpriseIds } } });
  await prisma.attachment.deleteMany({
    where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] },
  });
  await prisma.lot.deleteMany({ where: { id: { in: lotIds } } });
  await prisma.enterprise.deleteMany({ where: { id: { in: enterpriseIds } } });
  await prisma.user.deleteMany({
    where: {
      username: {
        in: ['t18_e2e_closing_admin', 't18_e2e_closing_enterprise'],
      },
    },
  });
}

async function post<T = unknown>(
  path: string,
  headers: Record<string, string>,
  expectedStatus = 201,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
  });
  expect(response.status).toBe(expectedStatus);
  return response.json() as Promise<T>;
}
