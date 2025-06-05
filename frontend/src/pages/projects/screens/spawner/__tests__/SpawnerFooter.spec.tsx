import React, { act } from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { useUser } from '#~/redux/selectors';
import SpawnerFooter from '#~/pages/projects/screens/spawner/SpawnerFooter';
import {
  mockEnvVariables,
  mockStartNotebookData,
  mockStorageData,
} from '#~/__mocks__/mockStartNotebookData';
import { useAppContext } from '#~/app/AppContext';
import { mockDashboardConfig, mockNotebookK8sResource } from '#~/__mocks__';
import { ConfigMapKind, NotebookKind, PersistentVolumeClaimKind, SecretKind } from '#~/k8sTypes';
import { ConfigMapModel, NotebookModel, PVCModel, SecretModel } from '#~/api';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { mockConnection } from '#~/__mocks__/mockConnection';

jest.mock('#~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('#~/redux/selectors', () => ({
  ...jest.requireActual('#~/redux/selectors'),
  useUser: jest.fn(),
  useClusterInfo: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

const k8sCreateSecretMock = jest.mocked(k8sCreateResource<SecretKind>);
const k8sCreatePVCMock = jest.mocked(k8sCreateResource<PersistentVolumeClaimKind>);
const k8sCreateConfigMapMock = jest.mocked(k8sCreateResource<ConfigMapKind>);
const k8sCreateNotebookMock = jest.mocked(k8sCreateResource<NotebookKind>);

k8sCreatePVCMock.mockResolvedValue(mockPVCK8sResource({}));
k8sCreateNotebookMock.mockResolvedValue(mockNotebookK8sResource({}));

const useAppContextMock = jest.mocked(useAppContext);
useAppContextMock.mockReturnValue({
  buildStatuses: [],
  dashboardConfig: mockDashboardConfig({}),
  storageClasses: [],
  isRHOAI: false,
});

const useUserMock = jest.mocked(useUser);
useUserMock.mockReturnValue({
  username: 'test-user',
  userID: '1234',
  isAdmin: false,
  isAllowed: true,
  userLoading: false,
  userError: null,
});

const startNotebookDataMock = mockStartNotebookData({ notebookId: 'test-notebook' });
global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

const dryRunOptions = {
  fetchOptions: { requestInit: {} },
  queryOptions: {
    queryParams: { dryRun: 'All' },
  },
  payload: {
    dryRun: ['All'],
  },
};

describe('EmptyProjects', () => {
  beforeEach(() => {
    // make console happy
    jest.spyOn(console, 'error').mockImplementation(jest.fn());
  });
  it('should dry run all the API calls', async () => {
    const result = render(
      <SpawnerFooter
        startNotebookData={startNotebookDataMock}
        storageData={mockStorageData}
        canEnablePipelines
        envVariables={mockEnvVariables}
        connections={[mockConnection({})]}
      />,
    );
    expect(result.getByTestId('submit-button')).toBeEnabled();
    await act(() => fireEvent.click(result.getByTestId('submit-button')));

    expect(k8sCreateSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: SecretModel,
        ...dryRunOptions,
      }),
    );
    expect(k8sCreatePVCMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: PVCModel,
        ...dryRunOptions,
      }),
    );
    expect(k8sCreateConfigMapMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: ConfigMapModel,
        ...dryRunOptions,
      }),
    );
    expect(k8sCreateNotebookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: NotebookModel,
        ...dryRunOptions,
      }),
    );
  });
});
