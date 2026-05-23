import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuctionResultStatus,
  ContractStatus,
  DepositVoucherStatus,
  EnterpriseCertificationStatus,
  LotStatus,
  PrismaClient,
  RoleCode,
} from '@prisma/client';

import { AppModule } from '../../src/app.module';
import { AppExceptionFilter } from '../../src/common/errors/app-exception.filter';
import { AuctionClosingService } from '../../src/modules/auction-closing/auction-closing.service';
import { hashE2ePassword, loginAs } from './auth-test-helpers';

type ListResponse<T> = {
  items: T[];
};

type LotResponse = {
  id: string;
  statusCode: LotStatus;
};

type EnterpriseResponse = {
  id: string;
  statusCode: EnterpriseCertificationStatus;
};

type DepositResponse = {
  id: string;
  statusCode: DepositVoucherStatus;
};

type BidResponse = {
  id: string;
  currentHighestPrice: string;
  incrementCount: number;
};

type ResultResponse = {
  id: string;
  statusCode: AuctionResultStatus;
};

type ContractResponse = {
  id: string;
  statusCode: ContractStatus;
};

type DashboardResponse = {
  totalCompletedCount: number;
  totalCompletedAmount: string;
};

const prisma = new PrismaClient();
let adminHeaders: Record<string, string>;
let app: INestApplication;
let baseUrl: string;

describe('T14 main flow HTTP/DB acceptance', () => {
  beforeAll(async () => {
    await cleanup();
    await seedUsers();

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
    adminHeaders = await loginAs(baseUrl, 't14_e2e_admin');
  });

  afterAll(async () => {
    await app?.close();
    await cleanup();
    await prisma.$disconnect();
  });

  it('runs the publish certification deposit bid result contract dashboard path over HTTP', async () => {
    const lot = await createLot();
    await post<LotResponse>(`/api/admin/lots/${lot.id}/submit-review`, adminHeaders);
    const announced = await post<LotResponse>(`/api/admin/reviews/lots/${lot.id}/approve`, adminHeaders);
    expect(announced.statusCode).toBe(LotStatus.ANNOUNCING);

    const enterpriseARegistration = await registerEnterprise('A');
    const enterpriseBRegistration = await registerEnterprise('B');
    const enterpriseA = enterpriseARegistration.enterprise;
    const enterpriseB = enterpriseBRegistration.enterprise;
    await post<EnterpriseResponse>(`/api/admin/reviews/enterprises/${enterpriseA.id}/approve`, adminHeaders);
    await post<EnterpriseResponse>(`/api/admin/reviews/enterprises/${enterpriseB.id}/approve`, adminHeaders);

    const depositA = await submitDeposit(lot.id, enterpriseARegistration.headers, 'A');
    const depositB = await submitDeposit(lot.id, enterpriseBRegistration.headers, 'B');
    await post<DepositResponse>(`/api/admin/reviews/deposits/${depositA.id}/approve`, adminHeaders);
    await post<DepositResponse>(`/api/admin/reviews/deposits/${depositB.id}/approve`, adminHeaders);

    const biddingLot = await post<LotResponse>(`/api/admin/lots/${lot.id}/advance-to-bidding`, adminHeaders);
    expect(biddingLot.statusCode).toBe(LotStatus.BIDDING);

    await post('/api/lots/' + lot.id + '/bids', enterpriseARegistration.headers, { amount: '100' }, 400);
    const bidA = await post<BidResponse>(`/api/lots/${lot.id}/bids`, enterpriseARegistration.headers, { amount: '110' });
    expect(bidA.currentHighestPrice).toBe('110');
    expect(bidA.incrementCount).toBe(1);
    const bidB = await post<BidResponse>(`/api/lots/${lot.id}/bids`, enterpriseBRegistration.headers, { amount: '130' });
    expect(bidB.currentHighestPrice).toBe('130');
    expect(bidB.incrementCount).toBe(2);
    const finalBid = await post<BidResponse>(`/api/lots/${lot.id}/bids`, enterpriseARegistration.headers, { amount: '150' });
    expect(finalBid.currentHighestPrice).toBe('150');
    expect(finalBid.incrementCount).toBe(2);

    await prisma.lot.update({
      where: { id: lot.id },
      data: { biddingEndAt: new Date(Date.now() - 60_000) },
    });
    await app.get(AuctionClosingService).closeEndedAuctions();

    const results = await get<ListResponse<ResultResponse>>('/api/admin/results?pageSize=20', adminHeaders);
    const result = results.items.find((item) => item.statusCode === AuctionResultStatus.GENERATED);
    expect(result).toBeDefined();

    const published = await post<ResultResponse>(`/api/admin/results/${result?.id}/publish`, adminHeaders);
    expect(published.statusCode).toBe(AuctionResultStatus.PUBLISHED);

    const contracts = await get<ListResponse<ContractResponse>>('/api/admin/contracts?pageSize=20', adminHeaders);
    const contract = contracts.items.find((item) => item.statusCode === ContractStatus.PENDING_SIGN);
    expect(contract).toBeDefined();
    await post<ContractResponse>(`/api/admin/contracts/${contract?.id}/mark-signed`, adminHeaders);
    const completed = await post<ContractResponse>(`/api/admin/contracts/${contract?.id}/mark-completed`, adminHeaders);
    expect(completed.statusCode).toBe(ContractStatus.COMPLETED);

    const dashboard = await get<DashboardResponse>('/api/portal/dashboard');
    expect(dashboard.totalCompletedCount).toBeGreaterThanOrEqual(1);
    expect(Number(dashboard.totalCompletedAmount)).toBeGreaterThanOrEqual(150);
  });
});

