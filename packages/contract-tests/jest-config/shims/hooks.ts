// Shim for legacy hooks export to keep function identity names stable for deep-equality tests
// Re-export directly to avoid any import issues
export {
  renderHook,
  testHook,
  standardUseFetchState,
  standardUseFetchStateObject,
} from '../../../jest-config/src/hooks';
