import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AttachmentCategory, PrismaClient, RoleCode } from '@prisma/client';

import { AppModule } from '../../src/app.module';
import { AppExceptionFilter } from '../../src/common/errors/app-exception.filter';

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
};

const prisma = new PrismaClient();
const adminHeaders = { 'x-user-id': '', 'x-user-role': 'ADMIN' };
let app: INestApplication;
let baseUrl: string;

describe('T32A real file upload HTTP acceptance', () => {
  beforeAll(async () => {
    await cleanup();
    const admin = await seedAdmin();
    adminHeaders['x-user-id'] = admin.id;

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

    const listResponse = await fetch(`${baseUrl}/api/admin/files?pageSize=100`, {
      headers: adminHeaders,
    });
    expect(listResponse.status).toBe(200);
    const list = (await listResponse.json()) as AdminFilesResponse;

    expect(list.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: body.id,
          name: 't32a-report.pdf',
          type: '检测报告',
        }),
      ]),
    );
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
  const adminRole = await prisma.role.upsert({
    where: { code: RoleCode.ADMIN },
    update: {},
    create: { code: RoleCode.ADMIN, name: '平台管理员' },
  });

  return prisma.user.upsert({
    where: { username: 't32a_e2e_admin' },
    update: { roleId: adminRole.id, enterpriseId: null },
    create: {
      username: 't32a_e2e_admin',
      passwordHash: 'test',
      roleId: adminRole.id,
    },
  });
}

async function cleanup() {
  await prisma.attachment.deleteMany({
    where: { fileName: { startsWith: 't32a-' } },
  });
  await prisma.user.deleteMany({
    where: { username: 't32a_e2e_admin' },
  });
}