async function createLot(): Promise<LotResponse> {
  return post<LotResponse>('/api/admin/lots', adminHeaders, {
    title: 'T14-E2E-华宁矿产竞拍主流程',
    imageOneUrl: 'https://files.example.com/t14-lot-a.jpg',
    imageTwoUrl: 'https://files.example.com/t14-lot-b.jpg',
    startPrice: '100',
    quantity: '100.000',
    quantityUnit: '吨',
    supplier: 'T14-E2E-供应商',
    origin: '云南华宁',
    deadlineAt: new Date(Date.now() + 86_400_000).toISOString(),
    deliveryMethod: '买方自提',
    productInfo: 'T14 E2E 商品信息',
    productDetail: 'T14 E2E 商品详情',
    inspectionReportUrl: 'https://files.example.com/t14-report.pdf',
    email: 'auction@example.com',
    phone: '0877-0000000',
    mineralCategory: '磷矿石',
    grade: 'P2O5 28%',
    assessedPrice: '120',
    depositRatio: '0.1000',
    depositAmount: '1000',
    bidIncrement: '10',
    announcementStartAt: new Date(Date.now() - 3_600_000).toISOString(),
    announcementEndAt: new Date(Date.now() - 1_800_000).toISOString(),
    biddingStartAt: new Date(Date.now() - 600_000).toISOString(),
    biddingEndAt: new Date(Date.now() + 3_600_000).toISOString(),
    customerNotice: 'T14 E2E 客户须知',
    extensionEnabled: false,
    extensionRule: '不启用延时竞价',
  });
}

async function registerEnterprise(
  suffix: string,
): Promise<{ enterprise: EnterpriseResponse; headers: Record<string, string> }> {
  const username = `t14_e2e_registered_${suffix.toLowerCase()}`;
  const enterprise = await post<EnterpriseResponse>('/api/enterprises/register', {}, {
    username,
    password: 'e2e-test-password',
    confirmPassword: 'e2e-test-password',
    name: `T14-E2E-验收企业${suffix}`,
    contactPerson: '张三',
    contactPhone: '13800000000',
    mainCategory: '矿产品贸易',
    legalRepresentative: '李四',
    legalRepresentativeIdNo: `53042419900101000${suffix}`,
    email: `enterprise-${suffix}@example.com`,
    userCategory: '企业',
    userType: '采购企业',
    registeredCapital: '10000000',
    region: '云南省玉溪市华宁县',
    address: `T14 E2E 地址 ${suffix}`,
    unifiedSocialCreditCode: `T14E2E${suffix}`,
    companyProfile: 'T14 E2E 企业简介',
    businessScope: '矿产品采购、销售与相关服务',
    paymentBankAccount: `621700000000000000${suffix}`,
    paymentAccountName: `T14-E2E-验收企业${suffix}`,
    paymentBankName: '中国银行华宁支行',
    paymentBankLineNo: '104731000001',
    paymentIsBankOfChina: true,
    receivingBankAccount: `621700000000000100${suffix}`,
    receivingAccountName: `T14-E2E-验收企业${suffix}`,
    receivingBankName: '中国银行华宁支行',
    receivingBankLineNo: '104731000001',
    receivingIsBankOfChina: true,
    agreementAccepted: true,
    qualificationFileUrl: 'https://files.example.com/qualification.pdf',
    businessLicenseFileUrl: 'https://files.example.com/license.pdf',
  });

  return {
    enterprise,
    headers: await loginAs(baseUrl, username),
  };
}

async function submitDeposit(
  lotId: string,
  headers: Record<string, string>,
  suffix: string,
): Promise<DepositResponse> {
  return post<DepositResponse>(`/api/lots/${lotId}/deposit-vouchers`, headers, {
    voucherFileName: `T14-E2E-意向金凭证-${suffix}.pdf`,
    voucherFileUrl: `https://files.example.com/t14-deposit-${suffix}.pdf`,
    paidAmount: '1000',
  });
}

