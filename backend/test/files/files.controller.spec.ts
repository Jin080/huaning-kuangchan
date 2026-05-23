import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { AuthGuard } from '../../src/auth/auth.guard';
import { RolesGuard } from '../../src/auth/roles.guard';
import { FilesController } from '../../src/files/files.controller';
import { FilesModule } from '../../src/files/files.module';
import { FilesService } from '../../src/files/files.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('FilesController', () => {
  it('wires the files module controllers and admin list service', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FilesModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        attachment: {
          findMany: jest.fn(),
          count: jest.fn(),
        },
      })
      .compile();

    expect(moduleRef.get(FilesController)).toBeInstanceOf(FilesController);
    expect(moduleRef.get(FilesService)).toBeInstanceOf(FilesService);
  });

  it('exposes GET /api/admin/files to admins only', async () => {
    const controller = FilesController;
    const reflector = new Reflector();
    const controllerRoles = reflector.get<string[]>('roles', controller);
    const listRoles = reflector.get<string[]>(
      'roles',
      controller.prototype.listAdmin,
    );
    const uploadRoles = reflector.get<string[]>(
      'roles',
      controller.prototype.upload,
    );
    const registerUploadRoles = reflector.get<string[]>(
      'roles',
      controller.prototype.uploadRegisterMaterial,
    );
    const fileContentRoles = reflector.get<string[]>(
      'roles',
      controller.prototype.getFileContent,
    );
    const publicFileContentRoles = reflector.get<string[]>(
      'roles',
      controller.prototype.getPublicFileContent,
    );

    expect(controllerRoles).toBeUndefined();
    expect(listRoles).toEqual(['ADMIN']);
    expect(uploadRoles).toEqual(['ADMIN', 'ENTERPRISE']);
    expect(registerUploadRoles).toBeUndefined();
    expect(fileContentRoles).toEqual(['ADMIN', 'ENTERPRISE']);
    expect(publicFileContentRoles).toBeUndefined();
  });

  it('uses the shared auth and roles guards', async () => {
    const guards = Reflect.getMetadata('__guards__', FilesController);

    expect(guards).toBeUndefined();
    expect(Reflect.getMetadata('__guards__', FilesController.prototype.upload)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
    expect(
      Reflect.getMetadata(
        '__guards__',
        FilesController.prototype.uploadRegisterMaterial,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata('__guards__', FilesController.prototype.getFileContent),
    ).toEqual([AuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata(
        '__guards__',
        FilesController.prototype.getPublicFileContent,
      ),
    ).toBeUndefined();
  });
});
