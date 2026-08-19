import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { LoadedExtension, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import ProjectSelectorFieldWrapper from '~/odh/components/ProjectSelectorFieldWrapper';
import type { ProjectSelectorExtension, ProjectSelectorFieldProps } from '~/odh/extension-points';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useResolvedExtensions: jest.fn(),
}));

jest.mock('~/odh/extension-points', () => ({
  isProjectSelectorExtension: (ext: { type: string }) => ext.type === 'mlflow.project/selector',
}));

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelector', () => {
  const Stub: React.FC<{ isLoading?: boolean; namespace: string }> = ({ isLoading, namespace }) => (
    <div data-testid="fallback-project-selector" data-loading={String(!!isLoading)}>
      {namespace || 'none'}
    </div>
  );
  return Stub;
});

const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);

const HostSelector: React.FC<ProjectSelectorFieldProps> = ({ namespace }) => (
  <div data-testid="host-project-selector">{namespace || 'none'}</div>
);

const hostSelectorExtension: LoadedExtension<ResolvedExtension<ProjectSelectorExtension>> = {
  type: 'mlflow.project/selector',
  uid: 'host-project-selector',
  pluginName: 'test-plugin',
  properties: {
    component: { default: HostSelector },
  },
};

describe('ProjectSelectorFieldWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a loading fallback while extensions are resolving', () => {
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);

    render(
      <ProjectSelectorFieldWrapper namespace="" onSelection={jest.fn()} placeholder="Select" />,
    );

    expect(screen.getByTestId('fallback-project-selector')).toHaveAttribute('data-loading', 'true');
  });

  it('should render the host extension component when available', () => {
    mockUseResolvedExtensions.mockReturnValue([[hostSelectorExtension], true, []]);

    render(
      <ProjectSelectorFieldWrapper
        namespace="my-project"
        onSelection={jest.fn()}
        placeholder="Select"
      />,
    );

    expect(screen.getByTestId('host-project-selector')).toHaveTextContent('my-project');
    expect(screen.queryByTestId('fallback-project-selector')).not.toBeInTheDocument();
  });

  it('should fall back to ui-core ProjectSelector when no host extension exists', () => {
    mockUseResolvedExtensions.mockReturnValue([[], true, []]);

    render(
      <ProjectSelectorFieldWrapper
        namespace="standalone-ns"
        onSelection={jest.fn()}
        placeholder="Select"
      />,
    );

    expect(screen.getByTestId('fallback-project-selector')).toHaveTextContent('standalone-ns');
  });
});
