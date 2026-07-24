import React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import type { HostApiServices, K8sWatchResult } from '../../types';
import { HostApiContext } from '../../HostApiContext';
import { useTemplates } from '../useTemplates';

const mockTemplate = { metadata: { name: 'test-template' } } as TemplateKind;

function createWrapper(
  useTemplatesFn: (ns?: string) => K8sWatchResult<TemplateKind[]>,
): React.FC<{ children: React.ReactNode }> {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      HostApiContext.Provider,
      { value: { useTemplates: useTemplatesFn } as unknown as HostApiServices },
      children,
    );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

describe('useTemplates', () => {
  it('should return templates from context', () => {
    const useTemplatesFn = jest.fn(
      () => [[mockTemplate], true, undefined] as K8sWatchResult<TemplateKind[]>,
    );
    const { result } = renderHook(() => useTemplates('test-ns'), {
      wrapper: createWrapper(useTemplatesFn),
    });

    expect(result.current).toEqual([[mockTemplate], true, undefined]);
    expect(useTemplatesFn).toHaveBeenCalledWith('test-ns');
  });

  it('should pass undefined namespace when not provided', () => {
    const useTemplatesFn = jest.fn(() => [[], false, undefined] as K8sWatchResult<TemplateKind[]>);
    const { result } = renderHook(() => useTemplates(), {
      wrapper: createWrapper(useTemplatesFn),
    });

    expect(result.current).toEqual([[], false, undefined]);
    expect(useTemplatesFn).toHaveBeenCalledWith(undefined);
  });

  it('should propagate errors from the context', () => {
    const error = new Error('failed to watch');
    const useTemplatesFn = jest.fn(() => [[], false, error] as K8sWatchResult<TemplateKind[]>);
    const { result } = renderHook(() => useTemplates('ns'), {
      wrapper: createWrapper(useTemplatesFn),
    });

    expect(result.current).toEqual([[], false, error]);
  });
});