async function seedUsers() {
  const passwordHash = await hashE2ePassword();
  const placeholderEnterpriseA = await createPlaceholderEnterprise('A');
  const placeholderEnterpriseB = await createPlaceholderEnterprise('B');
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
    where: { username: 't14_e2e_admin' },
    update: { roleId: adminRole.id, passwordHash },
    create: {
      username: 't14_e2e_admin',
      passwordHash,
      roleId: adminRole.id,
    },
  });
  const enterpriseA = await prisma.user.upsert({
    where: { username: 't14_e2e_enterprise_a' },
    update: {
      roleId: enterpriseRole.id,
      enterpriseId: placeholderEnterpriseA.id,
      passwordHash,
    },
    create: {
      username: 't14_e2e_enterprise_a',
      passwordHash,
      roleId: enterpriseRole.id,
      enterpriseId: placeholderEnterpriseA.id,
    },
  });
  const enterpriseB = await prisma.user.upsert({
    where: { username: 't14_e2e_enterprise_b' },
    update: {
      roleId: enterpriseRole.id,
      enterpriseId: placeholderEnterpriseB.id,
      passwordHash,
    },
    create: {
      username: 't14_e2e_enterprise_b',
      passwordHash,
      roleId: enterpriseRole.id,
      enterpriseId: placeholderEnterpriseB.id,
    },
  });

  return {
    adminId: admin.id,
    enterpriseAUserId: enterpriseA.id,
    enterpriseBUserId: enterpriseB.id,
  };
}

async function createPlaceholderEnterprise(suffix: string) {
  return prisma.enterprise.create({
    data: {
      name: `T14-E2E-登录占位企业${suffix}`,
      contactPerson: '张三',
      contactPhone: '13800000000',
      mainCategory: '矿产品贸易',
      legalRepresentative: '李四',
      legalRepresentativeIdNo: `53042419900101999${suffix}`,
      email: `placeholder-${suffix}@example.com`,
      userCategory: '企业',
      userType: '采购企业',
      registeredCapital: '10000000',
      region: '云南省玉溪市华宁县',
      address: `T14 E2E 登录占位地址 ${suffix}`,
      unifiedSocialCreditCode: `T14E2ELOGIN${suffix}`,
      companyProfile: 'T14 E2E 登录占位企业简介',
      businessScope: '矿产品采购、销售与相关服务',
      paymentBankAccount: `621700000000009900${suffix}`,
      paymentAccountName: `T14-E2E-登录占位企业${suffix}`,
      paymentBankName: '中国银行华宁支行',
      paymentBankLineNo: '104731000001',
      paymentIsBankOfChina: true,
      receivingBankAccount: `621700000000009910${suffix}`,
      receivingAccountName: `T14-E2E-登录占位企业${suffix}`,
      receivingBankName: '中国银行华宁支行',
      receivingBankLineNo: '104731000001',
      receivingIsBankOfChina: true,
      agreementAccepted: true,
      certificationStatus: EnterpriseCertificationStatus.APPROVED,
    },
  });
}

async function cleanup() {
  const lotIds = (await prisma.lot.findMany({
    where: { title: { startsWith: 'T14-E2E-' } },
    select: { id: true },
  })).map((lot) => lot.id);
  const enterpriseIds = (await prisma.enterprise.findMany({
    where: { name: { startsWith: 'T14-E2E-' } },
    select: { id: true },
  })).map((enterprise) => enterprise.id);

  await prisma.notification.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { receiverEnterpriseId: { in: enterpriseIds } }] } });
  await prisma.refund.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] } });
  await prisma.contract.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] } });
  await prisma.auctionResult.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { winningEnterpriseId: { in: enterpriseIds } }] } });
  await prisma.bidRecord.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] } });
  await prisma.depositVoucher.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] } });
  await prisma.user.updateMany({ where: { enterpriseId: { in: enterpriseIds } }, data: { enterpriseId: null } });
  await prisma.blacklist.deleteMany({ where: { enterpriseId: { in: enterpriseIds } } });
  await prisma.attachment.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { enterpriseId: { in: enterpriseIds } }] } });
  await prisma.lot.deleteMany({ where: { id: { in: lotIds } } });
  await prisma.enterprise.deleteMany({ where: { id: { in: enterpriseIds } } });
  await prisma.user.deleteMany({
    where: {
      username: {
        in: [
          't14_e2e_admin',
          't14_e2e_enterprise_a',
          't14_e2e_enterprise_b',
          't14_e2e_registered_a',
          't14_e2e_registered_b',
        ],
      },
    },
  });
}

async function get<T>(
  path: string,
  headers?: Record<string, string>,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers,
  });
  expect(response.status).toBe(200);
  return response.json() as Promise<T>;
}

async function post<T = unknown>(
  path: string,
  headers: Record<string, string>,
  body?: Record<string, unknown>,
  expectedStatus = 201,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  expect(response.status).toBe(expectedStatus);
  return response.json() as Promise<T>;
}
