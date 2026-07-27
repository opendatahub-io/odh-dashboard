import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { columns } from '../columns';

describe('LLM accelerator config columns', () => {
  describe('Enabled column sort', () => {
    it('should have a sort comparator on the Enabled column', () => {
      const enabledColumn = columns.find((c) => c.field === 'enabled');
      expect(enabledColumn).toBeDefined();
      expect(typeof enabledColumn?.sortable).toBe('function');
    });

    it('should sort enabled before disabled', () => {
      const enabledColumn = columns.find((c) => c.field === 'enabled');
      expect(enabledColumn).toBeDefined();
      const sortFn = enabledColumn?.sortable as (
        a: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
        b: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
        key: string,
      ) => number;

      const enabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'enabled-config',
      });
      const disabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'disabled-config',
        disabled: true,
      });

      expect(sortFn(enabledConfig, disabledConfig, 'enabled')).toBeLessThan(0);
      expect(sortFn(disabledConfig, enabledConfig, 'enabled')).toBeGreaterThan(0);
      expect(sortFn(enabledConfig, enabledConfig, 'enabled')).toBe(0);
    });

    it('should treat unsupported-unaccepted configs as effectively disabled', () => {
      const enabledColumn = columns.find((c) => c.field === 'enabled');
      expect(enabledColumn).toBeDefined();
      const sortFn = enabledColumn?.sortable as (
        a: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
        b: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
        key: string,
      ) => number;

      const enabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'enabled-config',
      });
      const unsupportedConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'unsupported-config',
        unsupported: true,
      });

      expect(sortFn(enabledConfig, unsupportedConfig, 'enabled')).toBeLessThan(0);
      expect(sortFn(unsupportedConfig, enabledConfig, 'enabled')).toBeGreaterThan(0);
    });
  });

  describe('Name column sort', () => {
    it('should have a sort comparator on the Name column', () => {
      const nameColumn = columns.find((c) => c.field === 'name');
      expect(nameColumn).toBeDefined();
      expect(typeof nameColumn?.sortable).toBe('function');
    });
  });
});
