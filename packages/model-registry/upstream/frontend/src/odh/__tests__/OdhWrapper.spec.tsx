import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeploymentMode } from 'mod-arch-core';
import type { AIHubKind } from '@odh-dashboard/k8s-core';
import { AreaContext, type AreaContextState } from '@odh-dashboard/plugin-core/areas';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import OdhWrapper, { createOdhModularArchConfig } from '~/odh/OdhWrapper';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  ModularArchContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const createAreaContextState = (overrides: Partial<AreaContextState> = {}): AreaContextState => ({
  dscStatus: null,
  dsciStatus: null,
  aiHub: null,
  aiHubError: undefined,
  areasStatus: {},
  ...overrides,
});

const aiHub: AIHubKind = {
  apiVersion: 'components.platform.opendatahub.io/v1alpha1',
  kind: 'AIHub',
  metadata: { name: 'default-aihub' },
  spec: { instancesNamespace: 'model-registry-ns' },
};

const renderOdhWrapper = (areaContextState: AreaContextState) =>
  render(
    <AreaContext.Provider value={areaContextState}>
      <OdhWrapper>
        <div data-testid="wrapper-content">Wrapper content</div>
      </OdhWrapper>
    </AreaContext.Provider>,
  );

describe('OdhWrapper', () => {
  it('should create a modular architecture config with the AIHub instances namespace', () => {
    expect(createOdhModularArchConfig(aiHub)).toEqual({
      deploymentMode: DeploymentMode.Federated,
      URL_PREFIX,
      BFF_API_VERSION,
      mandatoryNamespace: 'model-registry-ns',
    });
  });

  it('should render its children when AIHub has loaded', () => {
    renderOdhWrapper(createAreaContextState());

    expect(screen.getByTestId('wrapper-content')).toBeInTheDocument();
  });

  it('should render the AIHub error instead of its children', () => {
    renderOdhWrapper(createAreaContextState({ aiHubError: new Error('Could not load AIHub') }));

    expect(screen.getByText('Error: Could not load AIHub')).toBeInTheDocument();
    expect(screen.queryByTestId('wrapper-content')).not.toBeInTheDocument();
  });
});
