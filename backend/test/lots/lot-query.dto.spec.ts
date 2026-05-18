import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LotQueryDto } from '../../src/modules/lots/dto/lot-query.dto';

describe('LotQueryDto', () => {
  it('accepts numeric page query params as strings', async () => {
    const dto = plainToInstance(LotQueryDto, {
      page: '1',
      pageSize: '100',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(100);
  });
});
