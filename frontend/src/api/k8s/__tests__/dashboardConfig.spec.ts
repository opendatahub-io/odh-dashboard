import { k8sGetResource, k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import {
  getDashboardConfig,
  getDashboardConfigTemplateDisablement,
  getDashboardConfigTemplateOrder,
  patchDashboardConfigTemplateDisablement,
  patchDashboardConfigTemplateOrder,
  patchDashboardConfigHardwareProfileOrder,
} from '#~/api/k8s/dashboardConfig';
import { ODHDashboardConfigModel } from '#~/api/models';
import { DashboardConfigKind } from '#~/k8sTypes';
import { DASHBOARD_CONFIG } from '#~/utilities/const';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
  k8sPatchResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<DashboardConfigKind>);
const k8sPatchResourceMock = jest.mocked(k8sPatchResource<DashboardConfigKind>);
const projectName = 'project-test';

describe('getDashboardConfig', () => {
  it('should successfully return dashboard config', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    k8sGetResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await getDashboardConfig(projectName);
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
    });
    expect(result).toStrictEqual(dashboardConfigurationMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error'));

    await expect(getDashboardConfig(projectName)).rejects.toThrow('error');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('getDashboardConfigTemplateOrder', () => {
  it('should successfully return dashboard config template order', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});

    k8sGetResourceMock.mockResolvedValue(dashboardConfigurationMock);
    const result = await getDashboardConfigTemplateOrder(projectName);
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
    });
    expect(result).toStrictEqual(dashboardConfigurationMock.spec.templateOrder);
  });

  it('should return empty array when template order is not configured', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    dashboardConfigurationMock.spec.templateOrder = undefined;
    k8sGetResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await getDashboardConfigTemplateOrder(projectName);
    expect(result).toStrictEqual([]);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('getDashboardConfigTemplateDisablement', () => {
  it('should successfully return dashboard config template disablement', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    k8sGetResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await getDashboardConfigTemplateDisablement(projectName);
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
    });
    expect(result).toStrictEqual(dashboardConfigurationMock.spec.templateDisablement);
  });

  it('should return empty array when template disablement is not configured ', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    dashboardConfigurationMock.spec.templateDisablement = undefined;
    k8sGetResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await getDashboardConfigTemplateDisablement(projectName);
    expect(result).toStrictEqual([]);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and rethrows', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error'));
    await expect(getDashboardConfigTemplateDisablement(projectName)).rejects.toThrow('error');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('patchDashboardConfigTemplateOrder', () => {
  it('should patch dashboard config template order when template order is configured', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    const templateOrder = ['test'];
    dashboardConfigurationMock.spec.templateOrder = templateOrder;
    k8sPatchResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await patchDashboardConfigTemplateOrder(templateOrder, projectName);
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
      patches: [
        {
          op: 'replace',
          path: '/spec/templateOrder',
          value: templateOrder,
        },
      ],
    });
    expect(result).toStrictEqual(templateOrder);
  });

  it('should throw error when template order is not configured', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    dashboardConfigurationMock.spec.templateOrder = undefined;
    const templateOrder = ['test'];
    k8sPatchResourceMock.mockResolvedValue(dashboardConfigurationMock);

    await expect(patchDashboardConfigTemplateOrder(templateOrder, projectName)).rejects.toThrow(
      'Template order is not configured',
    );
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
      patches: [
        {
          op: 'replace',
          path: '/spec/templateOrder',
          value: templateOrder,
        },
      ],
    });
  });
});

describe('patchDashboardConfigTemplateDisablement', () => {
  it('should patch dashboard config template disablement when template order is configured', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    const templateDisablement = ['test'];
    dashboardConfigurationMock.spec.templateDisablement = templateDisablement;
    k8sPatchResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await patchDashboardConfigTemplateDisablement(templateDisablement, projectName);
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
      patches: [
        {
          op: 'replace',
          path: '/spec/templateDisablement',
          value: templateDisablement,
        },
      ],
    });
    expect(result).toStrictEqual(templateDisablement);
  });

  it('should throw error when template disablement is not configured', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    dashboardConfigurationMock.spec.templateDisablement = undefined;
    const templateDisablement = ['test'];
    k8sPatchResourceMock.mockResolvedValue(dashboardConfigurationMock);

    await expect(
      patchDashboardConfigTemplateDisablement(templateDisablement, projectName),
    ).rejects.toThrow('Template disablement is not configured');
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName },
      patches: [
        {
          op: 'replace',
          path: '/spec/templateDisablement',
          value: templateDisablement,
        },
      ],
    });
  });
});

describe('patchDashboardConfigHardwareProfileOrder', () => {
  it('should patch dashboard config hardware profile order successfully', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    const hardwareProfileOrder = ['profile-1', 'profile-2', 'profile-3'];
    dashboardConfigurationMock.spec.hardwareProfileOrder = hardwareProfileOrder;
    k8sPatchResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await patchDashboardConfigHardwareProfileOrder(
      hardwareProfileOrder,
      projectName,
    );
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName, queryParams: {} },
      patches: [
        {
          op: 'replace',
          path: '/spec/hardwareProfileOrder',
          value: hardwareProfileOrder,
        },
      ],
    });
    expect(result).toStrictEqual(dashboardConfigurationMock);
  });

  it('should handle empty hardware profile order', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    const hardwareProfileOrder: string[] = [];
    dashboardConfigurationMock.spec.hardwareProfileOrder = hardwareProfileOrder;
    k8sPatchResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await patchDashboardConfigHardwareProfileOrder(
      hardwareProfileOrder,
      projectName,
    );
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(dashboardConfigurationMock);
  });

  it('should handle reordered hardware profile list', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    const reorderedOrder = ['profile-c', 'profile-a', 'profile-b'];
    dashboardConfigurationMock.spec.hardwareProfileOrder = reorderedOrder;
    k8sPatchResourceMock.mockResolvedValue(dashboardConfigurationMock);

    const result = await patchDashboardConfigHardwareProfileOrder(reorderedOrder, projectName);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName, queryParams: {} },
      patches: [
        {
          op: 'replace',
          path: '/spec/hardwareProfileOrder',
          value: reorderedOrder,
        },
      ],
    });
    expect(result).toStrictEqual(dashboardConfigurationMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sPatchResourceMock.mockRejectedValue(new Error('patch failed'));

    await expect(
      patchDashboardConfigHardwareProfileOrder(['profile-1'], projectName),
    ).rejects.toThrow('patch failed');
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should support K8sAPIOptions parameter', async () => {
    const dashboardConfigurationMock = mockDashboardConfig({});
    const hardwareProfileOrder = ['profile-1'];
    const opts = { signal: new AbortController().signal };
    dashboardConfigurationMock.spec.hardwareProfileOrder = hardwareProfileOrder;
    k8sPatchResourceMock.mockResolvedValue(dashboardConfigurationMock);

    await patchDashboardConfigHardwareProfileOrder(hardwareProfileOrder, projectName, opts);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: { signal: opts.signal } },
      model: ODHDashboardConfigModel,
      queryOptions: { name: DASHBOARD_CONFIG, ns: projectName, queryParams: {} },
      patches: [
        {
          op: 'replace',
          path: '/spec/hardwareProfileOrder',
          value: hardwareProfileOrder,
        },
      ],
    });
  });
});
