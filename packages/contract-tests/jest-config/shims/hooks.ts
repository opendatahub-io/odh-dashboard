// Shim for legacy hooks export to keep function identity names stable for deep-equality tests
// Import directly from the source to avoid moduleNameMapper recursion
export {
  renderHook,
  testHook,
  standardUseFetchState,
  standardUseFetchStateObject,
} from '../../../jest-config/src/hooks';
