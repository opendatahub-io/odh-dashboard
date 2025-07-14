import { waitFor } from '@testing-library/dom';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { ProjectKind } from '#~/k8sTypes';
import { mockInferenceServiceModalData } from '#~/__mocks__/mockInferenceServiceModalData';
import useConnections from '#~/pages/projects/screens/detail/connections/useConnections';
import { useWatchConnectionTypes } from '#~/utilities/useWatchConnectionTypes';
import { mockConnection } from '#~/__mocks__/mockConnection';
import { mockConnectionTypeConfigMapObj } from '#~/__mocks__/mockConnectionType';
import usePrefillModelDeployModal, {
  ModelDeployPrefillInfo,
} from '#~/pages/modelServing/screens/projects/usePrefillModelDeployModal';

jest.mock('#~/concepts/areas/useIsAreaAvailable', () => () => ({
  status: true,
  featureFlags: {},
  reliantAreas: {},
  requiredComponents: {},
  requiredCapabilities: {},
  customCondition: jest.fn(),
}));

const mockProjectContext = {
  currentProject: {
    apiVersion: 'v1',
    kind: 'Project',
    metadata: {
      name: 'test-project',
      namespace: 'test-namespace',
    },
  } as ProjectKind,
  connections: [mockConnection({})],
};

const data = mockInferenceServiceModalData({});
const mockSetCreateData = jest.fn();
jest.mock('#~/pages/projects/screens/detail/connections/useConnections');
jest.mock('#~/utilities/useWatchConnectionTypes');
const mockUseConnections = jest.mocked(useConnections);
const mockuseWatchConnectionTypes = jest.mocked(useWatchConnectionTypes);

