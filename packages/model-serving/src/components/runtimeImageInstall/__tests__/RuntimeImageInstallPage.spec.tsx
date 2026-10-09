import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetProps,
} from '../../../../extension-points/runtime-image-install-target';
import RuntimeImageInstallPage from '../RuntimeImageInstallPage';
import { mockRuntimeImageActionData } from '../mockRuntimeImageActionData';
import { PLACEHOLDER_INSTALL_PATH } from '../const';

let mockExtensions: RuntimeImageInstallTargetExtension[] = [];
jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core'),
  useExtensions: () => mockExtensions,
}));

const MockTarget: React.FC<RuntimeImageInstallTargetProps> = ({
  onBack,
  cancelReturnRoute,
  targetData,
}) => (
  <div>
    <span data-testid="target-payload">
      {typeof targetData === 'string' ? targetData : JSON.stringify(targetData)}
    </span>
    <button type="button" onClick={onBack}>
      Back to selection
    </button>
    <Link to={cancelReturnRoute}>Cancel configuration</Link>
  </div>
);

const servingTarget: RuntimeImageInstallTargetExtension = {
  type: 'model-serving.runtime-image/install-target',
  properties: {
    id: 'servingRuntimeTemplate',
    label: 'Serving runtime template',
    description: 'Install as a ServingRuntime for legacy deployments and predictive models.',
    selectedState: {
      listName: 'Serving runtime templates',
      description: 'and the legacy deployment wizard.',
    },
    configureStepLabel: 'Configure template',
    component: () => Promise.resolve({ default: MockTarget }),
  },
};
const acceleratorTarget: RuntimeImageInstallTargetExtension = {
  type: 'model-serving.runtime-image/install-target',
  properties: {
    id: 'llmAcceleratorConfiguration',
    label: 'LLM accelerator configuration',
    description: 'Install as an LLMInferenceServiceConfig for LLM inference service deployments.',
    selectedState: {
      listName: 'LLM accelerator configurations',
      description: 'and the LLM inference service deployment wizard.',
    },
    configureStepLabel: 'Configure accelerator',
    component: () => Promise.resolve({ default: MockTarget }),
  },
};

type TestData = ReturnType<typeof mockRuntimeImageActionData>;
const renderPage = (data?: TestData, state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: PLACEHOLDER_INSTALL_PATH,
          state: state ?? (data ? { actionData: data } : undefined),
        },
      ]}
    >
      <Routes>
        <Route path={PLACEHOLDER_INSTALL_PATH} element={<RuntimeImageInstallPage />} />
        <Route
          path="/settings/model-resources-operations/model-deployment-settings/general-settings"
          element={<span>Returned to General settings</span>}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('RuntimeImageInstallPage', () => {
  beforeEach(() => {
    mockExtensions = [];
  });

  it('should show an actionable state when router data is absent', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Install runtime image' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Unable to install this runtime image' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Go back' }));
    expect(screen.getByText('Returned to General settings')).toBeInTheDocument();
  });

  it('should show an unavailable state when no active target has corresponding data', () => {
    renderPage(mockRuntimeImageActionData());
    expect(screen.getByRole('heading', { name: 'Install vLLM 0.6.0' })).toBeInTheDocument();
    expect(
      screen.getByText('No runtime image install target extensions are available.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('should show only active targets with corresponding resource data', () => {
    mockExtensions = [servingTarget, acceleratorTarget];
    renderPage({
      ...mockRuntimeImageActionData(),
      deploymentResources: {
        llmAcceleratorConfiguration:
          mockRuntimeImageActionData().deploymentResources.llmAcceleratorConfiguration,
      },
    });
    expect(
      screen.queryByRole('radio', { name: /Serving runtime template/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /LLM accelerator configuration/ })).toBeEnabled();
  });

  it('should show contributed metadata and host only the selected target', async () => {
    mockExtensions = [servingTarget, acceleratorTarget];
    renderPage(mockRuntimeImageActionData());
    expect(screen.getByText('Choose install target')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Model deployment settings' })).toBeInTheDocument();
    expect(screen.getByText('Runtime image library')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Runtime image library' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'vLLM 0.6.0' })).toHaveAttribute(
      'href',
      '/settings/model-resources-operations/model-deployment-settings/general-settings',
    );
    expect(
      screen.getByText('Install', { selector: '.pf-v6-c-breadcrumb__item' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('runtime-image-install-next')).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /LLM accelerator configuration/ }));
    expect(screen.getByText('LLM accelerator configurations')).toBeInTheDocument();
    expect(screen.getByText('Configure accelerator')).toBeInTheDocument();
    expect(screen.getByTestId('runtime-image-install-next')).toBeEnabled();

    fireEvent.click(screen.getByRole('radio', { name: /Serving runtime template/ }));
    expect(screen.getByText('Serving runtime templates')).toBeInTheDocument();
    expect(screen.queryByText('LLM accelerator configurations')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('runtime-image-install-next'));
    expect(JSON.parse((await screen.findByTestId('target-payload')).textContent)).toEqual(
      expect.objectContaining({
        kind: 'Template',
        objects: [expect.objectContaining({ kind: 'ServingRuntime' })],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to selection' }));
    expect(screen.getByRole('radio', { name: /Serving runtime template/ })).toBeChecked();
    fireEvent.click(screen.getByTestId('runtime-image-install-next'));
    await screen.findByTestId('target-payload');
    fireEvent.click(screen.getByRole('link', { name: 'Cancel configuration' }));
    expect(screen.getByText('Returned to General settings')).toBeInTheDocument();
  });

  it('should use the first duplicate target extension', () => {
    mockExtensions = [servingTarget, servingTarget];
    renderPage(mockRuntimeImageActionData());
    expect(screen.getByRole('radio', { name: /Serving runtime template/ })).toBeInTheDocument();
  });

  it('should show a loading state while resolving the selected target', () => {
    mockExtensions = [
      {
        ...servingTarget,
        properties: {
          ...servingTarget.properties,
          component: () =>
            new Promise(() => {
              // Intentionally unresolved to exercise the Suspense fallback.
            }),
        },
      },
    ];
    renderPage(mockRuntimeImageActionData());
    fireEvent.click(screen.getByRole('radio', { name: /Serving runtime template/ }));
    fireEvent.click(screen.getByTestId('runtime-image-install-next'));
    expect(
      screen.getByRole('progressbar', { name: 'Loading install configuration' }),
    ).toBeVisible();
  });
});
