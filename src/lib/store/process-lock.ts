/**
 * Process-local async mutex. Chains work so concurrent store updates
 * within one Node.js process cannot interleave read-modify-write cycles.
 * Does not coordinate across multiple processes or serverless instances.
 */
export function createProcessLock() {
  let tail: Promise<void> = Promise.resolve();

  return function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