describe('usePrefillModelDeployModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('when no storage filed exist', () => {
    const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
      modelName: 'test-model',
      modelArtifactUri: '',
      initialConnectionName: 'test-key',
    };
    mockUseConnections.mockReturnValue({
      data: [mockConnection({})],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockuseWatchConnectionTypes.mockReturnValue([
      [mockConnectionTypeConfigMapObj({})],
      true,
      undefined,
      jest.fn(),
    ]);
    const renderResult = testHook(usePrefillModelDeployModal)(
      mockProjectContext,
      data,
      mockSetCreateData,
      mockRegisteredModelDeployInfo,
    );
    waitFor(() => {
      expect(renderResult).hookToStrictEqual({
        connections: [
          {
            connection: mockConnection({}),
          },
        ],
        connectionsLoadError: undefined,
        connectionsLoaded: true,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });
    });

    expect(mockSetCreateData.mock.calls).toEqual([]);
  });

  it('should only prefill once even if dependencies change', () => {
    const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
      modelName: 'test-model',
      modelArtifactUri: 's3://test/test?endpoint=test&defaultRegion=test',
      initialConnectionName: 'test-key',
    };

    mockUseConnections.mockReturnValue({
      data: [mockConnection({})],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockuseWatchConnectionTypes.mockReturnValue([
      [mockConnectionTypeConfigMapObj({})],
      true,
      undefined,
      jest.fn(),
    ]);

    const { rerender } = testHook(usePrefillModelDeployModal)(
      mockProjectContext,
      data,
      mockSetCreateData,
      mockRegisteredModelDeployInfo,
    );

    expect(mockSetCreateData).toHaveBeenCalledTimes(2);
    mockSetCreateData.mockClear();

    mockUseConnections.mockReturnValue({
      data: [mockConnection({}), mockConnection({})],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    rerender(mockProjectContext, data, mockSetCreateData, mockRegisteredModelDeployInfo);
    expect(mockSetCreateData).not.toHaveBeenCalled();
  });

  describe('S3 -  connection', () => {
    it('should return empty array, when connections are not loaded', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 's3://test/test?endpoint=test&defaultRegion=test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [],
        loaded: false,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([[], true, undefined, jest.fn()]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );
      expect(renderResult).hookToStrictEqual({
        connections: [],
        connectionsLoadError: undefined,
        connectionsLoaded: false,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });
    });

    it('should return empty array, when connections types are not loaded', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 's3://test/test?endpoint=test&defaultRegion=test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([[], false, undefined, jest.fn()]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );
      expect(renderResult).hookToStrictEqual({
        connections: [],
        connectionsLoadError: undefined,
        connectionsLoaded: false,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });
    });

    it('should return connections with new connections, when recommendation length is zero', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 's3://test/test?endpoint=test&defaultRegion=test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [mockConnection({})],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );

      waitFor(() => {
        expect(renderResult).hookToStrictEqual({
          connections: [
            {
              connection: mockConnection({}),
            },
          ],
          connectionsLoadError: undefined,
          connectionsLoaded: true,
          initialNewConnectionType: undefined,
          initialNewConnectionValues: {
            AWS_ACCESS_KEY_ID: '',
            AWS_DEFAULT_REGION: 'test',
            AWS_S3_BUCKET: 'test',
            AWS_S3_ENDPOINT: 'test',
            AWS_SECRET_ACCESS_KEY: '',
          },
        });
      });

      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            alert: {
              message:
                'The selected project does not have a connection that matches the model location. You can create a matching connection by using the data in the autopopulated fields, or edit the fields to create a different connection. Alternatively, click Existing connection to select an existing non-matching connection.',
              title: "We've populated the details of a new connection for you.",
              type: 'info',
            },
            awsData: [
              { key: 'Name', value: 'test-key' },
              { key: 'AWS_S3_BUCKET', value: 'test' },
              { key: 'AWS_S3_ENDPOINT', value: 'test' },
              { key: 'AWS_DEFAULT_REGION', value: 'test' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
            ],
            dataConnection: 'test-key',
            path: 'test',
            type: 'new-storage',
          },
        ],
      ]);
    });

    it('should return connections with existing connections, when recommendation length is one', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 's3://test/test?endpoint=test&defaultRegion=test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [
          mockConnection({
            data: {
              AWS_ACCESS_KEY_ID: 'dGVzdA==',
              AWS_DEFAULT_REGION: 'dGVzdA==',
              AWS_S3_BUCKET: 'dGVzdA==',
              AWS_S3_ENDPOINT: 'dGVzdA==',
              AWS_SECRET_ACCESS_KEY: 'dGVzdA==',
            },
          }),
        ],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );

      expect(renderResult).hookToStrictEqual({
        connections: [
          {
            connection: mockConnection({
              data: {
                AWS_ACCESS_KEY_ID: 'dGVzdA==',
                AWS_DEFAULT_REGION: 'dGVzdA==',
                AWS_S3_BUCKET: 'dGVzdA==',
                AWS_S3_ENDPOINT: 'dGVzdA==',
                AWS_SECRET_ACCESS_KEY: 'dGVzdA==',
              },
            }),
            isRecommended: true,
          },
        ],
        connectionsLoadError: undefined,
        connectionsLoaded: true,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });
      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            awsData: [
              { key: 'Name', value: 'test-key' },
              { key: 'AWS_S3_BUCKET', value: 'test' },
              { key: 'AWS_S3_ENDPOINT', value: 'test' },
              { key: 'AWS_DEFAULT_REGION', value: 'test' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
            ],
            dataConnection: 's3-connection',
            path: 'test',
            type: 'existing-storage',
          },
        ],
      ]);
    });

    it('should return connections, when recommendation length is two', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 's3://test/test?endpoint=test&defaultRegion=test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [
          mockConnection({
            data: {
              AWS_ACCESS_KEY_ID: 'dGVzdA==',
              AWS_DEFAULT_REGION: 'dGVzdA==',
              AWS_S3_BUCKET: 'dGVzdA==',
              AWS_S3_ENDPOINT: 'dGVzdA==',
              AWS_SECRET_ACCESS_KEY: 'dGVzdA==',
            },
          }),
          mockConnection({
            data: {
              AWS_ACCESS_KEY_ID: 'dGVzdA==',
              AWS_DEFAULT_REGION: 'dGVzdA==',
              AWS_S3_BUCKET: 'dGVzdA==',
              AWS_S3_ENDPOINT: 'dGVzdA==',
              AWS_SECRET_ACCESS_KEY: 'dGVzdA==',
            },
          }),
        ],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );

      expect(renderResult).hookToStrictEqual({
        connections: [
          {
            connection: mockConnection({
              data: {
                AWS_ACCESS_KEY_ID: 'dGVzdA==',
                AWS_DEFAULT_REGION: 'dGVzdA==',
                AWS_S3_BUCKET: 'dGVzdA==',
                AWS_S3_ENDPOINT: 'dGVzdA==',
                AWS_SECRET_ACCESS_KEY: 'dGVzdA==',
              },
            }),
            isRecommended: true,
          },
          {
            connection: mockConnection({
              data: {
                AWS_ACCESS_KEY_ID: 'dGVzdA==',
                AWS_DEFAULT_REGION: 'dGVzdA==',
                AWS_S3_BUCKET: 'dGVzdA==',
                AWS_S3_ENDPOINT: 'dGVzdA==',
                AWS_SECRET_ACCESS_KEY: 'dGVzdA==',
              },
            }),
            isRecommended: true,
          },
        ],
        connectionsLoadError: undefined,
        connectionsLoaded: true,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });
      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            awsData: [
              { key: 'Name', value: 'test-key' },
              { key: 'AWS_S3_BUCKET', value: 'test' },
              { key: 'AWS_S3_ENDPOINT', value: 'test' },
              { key: 'AWS_DEFAULT_REGION', value: 'test' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
            ],
            dataConnection: '',
            path: 'test',
            type: 'existing-storage',
          },
        ],
      ]);
    });
  });

  describe('URI - connection', () => {
    it('should return connections with new connections, when recommendation length is zero', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 'http://test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [mockConnection({})],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );

      waitFor(() => {
        expect(renderResult).hookToStrictEqual({
          connections: [
            {
              connection: mockConnection({}),
            },
          ],
          connectionsLoadError: undefined,
          connectionsLoaded: true,
          initialNewConnectionType: undefined,
          initialNewConnectionValues: { URI: 'http://test' },
        });
      });

      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            alert: {
              message:
                'The selected project does not have a connection that matches the model location. You can create a matching connection by using the data in the autopopulated fields, or edit the fields to create a different connection. Alternatively, click Existing connection to select an existing non-matching connection.',
              title: "We've populated the details of a new connection for you.",
              type: 'info',
            },
            awsData: [
              { key: 'Name', value: '' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
              { key: 'AWS_S3_BUCKET', value: '' },
              { key: 'AWS_S3_ENDPOINT', value: '' },
              { key: 'AWS_DEFAULT_REGION', value: '' },
            ],
            dataConnection: 'test-key',
            path: '',
            type: 'new-storage',
            uri: '',
          },
        ],
      ]);
    });

    it('should return connections with existing connections, when recommendation length is one', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 'http://tests',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [
          mockConnection({
            data: {
              URI: 'aHR0cDovL3Rlc3Rz',
            },
          }),
        ],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );

      expect(renderResult).hookToStrictEqual({
        connections: [
          {
            connection: mockConnection({ data: { URI: 'aHR0cDovL3Rlc3Rz' } }),
            isRecommended: true,
          },
        ],
        connectionsLoadError: undefined,
        connectionsLoaded: true,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });

      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            awsData: [
              { key: 'Name', value: '' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
              { key: 'AWS_S3_BUCKET', value: '' },
              { key: 'AWS_S3_ENDPOINT', value: '' },
              { key: 'AWS_DEFAULT_REGION', value: '' },
            ],
            dataConnection: 's3-connection',
            path: '',
            type: 'existing-storage',
            uri: 'http://tests',
          },
        ],
      ]);
    });

    it('should return connections, when recommendation length is two', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 'http://tests',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [
          mockConnection({
            data: { URI: 'aHR0cDovL3Rlc3Rz' },
          }),
          mockConnection({
            data: { URI: 'aHR0cDovL3Rlc3Rz' },
          }),
        ],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );

      expect(renderResult).hookToStrictEqual({
        connections: [
          {
            connection: mockConnection({ data: { URI: 'aHR0cDovL3Rlc3Rz' } }),
            isRecommended: true,
          },
          {
            connection: mockConnection({ data: { URI: 'aHR0cDovL3Rlc3Rz' } }),
            isRecommended: true,
          },
        ],
        connectionsLoadError: undefined,
        connectionsLoaded: true,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });

      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            awsData: [
              { key: 'Name', value: '' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
              { key: 'AWS_S3_BUCKET', value: '' },
              { key: 'AWS_S3_ENDPOINT', value: '' },
              { key: 'AWS_DEFAULT_REGION', value: '' },
            ],
            dataConnection: '',
            path: '',
            type: 'existing-storage',
            uri: 'http://tests',
          },
        ],
      ]);
    });
  });

  describe('OCI - connection', () => {
    it('should return connections with new connections, when recommendation length is zero', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 'oci://test.io/test/private:test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [mockConnection({})],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );
      waitFor(() => {
        expect(renderResult).hookToStrictEqual({
          connections: [
            {
              connection: mockConnection({}),
            },
          ],
          connectionsLoadError: undefined,
          connectionsLoaded: true,
          initialNewConnectionType: undefined,
          initialNewConnectionValues: {
            ACCESS_TYPE: ['Pull'],
          },
        });
      });

      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            alert: {
              message:
                'The selected project does not have a connection that matches the model location. You can create a matching connection by using the data in the autopopulated fields, or edit the fields to create a different connection. Alternatively, click Existing connection to select an existing non-matching connection.',
              title: "We've populated the details of a new connection for you.",
              type: 'info',
            },
            awsData: [
              { key: 'Name', value: '' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
              { key: 'AWS_S3_BUCKET', value: '' },
              { key: 'AWS_S3_ENDPOINT', value: '' },
              { key: 'AWS_DEFAULT_REGION', value: '' },
            ],
            dataConnection: 'test-key',
            path: '',
            type: 'new-storage',
            uri: 'oci://test.io/test/private:test',
          },
        ],
      ]);
    });

    it('should return connections with existing connections, when it is Red Hat registry url', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 'oci://registry.redhat.io/test/private:test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [mockConnection({})],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );

      waitFor(() => {
        expect(renderResult).hookToStrictEqual({
          connections: [
            {
              connection: mockConnection({}),
            },
          ],
          connectionsLoadError: undefined,
          connectionsLoaded: true,
          initialNewConnectionType: undefined,
          initialNewConnectionValues: {},
        });
      });

      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            awsData: [
              { key: 'Name', value: '' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
              { key: 'AWS_S3_BUCKET', value: '' },
              { key: 'AWS_S3_ENDPOINT', value: '' },
              { key: 'AWS_DEFAULT_REGION', value: '' },
            ],
            dataConnection: '',
            path: '',
            type: 'existing-uri',
            uri: 'oci://registry.redhat.io/test/private:test',
          },
        ],
      ]);
    });

    it('should return connections with existing connections, when recommendation length is one', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 'oci://registry.redhat.io/rhelai1/private:test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [
          mockConnection({
            data: {
              OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWxhaTE=',
              '.dockerconfigjson': 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw',
              ACCESS_TYPE: 'WyJQdWxsIl0',
            },
          }),
        ],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );

      waitFor(() => {
        expect(renderResult).hookToStrictEqual({
          initialNewConnectionType: undefined,
          initialNewConnectionValues: {},
          connections: [
            {
              connection: mockConnection({
                data: {
                  OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWxhaTE=',
                  '.dockerconfigjson': 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw',
                  ACCESS_TYPE: 'WyJQdWxsIl0',
                },
              }),
              isRecommended: true,
            },
          ],
          connectionsLoaded: true,
          connectionsLoadError: undefined,
        });
      });

      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            awsData: [
              { key: 'Name', value: '' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
              { key: 'AWS_S3_BUCKET', value: '' },
              { key: 'AWS_S3_ENDPOINT', value: '' },
              { key: 'AWS_DEFAULT_REGION', value: '' },
            ],
            dataConnection: '',
            path: '',
            type: 'existing-uri',
            uri: 'oci://registry.redhat.io/rhelai1/private:test',
          },
        ],
      ]);
    });

    it('should return connections, when recommendation length is two', () => {
      const mockRegisteredModelDeployInfo: ModelDeployPrefillInfo = {
        modelName: 'test-model',
        modelArtifactUri: 'oci://registry.redhat.io/rhelai1/private:test',
        initialConnectionName: 'test-key',
      };
      mockUseConnections.mockReturnValue({
        data: [
          mockConnection({
            data: { OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWxhaTE=', ACCESS_TYPE: 'WyJQdWxsIl0' },
          }),
          mockConnection({
            data: { OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWxhaTE=', ACCESS_TYPE: 'WyJQdWxsIl0' },
          }),
        ],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
      mockuseWatchConnectionTypes.mockReturnValue([
        [mockConnectionTypeConfigMapObj({})],
        true,
        undefined,
        jest.fn(),
      ]);
      const renderResult = testHook(usePrefillModelDeployModal)(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      );
      waitFor(() => {
        expect(renderResult).hookToStrictEqual({
          connections: [
            {
              connection: mockConnection({
                data: {
                  OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWxhaTE=',
                  ACCESS_TYPE: 'WyJQdWxsIl0',
                },
              }),
              isRecommended: true,
            },
            {
              connection: mockConnection({
                data: {
                  OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWxhaTE=',
                  ACCESS_TYPE: 'WyJQdWxsIl0',
                },
              }),
              isRecommended: true,
            },
          ],
          connectionsLoadError: undefined,
          connectionsLoaded: true,
          initialNewConnectionType: undefined,
          initialNewConnectionValues: {},
        });
      });
      expect(mockSetCreateData.mock.calls).toEqual([
        ['name', 'test-model'],
        [
          'storage',
          {
            awsData: [
              { key: 'Name', value: '' },
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
              { key: 'AWS_S3_BUCKET', value: '' },
              { key: 'AWS_S3_ENDPOINT', value: '' },
              { key: 'AWS_DEFAULT_REGION', value: '' },
            ],
            dataConnection: '',
            path: '',
            type: 'existing-uri',
            uri: 'oci://registry.redhat.io/rhelai1/private:test',
          },
        ],
      ]);
    });
  });
});
