import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import RuntimeImageInstallAction from '../RuntimeImageInstallAction';
import { mockRuntimeImageActionData } from '../../../__mocks__/mockRuntimeImageActionData';
import { RUNTIME_IMAGE_INSTALL_ROUTE } from '../const';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetId,
} from '../../../../extension-points/runtime-image-install-target';

let mockExtensions: RuntimeImageInstallTargetExtension[] = [];
jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core'),
  useExtensions: () => mockExtensions,
}));

const createTarget = (id: RuntimeImageInstallTargetId): RuntimeImageInstallTargetExtension => ({
  type: 'model-serving.runtime-image/install-target',
  properties: {
    id,
    label: id,
    description: id,
    installTargetName: id,
    selectedState: { listName: id, description: id },
    configureStepLabel: id,
    component: () => Promise.resolve({ default: () => null }),
  },
});

const StateView: React.FC = () => {
  const { state, pathname } = useLocation();
  return <span data-testid="route-data">{JSON.stringify({ pathname, state })}</span>;
};

describe('RuntimeImageInstallAction', () => {
  beforeEach(() => {
    mockExtensions = [
      createTarget('servingRuntimeTemplate'),
      createTarget('llmInferenceServiceConfig'),
    ];
  });

  it.each([
    [
      'LLM-only with its target disabled',
      ['servingRuntimeTemplate'],
      ['llmInferenceServiceConfig'],
      false,
    ],
    [
      'LLM-only with its target enabled',
      ['llmInferenceServiceConfig'],
      ['llmInferenceServiceConfig'],
      true,
    ],
    ['ServingRuntime-only', ['servingRuntimeTemplate'], ['servingRuntimeTemplate'], true],
    [
      'both resources with only ServingRuntime enabled',
      ['servingRuntimeTemplate'],
      ['servingRuntimeTemplate', 'llmInferenceServiceConfig'],
      true,
    ],
    ['no enabled targets', [], ['servingRuntimeTemplate', 'llmInferenceServiceConfig'], false],
    ['no deployment resources', ['servingRuntimeTemplate', 'llmInferenceServiceConfig'], [], false],
  ] as [string, RuntimeImageInstallTargetId[], RuntimeImageInstallTargetId[], boolean][])(
    'should reflect target availability for %s',
    async (_name, targets, resources, canInstall) => {
      mockExtensions = targets.map(createTarget);
      const data = mockRuntimeImageActionData();
      data.deploymentResources = Object.fromEntries(
        resources.map((id) => [id, data.deploymentResources[id]]),
      );
      render(
        <MemoryRouter>
          <RuntimeImageInstallAction actionData={data} />
        </MemoryRouter>,
      );
      const action = screen.getByTestId('runtime-image-install');
      if (canInstall) {
        expect(action).toHaveAttribute('href');
        expect(action).not.toHaveAttribute('aria-disabled', 'true');
      } else {
        expect(action).toHaveAttribute('aria-disabled', 'true');
        expect(action).not.toHaveAttribute('href');
        fireEvent.focus(action);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
          'No supported installation targets are enabled for this runtime image.',
        );
        fireEvent.click(action);
        expect(screen.queryByRole('link', { name: 'Install' })).not.toBeInTheDocument();
      }
    },
  );

  it('should navigate with typed action data in router state', () => {
    render(
      <MemoryRouter initialEntries={['/dummy-origin-route']}>
        <Routes>
          <Route
            path="/dummy-origin-route"
            element={<RuntimeImageInstallAction actionData={mockRuntimeImageActionData()} />}
          />
          <Route path={RUNTIME_IMAGE_INSTALL_ROUTE} element={<StateView />} />
        </Routes>
      </MemoryRouter>,
    );
    const installLink = screen.getByRole('link', { name: 'Install' });
    expect(installLink).toHaveAttribute(
      'href',
      '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/preview-vllm-0-6-0/install',
    );
    fireEvent.click(installLink);
    expect(screen.getByTestId('route-data')).toHaveTextContent(
      JSON.stringify({
        pathname:
          '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/preview-vllm-0-6-0/install',
        state: { actionData: mockRuntimeImageActionData() },
      }),
    );
  });
});
