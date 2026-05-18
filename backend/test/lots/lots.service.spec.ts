import { AttachmentCategory, LotStatus } from '@prisma/client';

import { LotsService } from '../../src/modules/lots/lots.service';

type LotRecord = {
  id: string;
  title: string;
  imageOneUrl: string;
  imageTwoUrl: string;
  startPrice: { toString: () => string };
  quantity: { toString: () => string };
  quantityUnit: string;
  supplier: string;
  origin: string;
  deadlineAt: Date;
  deliveryMethod: string;
  productInfo: string;
  productDetail: string;
  inspectionReportUrl: string;
  email: string;
  phone: string | null;
  mineralCategory: string | null;
  grade: string | null;
  assessedPrice: { toString: () => string } | null;
  depositRatio: { toString: () => string } | null;
  depositAmount: { toString: () => string };
  bidIncrement: { toString: () => string };
  announcementStartAt: Date;
  announcementEndAt: Date;
  biddingStartAt: Date;
  biddingEndAt: Date;
  customerNotice: string;
  extensionEnabled: boolean;
  extensionRule: string | null;
  currentHighestPrice: { toString: () => string } | null;
  status: LotStatus;
  releaseRejectReason: string | null;
  releaseSubmittedAt: Date | null;
  releaseReviewedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  attachments?: AttachmentRecord[];
};

type AttachmentRecord = {
  id: string;
  category: AttachmentCategory;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  isSensitive: boolean;
  lotId: string | null;
  enterpriseId: string | null;
  uploadedById: string | null;
  createdAt: Date;
};

function decimal(value: string) {
  return { toString: () => value };
}

