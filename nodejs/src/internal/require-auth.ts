import { SwiftPayConfigError } from '../errors.js';

/**
 * Builds a guard that throws SwiftPayConfigError when the SDK has no secret key
 * configured. The guard is reused by every secret-scoped module method as the
 * first line of its body, so misconfiguration surfaces synchronously in dev
 * rather than as a 401 round-trip in production.
 */
export function makeRequireSecretKey(getSecretKey: () => string | undefined): (op: string) => void {
  return (op: string) => {
    if (!getSecretKey()) {
      throw new SwiftPayConfigError(
        `secretKey is required for ${op} — pass { secretKey } when constructing SwiftPay`,
      );
    }
  };
}
