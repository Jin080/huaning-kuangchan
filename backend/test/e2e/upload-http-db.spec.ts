import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AttachmentCategory, PrismaClient, RoleCode } from '@prisma/client';

import { AppModule } from '../../src/app.module';
import { AppExceptionFilter } from '../../src/common/errors/app-exception.filter';
import { hashE2ePassword, loginAs } from './auth-test-helpers';

type UploadResponse = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  category: AttachmentCategory;
  isSensitive: boolean;
};

type AdminFilesResponse = {
  items: Array<{ id: string; name: string; type: string }>;
  total: number;
  pageSize: number;
};

const prisma = new PrismaClient();
let adminHeaders: Record<string, string>;
let app: INestApplication;
let baseUrl: string;

describe('T32A real file upload HTTP acceptance', () => {
  beforeAll(async () => {
    await cleanup();
    await seedAdmin();

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
    adminHeaders = await loginAs(baseUrl, 't32a_e2e_admin');
  });

  afterAll(async () => {
    await app?.close();
    await cleanup();
    await prisma.$disconnect();
  });

  it('uploads a lot image and returns a file URL that can be fetched', async () => {
    const body = await upload(
      't32a-lot-image.png',
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]),
      'image/png',
      AttachmentCategory.LOT_IMAGE,
    );

    expect(body.fileName).toBe('t32a-lot-image.png');
    expect(body.mimeType).toBe('image/png');
    expect(body.fileSize).toBe(8);
    expect(body.category).toBe(AttachmentCategory.LOT_IMAGE);
    expect(body.isSensitive).toBe(false);
    expect(body.fileUrl).toMatch(new RegExp(`/api/files/content/${body.id}$`));

    const fileResponse = await fetch(`${baseUrl}${body.fileUrl}`, {
      headers: adminHeaders,
    });
    expect(fileResponse.status).toBe(200);
    expect(fileResponse.headers.get('content-type')).toContain('image/png');
  });

  it('uploads a sensitive inspection report and lists it in admin files', async () => {
    const body = await upload(
      't32a-report.pdf',
      Buffer.from('%PDF-1.4\n'),
      'application/pdf',
      AttachmentCategory.INSPECTION_REPORT,
    );

    expect(body.fileName).toBe('t32a-report.pdf');
    expect(body.mimeType).toBe('application/pdf');
    expect(body.category).toBe(AttachmentCategory.INSPECTION_REPORT);
    expect(body.isSensitive).toBe(true);

    await expectAdminFileListed(body.id, 't32a-report.pdf', '检测报告');
  });
});

async function upload(
  fileName: string,
  buffer: Buffer,
  mimeType: string,
  category: AttachmentCategory,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.set(
    'file',
    new Blob([buffer], { type: mimeType }),
    fileName,
  );
  formData.set('category', category);

  const response = await fetch(`${baseUrl}/api/files/upload`, {
    method: 'POST',
    headers: adminHeaders,
    body: formData,
  });
  expect(response.status).toBe(201);

  return response.json() as Promise<UploadResponse>;
}

async function seedAdmin() {
  const passwordHash = await hashE2ePassword();
  const adminRole = await prisma.role.upsert({
    where: { code: RoleCode.ADMIN },
    update: {},
    create: { code: RoleCode.ADMIN, name: '平台管理员' },
  });

  return prisma.user.upsert({
    where: { username: 't32a_e2e_admin' },
    update: { roleId: adminRole.id, enterpriseId: null, passwordHash },
    create: {
      username: 't32a_e2e_admin',
      passwordHash,
      roleId: adminRole.id,
    },
  });
}

async function expectAdminFileListed(
  id: string,
  name: string,
  type: string,
): Promise<void> {
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const listResponse = await fetch(
      `${baseUrl}/api/admin/files?page=${page}&pageSize=100`,
      { headers: adminHeaders },
    );
    expect(listResponse.status).toBe(200);
    const list = (await listResponse.json()) as AdminFilesResponse;

    if (
      list.items.some(
        (item) => item.id === id && item.name === name && item.type === type,
      )
    ) {
      return;
    }

    pageCount = Math.ceil(list.total / list.pageSize);
    page += 1;
  }

  throw new Error(`Expected admin files list to contain ${id}`);
}

async function cleanup() {
  await prisma.attachment.deleteMany({
    where: { fileName: { startsWith: 't32a-' } },
  });
  await prisma.user.deleteMany({
    where: { username: 't32a_e2e_admin' },
  });
}
