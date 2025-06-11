import {
  k8sListResource,
  k8sCreateResource,
  k8sUpdateResource,
  k8sDeleteResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import axios from '#~/utilities/axios';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockAxiosError } from '#~/__mocks__/mockAxiosError';
import {
  addSupportServingPlatformProject,
  createProject,
  deleteProject,
  getModelServingProjects,
  getProjects,
  updateProject,
  useProjects,
} from '#~/api/k8s/projects';
import { ProjectModel, ProjectRequestModel } from '#~/api/models';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { NamespaceApplicationCase } from '#~/pages/projects/types';
import { ProjectKind } from '#~/k8sTypes';
import { groupVersionKind } from '#~/api/k8sUtils';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

jest.mock('#~/utilities/useK8sWatchResourceList', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/api/k8s/servingRuntimes.ts', () => ({
  listServingRuntimes: jest.fn(),
}));

jest.mock('#~/utilities/axios');

const mockedAxios = jest.mocked(axios);
const k8sListResourceMock = jest.mocked(k8sListResource<ProjectKind>);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource<ProjectKind>);
const k8sUpdateResourceMock = jest.mocked(k8sUpdateResource<ProjectKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<ProjectKind>);
const useK8sWatchResourceListMock = jest.mocked(useK8sWatchResourceList<ProjectKind[]>);

describe('useProjects', () => {
  it('should wrap useK8sWatchResource to watch projects', async () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [[], false, undefined];
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    expect(useProjects()).toBe(mockReturnValue);
    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(
      {
        isList: true,
        groupVersionKind: groupVersionKind(ProjectModel),
      },
      ProjectModel,
    );
  });
});

describe('getProjects', () => {
  const withLabel = 'test-project';
  it('should successfully fetch and  return lists of projects with labels', async () => {
    const projectMock = mockProjectK8sResource({});
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([projectMock]));

    const result = await getProjects(withLabel);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: { queryParams: { labelSelector: withLabel } },
    });
    expect(result).toStrictEqual([projectMock]);
  });

  it('should successfully fetch and  return lists of projects with no labels', async () => {
    const projectMock = mockProjectK8sResource({});
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([projectMock]));

    const result = await getProjects();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: {},
      },
    });
    expect(result).toStrictEqual([projectMock]);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error'));

    await expect(getProjects(withLabel)).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: { queryParams: { labelSelector: withLabel } },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('createProject', () => {
  const displayName = 'display-test';
  const description = 'test-description';
  const k8sName = 'test';
  const axiosResponse = (applied: boolean) => ({
    data: {
      applied,
    },
  });

  it('should create a project when k8s name is given', async () => {
    const projectMock = mockProjectK8sResource({ k8sName });
    k8sCreateResourceMock.mockResolvedValue(projectMock);
    mockedAxios.mockResolvedValue(axiosResponse(true));
    const result = await createProject('user', displayName, description, k8sName);
    expect(result).toStrictEqual(k8sName);
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      model: ProjectRequestModel,
      resource: {
        apiVersion: 'project.openshift.io/v1',
        kind: 'ProjectRequest',
        metadata: {
          name: k8sName,
        },
        description,
        displayName,
      },
    });
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith(`/api/namespaces/${k8sName}/0`);
  });

  it('should create a project when k8s name is not given', async () => {
    const projectMock = mockProjectK8sResource({ k8sName: displayName });
    k8sCreateResourceMock.mockResolvedValue(projectMock);
    mockedAxios.mockResolvedValue(axiosResponse(true));
    const result = await createProject('user', displayName, description);
    expect(result).toStrictEqual(displayName);
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      model: ProjectRequestModel,
      resource: {
        apiVersion: 'project.openshift.io/v1',
        kind: 'ProjectRequest',
        metadata: {
          name: displayName,
        },
        description,
        displayName,
      },
    });
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith(`/api/namespaces/${displayName}/0`);
  });

  it('should handle when failed to create project', async () => {
    const projectMock = mockProjectK8sResource({ k8sName });
    k8sCreateResourceMock.mockResolvedValue(projectMock);
    mockedAxios.mockResolvedValue(axiosResponse(false));
    await expect(createProject('user', displayName, description, k8sName)).rejects.toThrow(
      `Unable to fully create your project. Ask a ${ODH_PRODUCT_NAME} admin for assistance.`,
    );
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith(`/api/namespaces/${k8sName}/0`);
  });

  it('should handle when axios response data is undefined', async () => {
    const projectMock = mockProjectK8sResource({ k8sName });
    k8sCreateResourceMock.mockResolvedValue(projectMock);
    mockedAxios.mockResolvedValue({});
    await expect(createProject('user', displayName, description, k8sName)).rejects.toThrow(
      `Unable to fully create your project. Ask a ${ODH_PRODUCT_NAME} admin for assistance.`,
    );
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith(`/api/namespaces/${k8sName}/0`);
  });

  it('should handle axios error', async () => {
    const projectMock = mockProjectK8sResource({ k8sName });
    const axiosError = mockAxiosError({ message: 'error-message' });

    k8sCreateResourceMock.mockResolvedValue(projectMock);
    mockedAxios.mockRejectedValue(axiosError);
    await expect(createProject('user', displayName, description, k8sName)).rejects.toThrow(
      axiosError.response?.data.message,
    );
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith(`/api/namespaces/${k8sName}/0`);
  });
  it('should catch and handle other error from axios', async () => {
    const projectMock = mockProjectK8sResource({ k8sName });

    k8sCreateResourceMock.mockResolvedValue(projectMock);
    mockedAxios.mockRejectedValue(new Error('error'));
    await expect(createProject('user', displayName, description, k8sName)).rejects.toThrow('error');
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith(`/api/namespaces/${k8sName}/0`);
  });
  it('should handle other errors from k8s', async () => {
    k8sCreateResourceMock.mockRejectedValue(new Error('error'));

    await expect(createProject('user', displayName, description, k8sName)).rejects.toThrow('error');
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledTimes(0);
  });
});

