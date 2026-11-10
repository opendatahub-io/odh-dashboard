import '@testing-library/jest-dom';
import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  RUNTIME_CATALOG_DETAILS_ACTION_GROUP,
  type RuntimeImageInstallActionProps,
} from '~/odh/extension-points/runtime-image-install-action';
import RuntimeCatalogDetailsView from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsView';
import type { RuntimeCatalogDetailsViewProps } from '~/odh/pages/runtimeCatalog/RuntimeCatalogDetailsView';
import { getRuntimeCatalogDetailsRoute } from '~/odh/pages/runtimeCatalog/utils/runtimeCatalogUtils';
import { RUNTIME_CATALOG_TAB_PATH } from '~/odh/routes/runtimeCatalog/runtimeCatalog';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useExtensions: jest.fn(),
}));

const mockUseExtensions = jest.mocked(useExtensions);

const InstallActionProbe: React.FC<RuntimeImageInstallActionProps> = ({ actionData }) => (
  <>
    <button type="button">Install</button>
    <span data-testid="runtime-install-action-data">{JSON.stringify(actionData)}</span>
  </>
);

const OtherActionProbe: React.FC = () => <button type="button">Other</button>;

const actionExtension = (
  group: string,
  id: string,
  component: React.FC<RuntimeImageInstallActionProps> | React.FC,
) => ({
  type: 'core.action' as const,
  uid: id,
  pluginName: 'test',
  flags: {},
  properties: {
    id,
    label: id,
    group,
    component: () => Promise.resolve({ default: component }),
  },
});

