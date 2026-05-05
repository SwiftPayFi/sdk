import type { Request, Response, NextFunction } from 'express';

import { handleX402Request } from './core.js';
import type { X402GuardConfig } from './types.js';

export type X402ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export function x402Express(config: X402GuardConfig): (target: string) => X402ExpressMiddleware {
  const { client } = config;

  return (target: string): X402ExpressMiddleware => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const paymentHeader = req.headers['x-payment'] as string | undefined;

      handleX402Request(client, target, paymentHeader)
        .then((outcome) => {
          if (!outcome.settled) {
            res.status(402).json(outcome.body);
            return;
          }

          res.setHeader('X-PAYMENT-RESPONSE', JSON.stringify(outcome.response));
          next();
        })
        .catch(next);
    };
  };
}
