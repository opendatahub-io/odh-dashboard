import { act } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { TOOL_CALLING_VALIDATED_ARGS_VALUE } from '@odh-dashboard/internal/__mocks__/mockValidatedConfigurations';
import { useValidatedConfigurationsField } from '../useValidatedConfigurationsField';

describe('useValidatedConfigurationsField', () => {
  it('should initialize with empty selection by default', () => {
    const renderResult = testHook(useValidatedConfigurationsField)();

    expect(renderResult.result.current.selectedValidatedConfigurations).toEqual({});
    expect(
      renderResult.result.current.isOptionSelected('args', TOOL_CALLING_VALIDATED_ARGS_VALUE),
    ).toBe(false);
  });

  it('should initialize from provided selection state', () => {
    const renderResult = testHook(useValidatedConfigurationsField)({
      args: [TOOL_CALLING_VALIDATED_ARGS_VALUE],
    });

    expect(renderResult.result.current.selectedValidatedConfigurations).toEqual({
      args: [TOOL_CALLING_VALIDATED_ARGS_VALUE],
    });
    expect(
      renderResult.result.current.isOptionSelected('args', TOOL_CALLING_VALIDATED_ARGS_VALUE),
    ).toBe(true);
  });

  it('should toggle option selection on and off', () => {
    const renderResult = testHook(useValidatedConfigurationsField)();

    act(() => {
      renderResult.result.current.toggleOption('args', TOOL_CALLING_VALIDATED_ARGS_VALUE, true);
    });

    expect(renderResult.result.current.selectedValidatedConfigurations).toEqual({
      args: [TOOL_CALLING_VALIDATED_ARGS_VALUE],
    });

    act(() => {
      renderResult.result.current.toggleOption('args', TOOL_CALLING_VALIDATED_ARGS_VALUE, false);
    });

    expect(renderResult.result.current.selectedValidatedConfigurations).toEqual({
      args: [],
    });
  });
});
