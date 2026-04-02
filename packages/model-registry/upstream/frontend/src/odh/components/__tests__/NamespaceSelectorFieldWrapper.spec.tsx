import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useResolvedExtensions: jest.fn(),
}));

jest.mock('~/odh/extension-points', () => ({
  isNamespaceSelectorExtension: (ext: { type: string }) =>
    ext.type === 'model-registry.namespace/selector',
}));

jest.mock('~/concepts/k8s/NamespaceSelectorField/NamespaceSelectorField', () => {
  function MockNamespaceSelectorField(props: { selectedNamespace: string }) {
    return <div data-testid="upstream-selector">{props.selectedNamespace}</div>;
  }
  return MockNamespaceSelectorField;
});

const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);

describe('NamespaceSelectorFieldWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the upstream NamespaceSelectorField when extensions are not loaded', () => {
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);
    render(
      <NamespaceSelectorFieldWrapper selectedNamespace="test-ns" onSelect={jest.fn()} />,
    );
    expect(screen.getByTestId('upstream-selector')).toHaveTextContent('test-ns');
  });

  it('should render the upstream NamespaceSelectorField when extensions are loaded but empty', () => {
    mockUseResolvedExtensions.mockReturnValue([[], true, []]);
    render(
      <NamespaceSelectorFieldWrapper selectedNamespace="test-ns" onSelect={jest.fn()} />,
    );
    expect(screen.getByTestId('upstream-selector')).toHaveTextContent('test-ns');
  });

  it('should render the custom extension component when one is available', () => {
    function CustomSelector(props: { selectedNamespace: string }) {
      return <div data-testid="custom-selector">{props.selectedNamespace}</div>;
    }

    mockUseResolvedExtensions.mockReturnValue([
      [
        {
          type: 'model-registry.namespace/selector',
          uid: 'test-ext',
          pluginName: 'test',
          properties: {
            component: { default: CustomSelector },
          },
          flags: {},
        } as never,
      ],
      true,
      [],
    ]);

    render(
      <NamespaceSelectorFieldWrapper selectedNamespace="custom-ns" onSelect={jest.fn()} />,
    );
    expect(screen.queryByTestId('upstream-selector')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-selector')).toHaveTextContent('custom-ns');
  });

  it('should pass all props through to the custom extension component', () => {
    const onSelect = jest.fn();
    const error = new Error('test error');

    function CustomSelector(props: {
      selectedNamespace: string;
      onSelect: (ns: string) => void;
      hasAccess?: boolean;
      isLoading?: boolean;
      error?: Error;
      cannotCheck?: boolean;
      registryName?: string;
    }) {
      return (
        <div data-testid="custom-selector">
          <span data-testid="has-access">{String(props.hasAccess)}</span>
          <span data-testid="is-loading">{String(props.isLoading)}</span>
          <span data-testid="error-msg">{props.error?.message}</span>
          <span data-testid="cannot-check">{String(props.cannotCheck)}</span>
          <span data-testid="registry-name">{props.registryName}</span>
        </div>
      );
    }

    mockUseResolvedExtensions.mockReturnValue([
      [
        {
          type: 'model-registry.namespace/selector',
          uid: 'test-ext',
          pluginName: 'test',
          properties: {
            component: { default: CustomSelector },
          },
          flags: {},
        } as never,
      ],
      true,
      [],
    ]);

    render(
      <NamespaceSelectorFieldWrapper
        selectedNamespace="my-ns"
        onSelect={onSelect}
        hasAccess={false}
        isLoading
        error={error}
        cannotCheck
        registryName="my-registry"
      />,
    );

    expect(screen.getByTestId('has-access')).toHaveTextContent('false');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('error-msg')).toHaveTextContent('test error');
    expect(screen.getByTestId('cannot-check')).toHaveTextContent('true');
    expect(screen.getByTestId('registry-name')).toHaveTextContent('my-registry');
  });
});
