import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Content, ContentStatus, Prisma } from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContentDto, UpdateContentDto } from './dto/content-mutation.dto';
import {
  AdminContentQueryDto,
  PublicContentQueryDto,
} from './dto/content-query.dto';

type ContentRepository = {
  findMany(args: Prisma.ContentFindManyArgs): Promise<Content[]>;
  count(args: Prisma.ContentCountArgs): Promise<number>;
  findUnique(args: Prisma.ContentFindUniqueArgs): Promise<Content | null>;
  create(args: Prisma.ContentCreateArgs): Promise<Content>;
  update(args: Prisma.ContentUpdateArgs): Promise<Content>;
};

type ContentPrisma = {
  content: ContentRepository;
};

@Injectable()
export class ContentsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: ContentPrisma,
  ) {}

  async listPublic(
    query: PublicContentQueryDto,
  ): Promise<ListResponse<Content>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = this.buildWhere(query, ContentStatus.PUBLISHED);
    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.content.count({ where }),
    ]);

    return createListResponse(items, total, page, pageSize);
  }

  async getPublicDetail(id: string): Promise<Content> {
    const content = await this.prisma.content.findUnique({ where: { id } });

    if (!content || content.status !== ContentStatus.PUBLISHED) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '内容不存在或未发布',
        HttpStatus.NOT_FOUND,
      );
    }

    return content;
  }

  async listAdmin(query: AdminContentQueryDto): Promise<ListResponse<Content>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = this.buildWhere(query, query.status);
    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.content.count({ where }),
    ]);

    return createListResponse(items, total, page, pageSize);
  }

  async create(dto: CreateContentDto, actorId?: string): Promise<Content> {
    const content = await this.prisma.content.create({
      data: {
        title: dto.title,
        category: dto.category,
        summary: dto.summary,
        body: dto.body,
        status: ContentStatus.DRAFT,
        createdById: actorId,
      },
    });

    return content;
  }

  async update(id: string, dto: UpdateContentDto): Promise<Content> {
    await this.ensureExists(id);

    const content = await this.prisma.content.update({
      where: { id },
      data: dto,
    });

    return content;
  }

  async publish(id: string): Promise<Content> {
    await this.ensureExists(id);

    const content = await this.prisma.content.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    return content;
  }

  async unpublish(id: string): Promise<Content> {
    await this.ensureExists(id);

    const content = await this.prisma.content.update({
      where: { id },
      data: {
        status: ContentStatus.UNPUBLISHED,
      },
    });

    return content;
  }

  private async ensureExists(id: string): Promise<void> {
    const content = await this.prisma.content.findUnique({ where: { id } });

    if (!content) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '内容不存在',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private buildWhere(
    query: PublicContentQueryDto,
    status?: ContentStatus,
  ): Prisma.ContentWhereInput {
    return {
      ...(status ? { status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword, mode: 'insensitive' } },
              { summary: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
