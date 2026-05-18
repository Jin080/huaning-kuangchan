import { LotStatus } from '@prisma/client';

import { LotReviewsService } from '../../src/modules/lot-reviews/lot-reviews.service';

type LotRecord = {
  id: string;
  title: string;
  status: LotStatus;
  releaseRejectReason: string | null;
  releaseSubmittedAt: Date | null;
  releaseReviewedAt: Date | null;
  startPrice: { toString: () => string };
  quantity: { toString: () => string };
  quantityUnit: string;
  supplier: string;
  origin: string;
  deadlineAt: Date;
  deliveryMethod: string;
  productInfo: string;
  productDetail: string;
  imageOneUrl: string;
  imageTwoUrl: string;
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
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function decimal(value: string) {
  return { toString: () => value };
}

function createLot(overrides: Partial<LotRecord> = {}): LotRecord {
  const now = new Date('2026-05-17T08:00:00.000Z');

  return {
    id: 'lot-1',
    title: '铜精矿竞拍',
    status: LotStatus.PENDING_RELEASE_REVIEW,
    releaseRejectReason: null,
    releaseSubmittedAt: now,
    releaseReviewedAt: null,
    startPrice: decimal('1200'),
    quantity: decimal('30.500'),
    quantityUnit: '吨',
    supplier: '华宁供应商',
    origin: '云南华宁',
    deadlineAt: now,
    deliveryMethod: '自提',
    productInfo: '铜精矿',
    productDetail: '铜精矿详情',
    imageOneUrl: 'https://files.example.com/lot-1-a.jpg',
    imageTwoUrl: 'https://files.example.com/lot-1-b.jpg',
    inspectionReportUrl: 'https://files.example.com/report.pdf',
    email: 'auction@example.com',
    phone: null,
    mineralCategory: '铜矿',
    grade: 'Cu 20%',
    assessedPrice: decimal('1500'),
    depositRatio: decimal('0.1000'),
    depositAmount: decimal('50000'),
    bidIncrement: decimal('100'),
    announcementStartAt: now,
    announcementEndAt: now,
    biddingStartAt: now,
    biddingEndAt: now,
    customerNotice: '客户须知',
    extensionEnabled: false,
    extensionRule: null,
    currentHighestPrice: null,
    createdById: 'admin-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createService(records: LotRecord[] = []) {
  const store = [...records];
  const prisma = {
    lot: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          store.filter((lot) =>
            where?.status ? lot.status === where.status : true,
          ),
        ),
      ),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(store.find((lot) => lot.id === where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const index = store.findIndex((lot) => lot.id === where.id);
        const updated = {
          ...store[index],
          ...data,
          updatedAt: new Date('2026-05-17T09:00:00.000Z'),
        };
        store[index] = updated;
        return Promise.resolve(updated);
      }),
    },
  };
  const logs = { record: jest.fn() };

  return {
    service: new LotReviewsService(prisma as never, logs as never),
    prisma,
    logs,
  };
}

describe('LotReviewsService', () => {
  it('lists only lots pending release review', async () => {
    const { service } = createService([
      createLot({ id: 'pending', status: LotStatus.PENDING_RELEASE_REVIEW }),
      createLot({ id: 'draft', status: LotStatus.DRAFT }),
    ]);

    const result = await service.listPending();

    expect(result.map((item: { id: string }) => item.id)).toEqual(['pending']);
  });

  it('approves a pending release review lot into announcing status', async () => {
    const { service, prisma } = createService([
      createLot({ id: 'lot-1', status: LotStatus.PENDING_RELEASE_REVIEW }),
    ]);

    const result = await service.approve('lot-1', 'reviewer-1');

    expect(result.statusCode).toBe(LotStatus.ANNOUNCING);
    expect(prisma.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lot-1' },
        data: expect.objectContaining({
          status: LotStatus.ANNOUNCING,
          releaseReviewedAt: expect.any(Date),
          releaseRejectReason: null,
        }),
      }),
    );
  });

  it('rejects a pending release review lot and records the reason', async () => {
    const { service, prisma } = createService([
      createLot({ id: 'lot-1', status: LotStatus.PENDING_RELEASE_REVIEW }),
    ]);

    const result = await service.reject(
      'lot-1',
      'reviewer-1',
      '竞拍时间配置不完整',
    );

    expect(result.statusCode).toBe(LotStatus.RELEASE_REJECTED);
    expect(result.releaseRejectReason).toBe('竞拍时间配置不完整');
    expect(prisma.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: LotStatus.RELEASE_REJECTED,
          releaseRejectReason: '竞拍时间配置不完整',
        }),
      }),
    );
  });
});
