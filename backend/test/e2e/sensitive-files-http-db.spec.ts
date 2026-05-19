import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AttachmentCategory,
  EnterpriseCertificationStatus,
  LotStatus,
  PrismaClient,
  RoleCode,
} from '@prisma/client';

import { AppModule } from '../../src/app.module';
import { AppExceptionFilter } from '../../src/common/errors/app-exception.filter';
import { hashE2ePassword, loginAs } from './auth-test-helpers';

type FileResponse = {
  id: string;
  category: AttachmentCategory;
  fileUrl: string;
  isSensitive: boolean;
};

type ErrorResponse = {
  success: false;
  code: string;
  message: string;
};

const prisma = new PrismaClient();
let adminHeaders: Record<string, string>;
let ownerHeaders: Record<string, string>;
let strangerHeaders: Record<string, string>;
let ownerUserId: string;
let app: INestApplication;
let baseUrl: string;

describe('T18 sensitive file HTTP permission acceptance', () => {
  beforeAll(async () => {
    await cleanup();
    const users = await seedUsers();
    ownerUserId = users.ownerUserId;

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
    adminHeaders = await loginAs(baseUrl, 't18_e2e_admin');
    ownerHeaders = await loginAs(baseUrl, 't18_e2e_owner');
    strangerHeaders = await loginAs(baseUrl, 't18_e2e_stranger');
  });

  afterAll(async () => {
    await app?.close();
    await cleanup();
    await prisma.$disconnect();
  });

  it('rejects unauthorized enterprise access to certification, license, and deposit voucher attachments', async () => {
    const files = await seedSensitiveAttachments();

    for (const attachmentId of [
      files.qualificationAttachmentId,
      files.licenseAttachmentId,
      files.depositAttachmentId,
    ]) {
      const forbidden = await get<ErrorResponse>(
        `/api/files/${attachmentId}`,
        strangerHeaders,
        403,
      );
      expect(forbidden.code).toBe('FILE_FORBIDDEN');

      const ownerFile = await get<FileResponse>(
        `/api/files/${attachmentId}`,
        ownerHeaders,
      );
      expect(ownerFile.id).toBe(attachmentId);
      expect(ownerFile.isSensitive).toBe(true);

      const adminFile = await get<FileResponse>(
        `/api/files/${attachmentId}`,
        adminHeaders,
      );
      expect(adminFile.id).toBe(attachmentId);
    }
  });
});

async function seedSensitiveAttachments() {
  const ownerUser = await prisma.user.findUnique({
    where: { username: 't18_e2e_owner' },
    include: { enterprise: true },
  });
  const owner = ownerUser?.enterprise;
  if (!owner) {
    throw new Error('Expected seeded owner enterprise');
  }

  const lot = await prisma.lot.create({
    data: {
      title: 'T18-E2E-敏感附件拍品',
      imageOneUrl: 'https://files.example.com/t18-lot-a.jpg',
      imageTwoUrl: 'https://files.example.com/t18-lot-b.jpg',
      startPrice: '100',
      quantity: '100.000',
      quantityUnit: '吨',
      supplier: 'T18-E2E-供应商',
      origin: '云南华宁',
      deadlineAt: new Date(Date.now() + 86_400_000),
      deliveryMethod: '买方自提',
      productInfo: 'T18 商品信息',
      productDetail: 'T18 商品详情',
      inspectionReportUrl: 'https://files.example.com/t18-report.pdf',
      email: 'auction@example.com',
      mineralCategory: '磷矿石',
      grade: 'P2O5 28%',
      depositAmount: '1000',
      bidIncrement: '10',
      announcementStartAt: new Date(Date.now() - 3_600_000),
      announcementEndAt: new Date(Date.now() - 1_800_000),
      biddingStartAt: new Date(Date.now() - 600_000),
      biddingEndAt: new Date(Date.now() + 3_600_000),
      customerNotice: 'T18 客户须知',
      extensionEnabled: false,
      extensionRule: '不启用延时竞价',
      status: LotStatus.BIDDING,
    },
  });

  const qualification = await createAttachment(
    AttachmentCategory.ENTERPRISE_QUALIFICATION,
    'T18 企业资质.pdf',
    'https://files.example.com/t18-qualification.pdf',
    owner.id,
  );
  const license = await createAttachment(
    AttachmentCategory.BUSINESS_LICENSE,
    'T18 营业执照.pdf',
    'https://files.example.com/t18-license.pdf',
    owner.id,
  );
  const deposit = await createAttachment(
    AttachmentCategory.DEPOSIT_VOUCHER,
    'T18 意向金凭证.pdf',
    'https://files.example.com/t18-deposit.pdf',
    owner.id,
    lot.id,
  );

  return {
    qualificationAttachmentId: qualification.id,
    licenseAttachmentId: license.id,
    depositAttachmentId: deposit.id,
  };
}

