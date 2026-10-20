import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetProps,
} from '../../../../extension-points/runtime-image-install-target';
import RuntimeImageInstallPage from '../RuntimeImageInstallPage';
import { mockRuntimeImageActionData } from '../../../__mocks__/mockRuntimeImageActionData';
import {
  GENERAL_SETTINGS_PATH,
  RUNTIME_IMAGE_INSTALL_ROUTE,
  RUNTIME_IMAGE_LIBRARY_PATH,
} from '../const';
import { getRuntimeImageInstallRoute } from '../utils';

let mockExtensions: RuntimeImageInstallTargetExtension[] = [];
jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core'),
  useExtensions: () => mockExtensions,
}));
jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  useTrackEvent: () => jest.fn(),
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
    description:
      'Install as a ServingRuntime template for inference service deployments. Not compatible with Models as a Service.',
    selectedState: {
      listName: 'Serving runtime templates',
      description: 'and the inference service deployment wizard.',
    },
    installTargetName: 'serving runtime template',
    configureStepLabel: 'Configure template',
    component: () => Promise.resolve({ default: MockTarget }),
  },
};
const acceleratorTarget: RuntimeImageInstallTargetExtension = {
  type: 'model-serving.runtime-image/install-target',
  properties: {
    id: 'llmInferenceServiceConfig',
    label: 'LLM accelerator configuration',
    description:
      'Install as an LLMInferenceServiceConfig for LLM inference service deployments. Compatible with Models as a Service.',
    selectedState: {
      listName: 'LLM accelerator configurations',
      description: 'and the LLM inference service deployment wizard.',
    },
    installTargetName: 'LLM accelerator configuration',
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
          pathname: getRuntimeImageInstallRoute(data?.runtimeImageId ?? 'preview-vllm-0-6-0'),
          state: state ?? (data ? { actionData: data } : undefined),
        },
      ]}
    >
      <Routes>
        <Route path={RUNTIME_IMAGE_INSTALL_ROUTE} element={<RuntimeImageInstallPage />} />
        <Route path={GENERAL_SETTINGS_PATH} element={<span>Returned to General settings</span>} />
        <Route
          path={RUNTIME_IMAGE_LIBRARY_PATH}
          element={<span>Returned to Runtime library</span>}
        />
        <Route
          path={`${RUNTIME_IMAGE_LIBRARY_PATH}/:runtimeId`}
          element={<span>Returned to Runtime image details</span>}
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
    expect(screen.getByRole('heading', { name: 'Create runtime' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Unable to install this runtime image' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Go back' }));
    expect(screen.getByText('Returned to General settings')).toBeInTheDocument();
  });

  it('should show an unavailable state when no active target has corresponding data', () => {
    renderPage(mockRuntimeImageActionData());
    expect(screen.getByRole('heading', { name: 'Create runtime' })).toBeInTheDocument();
    expect(
      screen.getByText('No runtime image install target extensions are available.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('should show the serving target when it is the only resource present', () => {
    mockExtensions = [servingTarget, acceleratorTarget];
    const data = mockRuntimeImageActionData();
    renderPage({
      ...data,
      deploymentResources: {
        servingRuntimeTemplate: data.deploymentResources.servingRuntimeTemplate,
      },
    });

    expect(screen.getByRole('radio', { name: /Serving runtime template/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /LLM accelerator configuration/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Serving runtime template/ })).toBeChecked();
    expect(screen.getByTestId('runtime-image-single-target-alert')).toHaveTextContent(
      'This runtime image only supports the serving runtime template install target.',
    );
    expect(screen.getByText(servingTarget.properties.description)).toBeVisible();
    expect(screen.getByText(acceleratorTarget.properties.description)).toBeVisible();
    expect(screen.getByTestId('runtime-image-install-next')).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: /LLM accelerator configuration/ }));
    expect(screen.getByRole('radio', { name: /Serving runtime template/ })).toBeChecked();
  });

  it.each([
    ['servingRuntimeTemplate', servingTarget],
    ['llmInferenceServiceConfig', acceleratorTarget],
  ] as const)(
    'should configure the sole enabled target %s and retain it on Back',
    async (id, target) => {
      mockExtensions = [servingTarget, acceleratorTarget];
      const data = mockRuntimeImageActionData();
      renderPage({ ...data, deploymentResources: { [id]: data.deploymentResources[id] } });
      const alert = screen.getByTestId('runtime-image-single-target-alert');
      expect(alert.closest('.pf-v6-c-radio__body')).toBeNull();
      expect(alert).toHaveTextContent(
        `This runtime image only supports the ${target.properties.installTargetName} install target.`,
      );
      expect(
        alert.compareDocumentPosition(
          screen.getByRole('radio', { name: target.properties.label }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByText(/Appears under/)).toBeVisible();
      fireEvent.click(screen.getByTestId('runtime-image-install-next'));
      const payload = await screen.findByTestId('target-payload');
      expect(payload.textContent).toEqual(data.deploymentResources[id]);
      fireEvent.click(screen.getByRole('button', { name: 'Back to selection' }));
      expect(screen.getByRole('radio', { name: target.properties.label })).toBeChecked();
      expect(screen.getByTestId('runtime-image-single-target-alert')).toBeVisible();
    },
  );

  it('should use the extension-provided target phrase in the alert', () => {
    mockExtensions = [
      {
        ...servingTarget,
        properties: { ...servingTarget.properties, installTargetName: 'custom template' },
      },
    ];
    renderPage(mockRuntimeImageActionData());
    expect(screen.getByTestId('runtime-image-single-target-alert')).toHaveTextContent(
      'This runtime image only supports the custom template install target.',
    );
  });

  it('should select a sole target when contributions become available after render', () => {
    const data = mockRuntimeImageActionData();
    const view = renderPage({
      ...data,
      deploymentResources: {
        servingRuntimeTemplate: data.deploymentResources.servingRuntimeTemplate,
      },
    });
    mockExtensions = [servingTarget, acceleratorTarget];
    view.rerender(
      <MemoryRouter
        initialEntries={[
          {
            pathname: getRuntimeImageInstallRoute(data.runtimeImageId),
            state: {
              actionData: {
                ...data,
                deploymentResources: {
                  servingRuntimeTemplate: data.deploymentResources.servingRuntimeTemplate,
                },
              },
            },
          },
        ]}
      >
        <RuntimeImageInstallPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('radio', { name: /Serving runtime template/ })).toBeChecked();
    expect(screen.getByTestId('runtime-image-install-next')).toBeEnabled();
  });

  it('should show an unavailable state when neither resource is present', () => {
    mockExtensions = [servingTarget, acceleratorTarget];
    renderPage({ ...mockRuntimeImageActionData(), deploymentResources: {} });

    expect(
      screen.getByText('This runtime image does not support any available install target'),
    ).toBeInTheDocument();
    screen.getAllByRole('radio').forEach((radio) => {
      expect(radio).toBeDisabled();
      expect(radio).not.toBeChecked();
    });
    expect(screen.getByTestId('runtime-image-install-next')).toBeDisabled();
    expect(screen.queryByTestId('runtime-image-single-target-alert')).not.toBeInTheDocument();
  });

  it('should show only active targets with corresponding resource data', () => {
    mockExtensions = [servingTarget, acceleratorTarget];
    renderPage({
      ...mockRuntimeImageActionData(),
      deploymentResources: {
        llmInferenceServiceConfig:
          mockRuntimeImageActionData().deploymentResources.llmInferenceServiceConfig,
      },
    });
    expect(screen.getByRole('radio', { name: /Serving runtime template/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /LLM accelerator configuration/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /LLM accelerator configuration/ })).toBeChecked();
    expect(screen.getByTestId('runtime-image-single-target-alert')).toBeVisible();
    expect(screen.getByTestId('runtime-image-install-next')).toBeEnabled();
  });

  it('should show contributed metadata and host only the selected target', async () => {
    mockExtensions = [servingTarget, acceleratorTarget];
    renderPage(mockRuntimeImageActionData());
    expect(screen.getByRole('heading', { name: 'Runtime type' })).toBeInTheDocument();
    expect(screen.queryByTestId('runtime-image-single-target-alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Model deployment settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Runtime library' })).toHaveAttribute(
      'href',
      RUNTIME_IMAGE_LIBRARY_PATH,
    );
    expect(screen.getByRole('link', { name: 'vLLM 0.6.0' })).toHaveAttribute(
      'href',
      mockRuntimeImageActionData().cancelReturnRoute,
    );
    expect(
      screen.getByText('Create', { selector: '.pf-v6-c-breadcrumb__item' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('runtime-image-install-next')).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /LLM accelerator configuration/ }));
    expect(screen.getByText('LLM accelerator configurations')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
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
    expect(screen.getByText('Returned to Runtime image details')).toBeInTheDocument();
  });

  it('should hand off the full LLM resource JSON string using the renamed target key', async () => {
    mockExtensions = [acceleratorTarget];
    const data = mockRuntimeImageActionData();
    renderPage(data);
    fireEvent.click(screen.getByRole('radio', { name: /LLM accelerator configuration/ }));
    fireEvent.click(screen.getByTestId('runtime-image-install-next'));
    expect((await screen.findByTestId('target-payload')).textContent).toBe(
      data.deploymentResources.llmInferenceServiceConfig,
    );
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
