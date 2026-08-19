import { act } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { LimitNameResourceType } from '@odh-dashboard/k8s-core';
import type { UseK8sNameDescriptionDataConfiguration } from '@odh-dashboard/k8s-core';
import { useK8sNameDescriptionFieldData } from '../K8sNameDescriptionField';

describe('useK8sNameDescriptionFieldData', () => {
  it('should re-validate routeNameTooLong when namespace changes asynchronously', () => {
    const shortConfig: UseK8sNameDescriptionDataConfiguration = {
      limitNameResourceType: LimitNameResourceType.WORKBENCH,
      namespace: 'short-ns',
      safePrefix: 'wb-',
    };
    const renderResult = testHook(useK8sNameDescriptionFieldData)(shortConfig);

    act(() => {
      // Auto-trimmed to maxLength 30: with short-ns, combined length stays under 63
      renderResult.result.current.onDataChange('name', 'this is a workbench with a long name');
    });
    expect(renderResult.result.current.data.k8sName.state.routeNameTooLong).toBe(false);
    expect(renderResult.result.current.data.k8sName.state.namespace).toBe('short-ns');

    const onDataChangeBefore = renderResult.result.current.onDataChange;
    const longNamespace = 'a-very-long-project-namespace-name';
    renderResult.rerender({
      ...shortConfig,
      namespace: longNamespace,
    });

    // useEffect resyncs validation without a keystroke
    expect(renderResult.result.current.data.k8sName.state.namespace).toBe(longNamespace);
    expect(renderResult.result.current.data.k8sName.state.routeNameTooLong).toBe(true);
    // onDataChange stays referentially stable across namespace changes
    expect(renderResult.result.current.onDataChange).toBe(onDataChangeBefore);
  });

  it('should not update data when namespace is unchanged', () => {
    const config: UseK8sNameDescriptionDataConfiguration = {
      limitNameResourceType: LimitNameResourceType.WORKBENCH,
      namespace: 'my-namespace',
      safePrefix: 'wb-',
    };
    const renderResult = testHook(useK8sNameDescriptionFieldData)(config);

    act(() => {
      renderResult.result.current.onDataChange('name', 'my workbench');
    });
    const dataBefore = renderResult.result.current.data;

    renderResult.rerender({ ...config });

    expect(renderResult.result.current.data).toBe(dataBefore);
  });
});