describe('getModelServingProjects', () => {
  it('should successfully return model serving projects', async () => {
    const projectMock = mockProjectK8sResource({});
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([projectMock]));
    const result = await getModelServingProjects();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
    expect(result).toStrictEqual([projectMock]);
  });

  it('should handle errors and rethrows', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error'));
    await expect(getModelServingProjects()).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
  });
});

describe('addSupportServingPlatformProject', () => {
  const name = 'test';
  const axiosResponse = (applied: boolean) => ({
    data: {
      applied,
    },
  });
  it('should enable model serving platform', async () => {
    mockedAxios.mockResolvedValue(axiosResponse(true));
    const result = await addSupportServingPlatformProject(
      name,
      NamespaceApplicationCase.MODEL_MESH_PROMOTION,
    );
    expect(result).toStrictEqual(name);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith('/api/namespaces/test/1', { params: {} });
  });

  it('should handle error when failed to enable model serving platform', async () => {
    mockedAxios.mockResolvedValue(axiosResponse(false));
    await expect(
      addSupportServingPlatformProject(name, NamespaceApplicationCase.MODEL_MESH_PROMOTION),
    ).rejects.toThrow(
      `Unable to select a model serving platform in your project. Ask a ${ODH_PRODUCT_NAME} admin for assistance.`,
    );
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith('/api/namespaces/test/1', { params: {} });
  });

  it('should handle error when axios response data is undefined', async () => {
    mockedAxios.mockResolvedValue({});
    await expect(
      addSupportServingPlatformProject(name, NamespaceApplicationCase.MODEL_MESH_PROMOTION),
    ).rejects.toThrow(
      `Unable to select a model serving platform in your project. Ask a ${ODH_PRODUCT_NAME} admin for assistance.`,
    );
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith('/api/namespaces/test/1', { params: {} });
  });

  it('should handle other axios errors', async () => {
    const axiosError = mockAxiosError({ message: 'error-message' });
    mockedAxios.mockRejectedValue(axiosError);
    await expect(
      addSupportServingPlatformProject(name, NamespaceApplicationCase.MODEL_MESH_PROMOTION),
    ).rejects.toThrow(`error-message`);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith('/api/namespaces/test/1', { params: {} });
  });
});

describe('updateProject', () => {
  const displayName = 'test';
  const description = 'test-description';
  it('should update project', async () => {
    const projectMock = mockProjectK8sResource({ displayName, description });
    k8sUpdateResourceMock.mockResolvedValue(projectMock);
    const result = await updateProject(projectMock, displayName, description);
    expect(result).toStrictEqual(projectMock);
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      model: ProjectModel,
      resource: projectMock,
    });
  });

  it('should handle errors and rethrows', async () => {
    const projectMock = mockProjectK8sResource({ displayName, description });
    k8sUpdateResourceMock.mockRejectedValue(new Error('error'));
    await expect(updateProject(projectMock, displayName, description)).rejects.toThrow('error');
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      model: ProjectModel,
      resource: projectMock,
    });
  });
});

describe('deleteProject', () => {
  const projectMock = mockProjectK8sResource({});
  const { name } = projectMock.metadata;
  it('should delete project', async () => {
    k8sDeleteResourceMock.mockResolvedValue(projectMock);
    const result = await deleteProject(name);
    expect(result).toStrictEqual(projectMock);
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: ProjectModel,
      queryOptions: { name },
    });
  });

  it('should handle errors and rethrows', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error'));
    await expect(deleteProject(name)).rejects.toThrow('error');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: ProjectModel,
      queryOptions: { name },
    });
  });
});