function createLot(overrides: Partial<LotRecord> = {}): LotRecord {
  const now = new Date('2026-05-17T08:00:00.000Z');

  return {
    id: 'lot-1',
    title: '铜精矿竞拍',
    imageOneUrl: 'https://files.example.com/lot-1-a.jpg',
    imageTwoUrl: 'https://files.example.com/lot-1-b.jpg',
    startPrice: decimal('1200'),
    quantity: decimal('30.500'),
    quantityUnit: '吨',
    supplier: '华宁供应商',
    origin: '云南华宁',
    deadlineAt: new Date('2026-06-02T10:00:00.000Z'),
    deliveryMethod: '自提',
    productInfo: '铜精矿',
    productDetail: '铜精矿详情',
    inspectionReportUrl: 'https://files.example.com/report.pdf',
    email: 'auction@example.com',
    phone: null,
    mineralCategory: '铜矿',
    grade: 'Cu 20%',
    assessedPrice: decimal('1500'),
    depositRatio: decimal('0.1000'),
    depositAmount: decimal('50000'),
    bidIncrement: decimal('100'),
    announcementStartAt: new Date('2026-05-20T00:00:00.000Z'),
    announcementEndAt: new Date('2026-05-25T00:00:00.000Z'),
    biddingStartAt: new Date('2026-05-26T00:00:00.000Z'),
    biddingEndAt: new Date('2026-05-27T00:00:00.000Z'),
    customerNotice: '客户须知',
    extensionEnabled: true,
    extensionRule: '最后5分钟出价自动延时',
    currentHighestPrice: null,
    status: LotStatus.DRAFT,
    releaseRejectReason: null,
    releaseSubmittedAt: null,
    releaseReviewedAt: null,
    createdById: 'admin-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createAttachment(
  overrides: Partial<AttachmentRecord> = {},
): AttachmentRecord {
  return {
    id: 'attachment-1',
    category: AttachmentCategory.OTHER,
    fileName: '附件.pdf',
    fileUrl: 'https://files.example.com/attachment.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    isSensitive: false,
    lotId: 'lot-1',
    enterpriseId: null,
    uploadedById: 'admin-1',
    createdAt: new Date('2026-05-17T08:00:00.000Z'),
    ...overrides,
  };
}

function createService(records: LotRecord[] = []) {
  const store = [...records];
  const prisma = {
    lot: {
      findMany: jest.fn(({ where, skip = 0, take = store.length }) => {
        const result = store.filter((lot) => {
          if (where?.status?.notIn?.includes(lot.status)) {
            return false;
          }

          if (where?.status && typeof where.status === 'string') {
            return lot.status === where.status;
          }

          return true;
        });

        return Promise.resolve(result.slice(skip, skip + take));
      }),
      count: jest.fn(({ where }) =>
        Promise.resolve(
          store.filter((lot) => {
            if (where?.status?.notIn?.includes(lot.status)) {
              return false;
            }

            if (where?.status && typeof where.status === 'string') {
              return lot.status === where.status;
            }

            return true;
          }).length,
        ),
      ),
      findUnique: jest.fn(({ where, include }) => {
        const lot = store.find((item) => item.id === where.id) ?? null;
        if (!lot || !include?.attachments) {
          return Promise.resolve(lot);
        }

        return Promise.resolve({
          ...lot,
          attachments: lot.attachments ?? [],
        });
      }),
      create: jest.fn(({ data }) => {
        const created = createLot({
          ...data,
          id: 'created-lot',
          status: data.status ?? LotStatus.DRAFT,
          createdAt: new Date('2026-05-17T09:00:00.000Z'),
          updatedAt: new Date('2026-05-17T09:00:00.000Z'),
        });
        store.push(created);
        return Promise.resolve(created);
      }),
      update: jest.fn(({ where, data }) => {
        const index = store.findIndex((item) => item.id === where.id);
        const updated = {
          ...store[index],
          ...data,
          updatedAt: new Date('2026-05-17T10:00:00.000Z'),
        };
        store[index] = updated;
        return Promise.resolve(updated);
      }),
    },
  };
  const logs = { record: jest.fn() };

  return {
    service: new LotsService(prisma as never, logs as never),
    prisma,
    logs,
  };
}

const mutationDto = {
  title: '铜精矿竞拍',
  imageOneUrl: 'https://files.example.com/lot-1-a.jpg',
  imageTwoUrl: 'https://files.example.com/lot-1-b.jpg',
  startPrice: '1200',
  quantity: '30.5',
  supplier: '华宁供应商',
  origin: '云南华宁',
  deadlineAt: '2026-06-02T10:00:00.000Z',
  deliveryMethod: '自提',
  productInfo: '铜精矿',
  productDetail: '铜精矿详情',
  inspectionReportUrl: 'https://files.example.com/report.pdf',
  email: 'auction@example.com',
  depositAmount: '50000',
  bidIncrement: '100',
  announcementStartAt: '2026-05-20T00:00:00.000Z',
  announcementEndAt: '2026-05-25T00:00:00.000Z',
  biddingStartAt: '2026-05-26T00:00:00.000Z',
  biddingEndAt: '2026-05-27T00:00:00.000Z',
  customerNotice: '客户须知',
};

describe('LotsService', () => {
  it('creates a draft lot for admin management', async () => {
    const { service, prisma } = createService();

    const result = await service.createDraft(mutationDto, 'admin-1');

    expect(result.statusCode).toBe(LotStatus.DRAFT);
    expect(result.status).toBe('草稿');
    expect(prisma.lot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: mutationDto.title,
          status: LotStatus.DRAFT,
          createdById: 'admin-1',
        }),
      }),
    );
  });

  it('submits a draft lot for release review', async () => {
    const { service, prisma } = createService([
      createLot({ id: 'lot-1', status: LotStatus.DRAFT }),
    ]);

    const result = await service.submitReview('lot-1', 'admin-1');

    expect(result.statusCode).toBe(LotStatus.PENDING_RELEASE_REVIEW);
    expect(prisma.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lot-1' },
        data: expect.objectContaining({
          status: LotStatus.PENDING_RELEASE_REVIEW,
          releaseSubmittedAt: expect.any(Date),
          releaseRejectReason: null,
        }),
      }),
    );
  });

  it('advances an announcing lot into bidding status when auction has started', async () => {
    const { service, prisma } = createService([
      createLot({
        id: 'lot-1',
        status: LotStatus.ANNOUNCING,
        biddingStartAt: new Date('2026-05-17T09:00:00.000Z'),
        biddingEndAt: new Date('2026-05-17T11:00:00.000Z'),
      }),
    ]);

    const result = await service.advanceToBidding(
      'lot-1',
      'admin-1',
      new Date('2026-05-17T10:00:00.000Z'),
    );

    expect(result.statusCode).toBe(LotStatus.BIDDING);
    expect(prisma.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lot-1' },
        data: { status: LotStatus.BIDDING },
      }),
    );
  });

  it('filters draft review rejected defaulted and canceled lots from public list', async () => {
    const { service } = createService([
      createLot({ id: 'draft', status: LotStatus.DRAFT }),
      createLot({ id: 'pending', status: LotStatus.PENDING_RELEASE_REVIEW }),
      createLot({ id: 'rejected', status: LotStatus.RELEASE_REJECTED }),
      createLot({ id: 'defaulted', status: LotStatus.DEFAULTED }),
      createLot({ id: 'canceled', status: LotStatus.CANCELED }),
      createLot({ id: 'announcing', status: LotStatus.ANNOUNCING }),
      createLot({ id: 'bidding', status: LotStatus.BIDDING }),
    ]);

    const result = await service.listPublic({ page: 1, pageSize: 20 });

    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      'announcing',
      'bidding',
    ]);
  });

  it('returns public detail with notices rules deposit info attachments and reports', async () => {
    const { service } = createService([
      createLot({
        id: 'lot-1',
        status: LotStatus.ANNOUNCING,
        attachments: [
          createAttachment({ id: 'attachment-other' }),
          createAttachment({
            id: 'attachment-report',
            category: AttachmentCategory.INSPECTION_REPORT,
            fileName: '检测报告.pdf',
            fileUrl: 'https://files.example.com/report-attachment.pdf',
          }),
        ],
      }),
    ]);

    const result = await service.getPublicDetail('lot-1');

    expect(result.customerNotice).toBe('客户须知');
    expect(result.auctionRule.bidIncrement).toBe('100');
    expect(result.depositInstruction.depositAmount).toBe('50000');
    expect(
      result.attachments.map((item: { id: string }) => item.id),
    ).toEqual([
      'attachment-other',
      'attachment-report',
    ]);
    expect(result.inspectionReports).toEqual([
      expect.objectContaining({
        fileUrl: 'https://files.example.com/report.pdf',
      }),
      expect.objectContaining({
        fileUrl: 'https://files.example.com/report-attachment.pdf',
      }),
    ]);
  });
});
