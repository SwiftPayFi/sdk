import { describe, expect, it } from 'vitest';

import {
  SwiftPayAuthError,
  SwiftPayConfigError,
  SwiftPayError,
  SwiftPayNotFoundError,
  SwiftPayServerError,
  SwiftPayValidationError,
} from '../src/index.js';

describe('error hierarchy', () => {
  it('all subclasses inherit SwiftPayError', () => {
    expect(new SwiftPayConfigError('a')).toBeInstanceOf(SwiftPayError);
    expect(new SwiftPayValidationError('a')).toBeInstanceOf(SwiftPayError);
    expect(new SwiftPayAuthError('a')).toBeInstanceOf(SwiftPayError);
    expect(new SwiftPayNotFoundError('a')).toBeInstanceOf(SwiftPayError);
    expect(new SwiftPayServerError('a')).toBeInstanceOf(SwiftPayError);
  });

  it('preserves status, details, and traceId', () => {
    const e = new SwiftPayValidationError('Validation failed', {
      status: 400,
      details: { field: 'required' },
      traceId: 'abc-123',
    });
    expect(e.status).toBe(400);
    expect(e.details).toEqual({ field: 'required' });
    expect(e.traceId).toBe('abc-123');
  });

  it('each subclass has the correct name for switch-style discrimination', () => {
    expect(new SwiftPayConfigError('a').name).toBe('SwiftPayConfigError');
    expect(new SwiftPayValidationError('a').name).toBe('SwiftPayValidationError');
    expect(new SwiftPayAuthError('a').name).toBe('SwiftPayAuthError');
    expect(new SwiftPayNotFoundError('a').name).toBe('SwiftPayNotFoundError');
    expect(new SwiftPayServerError('a').name).toBe('SwiftPayServerError');
  });
});