async function createAttachment(
  category: AttachmentCategory,
  fileName: string,
  fileUrl: string,
  enterpriseId: string,
  lotId?: string,
) {
  return prisma.attachment.create({
    data: {
      category,
      fileName,
      fileUrl,
      isSensitive: true,
      enterpriseId,
      lotId,
      uploadedById: ownerUserId,
    },
  });
}

async function seedUsers() {
  const passwordHash = await hashE2ePassword();
  const ownerEnterprise = await createEnterprise(
    '附件权限企业',
    'OWNER',
    '张三',
    '13800000000',
  );
  const strangerEnterprise = await createEnterprise(
    '无权访问企业',
    'STRANGER',
    '王五',
    '13900000000',
  );
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
    where: { username: 't18_e2e_admin' },
    update: { roleId: adminRole.id, enterpriseId: null, passwordHash },
    create: {
      username: 't18_e2e_admin',
      passwordHash,
      roleId: adminRole.id,
    },
  });
  const owner = await prisma.user.upsert({
    where: { username: 't18_e2e_owner' },
    update: {
      roleId: enterpriseRole.id,
      enterpriseId: ownerEnterprise.id,
      passwordHash,
    },
    create: {
      username: 't18_e2e_owner',
      passwordHash,
      roleId: enterpriseRole.id,
      enterpriseId: ownerEnterprise.id,
    },
  });
  const stranger = await prisma.user.upsert({
    where: { username: 't18_e2e_stranger' },
    update: {
      roleId: enterpriseRole.id,
      enterpriseId: strangerEnterprise.id,
      passwordHash,
    },
    create: {
      username: 't18_e2e_stranger',
      passwordHash,
      roleId: enterpriseRole.id,
      enterpriseId: strangerEnterprise.id,
    },
  });

  return {
    adminId: admin.id,
    ownerUserId: owner.id,
    strangerUserId: stranger.id,
  };
}

async function createEnterprise(
  nameSuffix: string,
  codeSuffix: string,
  contactPerson: string,
  contactPhone: string,
) {
  return prisma.enterprise.create({
    data: {
      name: `T18-E2E-${nameSuffix}`,
      contactPerson,
      contactPhone,
      mainCategory: '矿产品贸易',
      legalRepresentative: '李四',
      legalRepresentativeIdNo: `53042419900101${codeSuffix}`,
      email: `t18-${codeSuffix.toLowerCase()}@example.com`,
      userCategory: '企业',
      userType: '采购企业',
      region: '云南省玉溪市华宁县',
      address: `T18 E2E ${nameSuffix}地址`,
      unifiedSocialCreditCode: `T18E2E${codeSuffix}`,
      companyProfile: `T18 ${nameSuffix}简介`,
      businessScope: '矿产品采购',
      paymentBankAccount: `621700000000000-${codeSuffix}`,
      paymentAccountName: `T18-E2E-${nameSuffix}`,
      paymentBankName: '中国银行华宁支行',
      paymentBankLineNo: '104731000001',
      paymentIsBankOfChina: true,
      receivingBankAccount: `621700000000100-${codeSuffix}`,
      receivingAccountName: `T18-E2E-${nameSuffix}`,
      receivingBankName: '中国银行华宁支行',
      receivingBankLineNo: '104731000001',
      receivingIsBankOfChina: true,
      agreementAccepted: true,
      certificationStatus: EnterpriseCertificationStatus.APPROVED,
    },
  });
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
        in: ['t18_e2e_admin', 't18_e2e_owner', 't18_e2e_stranger'],
      },
    },
  });
}

async function get<T>(
  path: string,
  headers: Record<string, string>,
  expectedStatus = 200,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  expect(response.status).toBe(expectedStatus);
  return response.json() as Promise<T>;
}
