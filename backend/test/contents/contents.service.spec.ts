import { ContentCategory, ContentStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { ContentsController } from '../../src/modules/contents/contents.controller';
import { ContentsModule } from '../../src/modules/contents/contents.module';
import { ContentsService } from '../../src/modules/contents/contents.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type ContentRecord = {
  id: string;
  title: string;
  category: ContentCategory;
  summary: string | null;
  body: string;
  status: ContentStatus;
  publishedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createContent(
  overrides: Partial<ContentRecord> = {},
): ContentRecord {
  const now = new Date('2026-05-17T08:00:00.000Z');

  return {
    id: 'content-1',
    title: '政策法规内容',
    category: ContentCategory.POLICY,
    summary: '摘要',
    body: '正文',
    status: ContentStatus.PUBLISHED,
    publishedAt: now,
    createdById: 'admin-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createPrismaMock(records: ContentRecord[]) {
  const store = [...records];

  return {
    content: {
      findMany: jest.fn(({ where, skip, take, orderBy }) => {
        let result = store.filter((item) => {
          if (where?.status && item.status !== where.status) {
            return false;
          }

          if (where?.category && item.category !== where.category) {
            return false;
          }

          if (where?.id && item.id !== where.id) {
            return false;
          }

          return true;
        });

        if (orderBy?.publishedAt === 'desc') {
          result = result.sort(
            (left, right) =>
              (right.publishedAt?.getTime() ?? 0) -
              (left.publishedAt?.getTime() ?? 0),
          );
        }

        return Promise.resolve(result.slice(skip, skip + take));
      }),
      count: jest.fn(({ where }) =>
        Promise.resolve(
          store.filter((item) => {
            if (where?.status && item.status !== where.status) {
              return false;
            }

            if (where?.category && item.category !== where.category) {
              return false;
            }

            return true;
          }).length,
        ),
      ),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(store.find((item) => item.id === where.id) ?? null),
      ),
      create: jest.fn(({ data }) => {
        const created = createContent({
          ...data,
          id: 'created-content',
          status: data.status ?? ContentStatus.DRAFT,
          publishedAt: null,
        });
        store.push(created);
        return Promise.resolve(created);
      }),
      update: jest.fn(({ where, data }) => {
        const index = store.findIndex((item) => item.id === where.id);
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
}

describe('ContentsService', () => {
  it('wires the contents module controllers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ContentsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock([]))
      .compile();

    expect(moduleRef.get(ContentsController)).toBeInstanceOf(
      ContentsController,
    );
  });

  it('lists only published contents for public readers', async () => {
    const prisma = createPrismaMock([
      createContent({ id: 'published', status: ContentStatus.PUBLISHED }),
      createContent({ id: 'draft', status: ContentStatus.DRAFT }),
      createContent({ id: 'unpublished', status: ContentStatus.UNPUBLISHED }),
    ]);
    const service = new ContentsService(prisma);

    const result = await service.listPublic({ page: 1, pageSize: 10 });

    expect(result.items.map((item) => item.id)).toEqual(['published']);
    expect(result.total).toBe(1);
  });

  it('does not return unpublished content details to public readers', async () => {
    const prisma = createPrismaMock([
      createContent({ id: 'draft', status: ContentStatus.DRAFT }),
    ]);
    const service = new ContentsService(prisma);

    await expect(service.getPublicDetail('draft')).rejects.toMatchObject({
      message: '内容不存在或未发布',
    });
  });

  it('publishes draft content with the publish timestamp', async () => {
    const prisma = createPrismaMock([
      createContent({
        id: 'draft',
        status: ContentStatus.DRAFT,
        publishedAt: null,
      }),
    ]);
    const service = new ContentsService(prisma);

    const result = await service.publish('draft');

    expect(result.status).toBe(ContentStatus.PUBLISHED);
    expect(result.publishedAt).toBeInstanceOf(Date);
    expect(prisma.content.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'draft' },
        data: expect.objectContaining({
          status: ContentStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('unpublishes published content so public readers cannot see it', async () => {
    const prisma = createPrismaMock([
      createContent({ id: 'published', status: ContentStatus.PUBLISHED }),
    ]);
    const service = new ContentsService(prisma);

    const result = await service.unpublish('published');

    expect(result.status).toBe(ContentStatus.UNPUBLISHED);
    await expect(service.getPublicDetail('published')).rejects.toMatchObject({
      message: '内容不存在或未发布',
    });
  });
});
