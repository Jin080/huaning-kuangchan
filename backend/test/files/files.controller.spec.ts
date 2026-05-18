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

    expect(controllerRoles).toEqual(['ADMIN', 'ENTERPRISE']);
    expect(listRoles).toEqual(['ADMIN']);
  });

  it('uses the shared auth and roles guards', async () => {
    const guards = Reflect.getMetadata('__guards__', FilesController);

    expect(guards).toEqual([AuthGuard, RolesGuard]);
  });
});
