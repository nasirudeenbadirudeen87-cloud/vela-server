import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function hostFor(response: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'GET', url: '/v1/example' }),
    }),
  } as never;
}

describe('HttpExceptionFilter', () => {
  it('preserves a stable application code and status in the envelope', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    new HttpExceptionFilter().catch(
      new BadRequestException({
        message: 'Bad payment XDR.',
        code: 'PAYMENT_XDR_INVALID',
      }),
      hostFor(response),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Bad payment XDR.',
        code: 'PAYMENT_XDR_INVALID',
        errors: [],
        path: '/v1/example',
      }),
    );
  });

  it('derives the documented fallback code from the HTTP status', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    new HttpExceptionFilter().catch(
      new NotFoundException('Missing resource.'),
      hostFor(response),
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Missing resource.',
        code: 'NOT_FOUND',
      }),
    );
  });
});
