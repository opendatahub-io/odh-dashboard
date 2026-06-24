import React, { act } from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { useUser } from '#~/redux/selectors';
import SpawnerFooter from '#~/pages/projects/screens/spawner/SpawnerFooter';
import {
  mockEnvVariables,
  mockStartNotebookData,
  mockStorageData,
} from '#~/__mocks__/mockStartNotebookData';
import { useAppContext } from '#~/app/AppContext';
import { mockDashboardConfig, mockNotebookK8sResource } from '#~/__mocks__';
import { NotebookKind } from '#~/k8sTypes';
import { NotebookModel } from '#~/api';
import { EnvVariable, SecretCategory } from '#~/pages/projects/types';

const mockNavigate = jest.fn();

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
  useNavigate: () => mockNavigate,
  useParams: () => ({ notebookName: undefined }),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

const k8sCreateSecretMock = jest.mocked(k8sCreateResource<SecretKind>);
const k8sCreateNotebookMock = jest.mocked(k8sCreateResource<NotebookKind>);

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

describe('SpawnerFooter - Existing Secret Integration', () => {
  beforeEach(() => {
    const consoleErrorMock = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(consoleErrorMock);
    mockNavigate.mockReset();
    k8sCreateSecretMock.mockClear();
    k8sCreateNotebookMock.mockClear();
  });

  it('should extract existing secret refs and convert to secretKeyRef env vars', async () => {
    const existingSecretEnvVar: EnvVariable = {
      type: null,
      values: { category: SecretCategory.EXISTING, data: [] },
      existingSecretRefs: [
        {
          secretName: 'my-secret',
          selectedKeys: ['API_KEY', 'TOKEN'],
          allKeys: false,
        },
      ],
    };

    const result = render(
      <SpawnerFooter
        startNotebookData={startNotebookDataMock}
        storageData={mockStorageData}
        canEnablePipelines
        envVariables={[existingSecretEnvVar, ...mockEnvVariables]}
        connections={[]}
      />,
    );

    await act(() => fireEvent.click(result.getByTestId('submit-button')));

    expect(k8sCreateNotebookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: NotebookModel,
        resource: expect.objectContaining({
          spec: expect.objectContaining({
            template: expect.objectContaining({
              spec: expect.objectContaining({
                containers: expect.arrayContaining([
                  expect.objectContaining({
                    env: expect.arrayContaining([
                      {
                        name: 'API_KEY',
                        valueFrom: {
                          secretKeyRef: {
                            name: 'my-secret',
                            key: 'API_KEY',
                          },
                        },
                      },
                      {
                        name: 'TOKEN',
                        valueFrom: {
                          secretKeyRef: {
                            name: 'my-secret',
                            key: 'TOKEN',
                          },
                        },
                      },
                    ]),
                  }),
                ]),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('should handle multiple existing secret refs from different secrets', async () => {
    const existingSecretEnvVar: EnvVariable = {
      type: null,
      values: { category: SecretCategory.EXISTING, data: [] },
      existingSecretRefs: [
        {
          secretName: 'secret-1',
          selectedKeys: ['KEY1'],
          allKeys: false,
        },
        {
          secretName: 'secret-2',
          selectedKeys: ['KEY2', 'KEY3'],
          allKeys: false,
        },
      ],
    };

    const result = render(
      <SpawnerFooter
        startNotebookData={startNotebookDataMock}
        storageData={mockStorageData}
        canEnablePipelines
        envVariables={[existingSecretEnvVar]}
        connections={[]}
      />,
    );

    await act(() => fireEvent.click(result.getByTestId('submit-button')));

    expect(k8sCreateNotebookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.objectContaining({
          spec: expect.objectContaining({
            template: expect.objectContaining({
              spec: expect.objectContaining({
                containers: expect.arrayContaining([
                  expect.objectContaining({
                    env: expect.arrayContaining([
                      {
                        name: 'KEY1',
                        valueFrom: { secretKeyRef: { name: 'secret-1', key: 'KEY1' } },
                      },
                      {
                        name: 'KEY2',
                        valueFrom: { secretKeyRef: { name: 'secret-2', key: 'KEY2' } },
                      },
                      {
                        name: 'KEY3',
                        valueFrom: { secretKeyRef: { name: 'secret-2', key: 'KEY3' } },
                      },
                    ]),
                  }),
                ]),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('should not create secrets for existing secret category', async () => {
    const existingSecretEnvVar: EnvVariable = {
      type: null,
      values: { category: SecretCategory.EXISTING, data: [] },
      existingSecretRefs: [
        {
          secretName: 'my-secret',
          selectedKeys: ['API_KEY'],
          allKeys: false,
        },
      ],
    };

    const result = render(
      <SpawnerFooter
        startNotebookData={startNotebookDataMock}
        storageData={[]}
        canEnablePipelines
        envVariables={[existingSecretEnvVar]}
        connections={[]}
      />,
    );

    await act(() => fireEvent.click(result.getByTestId('submit-button')));

    const secretCalls = jest
      .mocked(k8sCreateResource)
      .mock.calls.filter((call) => call[0].model.kind === 'Secret');

    expect(secretCalls).toHaveLength(0);
  });
});
