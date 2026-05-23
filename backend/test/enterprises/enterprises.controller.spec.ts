import { Reflector } from '@nestjs/core';

import { AuthGuard } from '../../src/auth/auth.guard';
import { RolesGuard } from '../../src/auth/roles.guard';
import { EnterprisesController } from '../../src/modules/enterprises/enterprises.controller';

describe('EnterprisesController', () => {
  it('keeps public registration unauthenticated while protecting admin reviews', () => {
    const reflector = new Reflector();

    expect(Reflect.getMetadata('__guards__', EnterprisesController)).toBeUndefined();
    expect(
      Reflect.getMetadata('__guards__', EnterprisesController.prototype.register),
    ).toBeUndefined();
    expect(
      reflector.get<string[]>('roles', EnterprisesController.prototype.register),
    ).toBeUndefined();

    expect(
      Reflect.getMetadata('__guards__', EnterprisesController.prototype.listForReview),
    ).toEqual([AuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata('__guards__', EnterprisesController.prototype.approve),
    ).toEqual([AuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata('__guards__', EnterprisesController.prototype.reject),
    ).toEqual([AuthGuard, RolesGuard]);
    expect(
      reflector.get<string[]>('roles', EnterprisesController.prototype.listForReview),
    ).toEqual(['ADMIN']);
    expect(
      reflector.get<string[]>('roles', EnterprisesController.prototype.approve),
    ).toEqual(['ADMIN']);
    expect(
      reflector.get<string[]>('roles', EnterprisesController.prototype.reject),
    ).toEqual(['ADMIN']);
  });
});