const renderDetails = (props: Partial<RuntimeCatalogDetailsViewProps> = {}, runtimeId = '1') =>
  render(
    <MemoryRouter initialEntries={[`/catalog/${runtimeId}`]}>
      <Routes>
        <Route
          path="/catalog/:runtimeId"
          element={
            <RuntimeCatalogDetailsView
              breadcrumbs={[{ title: 'Runtime library', href: '/catalog' }]}
              {...props}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const runtimeDetails = {
  id: '1',
  name: 'vllm',
  displayName: 'vLLM',
  description: 'GPU-accelerated serving for large language models.',
  supportedModelFormats: [{ name: 'safetensors' }, { name: 'huggingface' }],
  capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
};

const runtimeVersions = [
  {
    id: '102',
    name: 'vllm-0.6.0',
    artifactType: 'serving-runtime-version',
    version: '0.6.0',
    image: 'registry.example.com/mock/vllm:0.6.0',
    servingRuntimeTemplate: '{"kind":"ServingRuntime"}',
    llmInferenceServiceConfig: '{"kind":"LLMInferenceServiceConfig"}',
  },
];

describe('RuntimeCatalogDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExtensions.mockReturnValue([]);
  });

  it('should show a controlled load error instead of runtime details', () => {
    renderDetails({ error: new Error('Catalog service unavailable') });

    expect(
      screen.getByRole('heading', { name: 'Danger alert: Unable to load runtime image' }),
    ).toBeVisible();
    expect(screen.getByText('Catalog service unavailable')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'vLLM' })).not.toBeInTheDocument();
  });

  it('should show N/A for missing optional runtime details', () => {
    renderDetails(
      {
        runtimeDetails: {
          id: 'custom-runtime',
          name: 'Custom runtime',
          description: 'A runtime with limited catalog metadata',
        },
      },
      'custom-runtime',
    );

    expect(screen.getByRole('heading', { name: 'Custom runtime' })).toBeInTheDocument();
    expect(screen.getByText('A runtime with limited catalog metadata')).toBeInTheDocument();
    expect(screen.getAllByRole('definition').map((definition) => definition.textContent)).toEqual([
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
    ]);
    expect(screen.queryByTestId('runtime-container-image-copy')).not.toBeInTheDocument();
    expect(screen.queryByText(runtimeDetails.description)).not.toBeInTheDocument();
  });

  it('should render both configuration tabs from the latest BFF version', () => {
    renderDetails({ runtimeDetails, runtimeVersions });

    expect(screen.getByText('0.6.0')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('runtime-container-image-copy')).getByRole('textbox'),
    ).toHaveValue('registry.example.com/mock/vllm:0.6.0');
    expect(screen.getByTestId('runtime-serving-runtime-panel')).toHaveTextContent(
      'kind: ServingRuntime',
    );
    expect(screen.getByTestId('runtime-llm-inference-service-tab')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('runtime-llm-inference-service-tab'));

    expect(screen.getByTestId('runtime-llm-inference-service-panel')).toHaveTextContent(
      'kind: LLMInferenceServiceConfig',
    );
  });

  it('should hide unavailable configurations when the BFF version has no templates', () => {
    renderDetails({
      runtimeDetails,
      runtimeVersions: [
        { ...runtimeVersions[0], servingRuntimeTemplate: '', llmInferenceServiceConfig: '' },
      ],
    });

    expect(screen.queryByRole('heading', { name: 'Runtimes' })).not.toBeInTheDocument();
  });

  it('should label the runtime types and describe each one', () => {
    renderDetails({ runtimeDetails, runtimeVersions });

    expect(screen.getByRole('heading', { name: 'Runtimes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Serving runtime' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'LLM runtime' })).toBeInTheDocument();
    expect(screen.getByTestId('runtime-serving-runtime-panel')).toHaveTextContent(
      'Use this runtime for serving most model types.',
    );

    fireEvent.click(screen.getByTestId('runtime-llm-inference-service-tab'));

    expect(screen.getByTestId('runtime-llm-inference-service-panel')).toHaveTextContent(
      'Use this runtime for deploying LLM inference services.',
    );
  });

  it('should list the detail fields with the published date last', () => {
    renderDetails({ runtimeDetails, runtimeVersions });

    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Version',
      'Hardware',
      'Model formats',
      'Container image',
      'Published',
    ]);
  });

  it('should explain the Latest label in a popover without a heading', async () => {
    renderDetails({ runtimeDetails: { ...runtimeDetails, versionCount: 1 }, runtimeVersions });

    fireEvent.click(screen.getByTestId('runtime-catalog-details-latest'));

    const popover = await screen.findByTestId('runtime-catalog-details-latest-popover');
    expect(popover).toHaveTextContent(
      'This is the newest version of this runtime image available in the library.',
    );
    expect(within(popover).queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should not show the Latest label when the runtime has no versions', () => {
    renderDetails({ runtimeDetails: { ...runtimeDetails, versionCount: 0 }, runtimeVersions });

    expect(screen.queryByTestId('runtime-catalog-details-latest')).not.toBeInTheDocument();
  });

  it('should activate the LLM tab when it is the only configuration', () => {
    renderDetails({
      runtimeDetails,
      runtimeVersions: [{ ...runtimeVersions[0], servingRuntimeTemplate: '' }],
    });

    expect(screen.queryByTestId('runtime-serving-runtime-tab')).not.toBeInTheDocument();
    expect(screen.getByTestId('runtime-llm-inference-service-panel')).toHaveTextContent(
      'kind: LLMInferenceServiceConfig',
    );
  });

  it('should show a loading state before runtime details', () => {
    renderDetails({ loading: true });

    expect(screen.getByLabelText('Loading runtime image')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'vLLM' })).not.toBeInTheDocument();
  });

  it('should show the not-found state for a missing runtime ID', () => {
    renderDetails({}, 'unknown-runtime');

    expect(screen.getByRole('heading', { name: 'Runtime image not found' })).toBeInTheDocument();
    expect(screen.getByText('The selected runtime image is not available.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'vLLM' })).not.toBeInTheDocument();
  });

  it('should show the runtime title without an install button when nothing is contributed', () => {
    renderDetails({ runtimeDetails, runtimeVersions });

    expect(screen.getByRole('heading', { name: 'vLLM' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('should render a contributed install action with the runtime payload', async () => {
    mockUseExtensions.mockReturnValue([
      actionExtension('some-other-group', 'other-action', OtherActionProbe),
      actionExtension(
        RUNTIME_CATALOG_DETAILS_ACTION_GROUP,
        'runtime-image-install',
        InstallActionProbe,
      ),
    ]);

    renderDetails({ runtimeDetails, runtimeVersions });

    expect(await screen.findByRole('button', { name: 'Install' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Other' })).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('runtime-install-action-data').textContent)).toEqual({
      runtimeImageId: '1',
      runtimeImageName: 'vLLM',
      cancelReturnRoute: getRuntimeCatalogDetailsRoute('1'),
      libraryReturnRoute: RUNTIME_CATALOG_TAB_PATH,
      version: '0.6.0',
      hardware: 'nvidia.com/gpu',
      deploymentResources: {
        servingRuntimeTemplate: '{"kind":"ServingRuntime"}',
        llmInferenceServiceConfig: '{"kind":"LLMInferenceServiceConfig"}',
      },
    });
  });
});
