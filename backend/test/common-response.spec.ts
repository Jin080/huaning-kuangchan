import {
  createListResponse,
  createOperationResponse,
} from '../src/common/responses/response.helpers';

describe('response helpers', () => {
  it('creates the contracted list response shape', () => {
    expect(createListResponse(['lot-a'], 1, 2, 10)).toEqual({
      items: ['lot-a'],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it('creates the contracted operation response shape', () => {
    expect(createOperationResponse('操作成功')).toEqual({
      success: true,
      message: '操作成功',
    });
  });
});
