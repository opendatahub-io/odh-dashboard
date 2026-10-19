// Node 22 defines Symbol.dispose / Symbol.asyncDispose (as the registered `nodejs.*` symbols) on the
// main realm only, so they are missing inside Jest's per-test VM context. undici (used by
// @kubernetes/client-node >= 2.0) relies on Symbol.dispose, so mirror Node's values here.
if (typeof Symbol.dispose !== 'symbol') {
  Object.defineProperty(Symbol, 'dispose', { value: Symbol.for('nodejs.dispose') });
}
if (typeof Symbol.asyncDispose !== 'symbol') {
  Object.defineProperty(Symbol, 'asyncDispose', { value: Symbol.for('nodejs.asyncDispose') });
}
