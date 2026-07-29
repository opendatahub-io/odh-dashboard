import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Artifact } from '#~/third_party/mlmd';
import ArtifactsTableRow from '#~/pages/pipelines/global/experiments/artifacts/ArtifactsTableRow';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(() => ({
    status: true,
    featureFlags: {},
    reliantAreas: {},
    requiredComponents: {},
    requiredCapabilities: {},
    customCondition: jest.fn(),
  })),
}));

jest.mock('#~/concepts/pipelines/context/PipelinesContext', () => ({
  usePipelinesAPI: jest.fn(() => ({
    namespace: 'test-ns',
  })),
}));

jest.mock('#~/concepts/pipelines/content/artifacts/ArtifactUriLink', () => ({
  ArtifactUriLink: () => <span>mock-uri-link</span>,
}));

jest.mock('#~/concepts/pipelines/content/tables/PipelinesTableRowTime', () => ({
  __esModule: true,
  default: () => <span>mock-time</span>,
}));

jest.mock('#~/routes/pipelines/artifacts', () => ({
  artifactsDetailsRoute: (ns: string, id: number) => `/artifacts/${ns}/${id}`,
}));

type CustomPropertyValue = { stringValue?: string };

const createMockArtifact = (
  overrides: {
    id?: number;
    typeId?: number;
    type?: string;
    uri?: string;
    customProperties?: [string, CustomPropertyValue][];
    state?: number;
    createTimeSinceEpoch?: number;
  } = {},
): Artifact => {
  const defaults = {
    id: 1,
    typeId: 14,
    type: 'system.Metrics',
    uri: 's3://test-uri',
    customProperties: [['display_name', { stringValue: 'test artifact' }]] as [
      string,
      CustomPropertyValue,
    ][],
    state: 2,
    createTimeSinceEpoch: 1611399342384,
    ...overrides,
  };

  const customPropertiesMap = new Map(
    defaults.customProperties.map(([key, val]) => [
      key,
      { getStringValue: () => val.stringValue ?? '' },
    ]),
  );

  return {
    getId: jest.fn(() => defaults.id),
    getTypeId: jest.fn(() => defaults.typeId),
    getType: jest.fn(() => defaults.type),
    getUri: jest.fn(() => defaults.uri),
    getState: jest.fn(() => defaults.state),
    getCreateTimeSinceEpoch: jest.fn(() => defaults.createTimeSinceEpoch),
    getCustomPropertiesMap: jest.fn(() => customPropertiesMap),
    getPropertiesMap: jest.fn(() => []),
    toObject: jest.fn(() => ({
      id: defaults.id,
      typeId: defaults.typeId,
      type: defaults.type,
      uri: defaults.uri,
      customPropertiesMap: defaults.customProperties.map(([key, val]) => [key, val]),
      propertiesMap: [],
      state: defaults.state,
      createTimeSinceEpoch: defaults.createTimeSinceEpoch,
      lastUpdateTimeSinceEpoch: defaults.createTimeSinceEpoch,
    })),
  } as unknown as Artifact;
};

describe('ArtifactsTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show Registered label for artifact with registered model', () => {
    const registeredArtifact = createMockArtifact({
      id: 8,
      typeId: 15,
      type: 'system.ClassificationMetrics',
      customProperties: [
        ['display_name', { stringValue: 'registered model metrics' }],
        ['registeredModelName', { stringValue: 'model' }],
        ['registeredModelId', { stringValue: '1' }],
        ['modelVersionName', { stringValue: '1' }],
        ['modelVersionId', { stringValue: '1' }],
        ['modelRegistryName', { stringValue: 'model-registry' }],
      ],
    });

    render(
      <BrowserRouter>
        <table>
          <tbody>
            <ArtifactsTableRow artifact={registeredArtifact} />
          </tbody>
        </table>
      </BrowserRouter>,
    );

    const label = screen.getByTestId('model-registered-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Registered');
  });

  it('should not show Registered label for artifact without registered model', () => {
    const unregisteredArtifact = createMockArtifact({
      id: 1,
      typeId: 14,
      type: 'system.Metrics',
      customProperties: [['display_name', { stringValue: 'plain artifact' }]],
    });

    render(
      <BrowserRouter>
        <table>
          <tbody>
            <ArtifactsTableRow artifact={unregisteredArtifact} />
          </tbody>
        </table>
      </BrowserRouter>,
    );

    expect(screen.queryByTestId('model-registered-label')).not.toBeInTheDocument();
  });
});
