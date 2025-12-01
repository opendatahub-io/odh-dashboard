/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Overlay file copied into the starter repo where path aliases are configured.
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ModularArchConfig,
  DeploymentMode,
  useNamespaceSelector,
  useModularArchContext,
} from 'mod-arch-core';
import NavBar from '~/app/standalone/NavBar';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useNamespaceSelector: jest.fn(),
  useModularArchContext: jest.fn(),
}));

const mockUseNamespaceSelector = useNamespaceSelector as jest.MockedFunction<
  typeof useNamespaceSelector
>;
const mockUseModularArchContext = useModularArchContext as jest.MockedFunction<
  typeof useModularArchContext
>;

const createMockConfig = (
  mandatoryNamespace?: string,
  deploymentMode: DeploymentMode = DeploymentMode.Standalone,
): ModularArchConfig => ({
  deploymentMode,
  URL_PREFIX: 'test',
  BFF_API_VERSION: 'v1',
  ...(mandatoryNamespace && { mandatoryNamespace }),
});

describe('NavBar mandatory namespace functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // @ts-expect-error – fetch might be undefined in node
    delete global.fetch;
  });

  it('should disable namespace selection when mandatory namespace is set', async () => {
    const mandatoryNamespace = 'mandatory-namespace';
    const config = createMockConfig(mandatoryNamespace);

    mockUseModularArchContext.mockReturnValue({
      config,
    } as ReturnType<typeof useModularArchContext>);

    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [{ name: mandatoryNamespace }],
      preferredNamespace: { name: mandatoryNamespace },
      updatePreferredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      initializationError: undefined,
    } as ReturnType<typeof useNamespaceSelector>);

    render(<NavBar onLogout={jest.fn()} />);

    const namespaceButton = await screen.findByText(mandatoryNamespace);
    expect(namespaceButton).toBeInTheDocument();

    const menuToggle = namespaceButton.closest('button');
    expect(menuToggle).toBeDisabled();
  });

  it('should allow namespace selection when no mandatory namespace is set', async () => {
    const config = createMockConfig();
    const mockNamespaces = [{ name: 'namespace-1' }, { name: 'namespace-2' }];

    mockUseModularArchContext.mockReturnValue({
      config,
    } as ReturnType<typeof useModularArchContext>);

    mockUseNamespaceSelector.mockReturnValue({
      namespaces: mockNamespaces,
      preferredNamespace: { name: 'namespace-1' },
      updatePreferredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      initializationError: undefined,
    } as ReturnType<typeof useNamespaceSelector>);

    render(<NavBar onLogout={jest.fn()} />);

    const namespaceButton = screen.getByText('namespace-1');
    expect(namespaceButton).toBeInTheDocument();

    const menuToggle = namespaceButton.closest('button');
    expect(menuToggle).not.toBeDisabled();
  });
});
