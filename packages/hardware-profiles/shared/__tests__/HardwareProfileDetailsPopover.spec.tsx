import * as React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { getResourceClaimTemplate } from '@odh-dashboard/k8s-core/api/resourceClaims';
import { DeviceAllocationMode, type DeviceRequest } from '@odh-dashboard/k8s-core/dra/types';
import {
  mock403Error,
  mock404Error,
  mock500Error,
} from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import { mockHardwareProfile } from '../../src/__mocks__/mockHardwareProfile';
import HardwareProfileDetailsPopover from '../HardwareProfileDetailsPopover';

jest.mock('@odh-dashboard/k8s-core/api/resourceClaims', () => ({
  getResourceClaimTemplate: jest.fn(),
}));

const getResourceClaimTemplateMock = jest.mocked(getResourceClaimTemplate);

const WORKLOAD_NAMESPACE = 'a-test-project';
const PROFILE_NAMESPACE = 'redhat-ods-applications';
const TEMPLATE_NAME = 'single-gpu';
const TRIGGER = 'hardware-profile-details-popover';
const SECTION = 'hardware-profile-device-requests';

const renderPopover = (ui: React.ReactElement) =>
  render(
    <LocalQueuesContext.Provider
      value={{ localQueues: { data: [], loaded: true, refresh: () => Promise.resolve(undefined) } }}
    >
      {ui}
    </LocalQueuesContext.Provider>,
  );

const draProfile = (resourceClaimTemplateName = TEMPLATE_NAME) =>
  mockHardwareProfile({
    name: 'dra-enabled-profile',
    namespace: PROFILE_NAMESPACE,
    displayName: 'DRA profile',
    resourceClaimTemplateName,
  });

const resolveTemplate = (requests: DeviceRequest[]) =>
  getResourceClaimTemplateMock.mockResolvedValue(
    mockResourceClaimTemplate({ name: TEMPLATE_NAME, namespace: WORKLOAD_NAMESPACE, requests }),
  );

const openPopover = async () => {
  await userEvent.click(screen.getByTestId(TRIGGER));
  return screen.findByTestId('hardware-profile-details');
};

describe('HardwareProfileDetailsPopover device requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render the section or fetch for a non-DRA profile', async () => {
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={mockHardwareProfile({ displayName: 'Plain profile' })}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );

    const details = await openPopover();

    expect(details).toHaveTextContent('CPU');
    expect(details).toHaveTextContent('Memory');
    expect(screen.queryByTestId(SECTION)).not.toBeInTheDocument();
    expect(details).not.toHaveTextContent('Device requests');
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should fetch only after opening, from the workload namespace', async () => {
    resolveTemplate([{ name: 'gpu', exactly: { deviceClassName: 'gpu.nvidia.com', count: 1 } }]);
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );

    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();

    await openPopover();
    await screen.findByTestId('device-request-0-device-class');

    expect(getResourceClaimTemplateMock).toHaveBeenCalledTimes(1);
    expect(getResourceClaimTemplateMock).toHaveBeenCalledWith(
      WORKLOAD_NAMESPACE,
      TEMPLATE_NAME,
      expect.anything(),
    );
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalledWith(
      PROFILE_NAMESPACE,
      expect.anything(),
      expect.anything(),
    );
  });

  it('should render an exact request as requested configuration', async () => {
    resolveTemplate([
      {
        name: 'gpu',
        exactly: {
          deviceClassName: 'gpu.nvidia.com',
          count: 1,
          selectors: [
            { cel: { expression: 'device.attributes["gpu.nvidia.com"].profile == "3g.40gb"' } },
          ],
        },
      },
    ]);
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    const section = await screen.findByTestId(SECTION);
    await within(section).findByTestId('device-request-0-device-class');

    expect(section).not.toHaveTextContent('Device requests');
    expect(within(section).getByTestId('device-requests-claim-template')).toHaveTextContent(
      TEMPLATE_NAME,
    );
    expect(within(section).getByTestId('device-request-0-device-class')).toHaveTextContent(
      'gpu.nvidia.com',
    );
    expect(within(section).getByTestId('device-request-0-count')).toHaveTextContent('1');
    expect(within(section).getByTestId('device-request-0-filters')).toHaveTextContent(
      'gpu.nvidia.com/profile = "3g.40gb"',
    );
    expect(section).not.toHaveTextContent('Actual devices are shown after workload allocation.');
    expect(screen.queryByTestId('device-request-0-name')).not.toBeInTheDocument();
    expect(section).not.toHaveTextContent('Dynamic resource allocation');
    expect(section).not.toHaveTextContent('MIG partition');
  });

  it('should show "All" for an All allocation mode without inventing a count', async () => {
    resolveTemplate([
      {
        name: 'gpu',
        exactly: { deviceClassName: 'gpu.nvidia.com', allocationMode: DeviceAllocationMode.ALL },
      },
    ]);
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    const count = await screen.findByTestId('device-request-0-count');
    expect(count).toHaveTextContent(/^All$/);
    expect(screen.getByTestId('device-request-0-filters')).toHaveTextContent('None');
  });

  it('should list firstAvailable alternatives in template order', async () => {
    resolveTemplate([
      {
        name: 'gpu',
        firstAvailable: [
          {
            name: 'big',
            deviceClassName: 'mig.nvidia.com',
            count: 1,
            selectors: [
              { cel: { expression: 'device.attributes["mig.nvidia.com"].profile == "3g.40gb"' } },
            ],
          },
          {
            name: 'small',
            deviceClassName: 'mig.nvidia.com',
            count: 2,
            selectors: [
              { cel: { expression: 'device.attributes["mig.nvidia.com"].profile == "1g.20gb"' } },
            ],
          },
        ],
      },
    ]);
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    const list = await screen.findByTestId('device-request-0-alternatives');
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('1 device · mig.nvidia.com');
    expect(items[0]).toHaveTextContent('mig.nvidia.com/profile = "3g.40gb"');
    expect(items[1]).toHaveTextContent('2 devices · mig.nvidia.com');
    expect(items[1]).toHaveTextContent('mig.nvidia.com/profile = "1g.20gb"');
    expect(screen.getByTestId(SECTION)).toHaveTextContent('Requested devices · first available');
    expect(screen.getByTestId(SECTION)).toHaveTextContent(
      'Options are considered in this order during allocation.',
    );
  });

  it('should show the request name only when there are multiple requests', async () => {
    resolveTemplate([
      { name: 'gpu', exactly: { deviceClassName: 'gpu.nvidia.com', count: 1 } },
      { name: 'nic', exactly: { deviceClassName: 'nic.example.com', count: 2 } },
    ]);
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    expect(await screen.findByTestId('device-request-0-name')).toHaveTextContent('gpu');
    expect(screen.getByTestId('device-request-1-name')).toHaveTextContent('nic');
    expect(screen.getByTestId('device-request-1-count')).toHaveTextContent('2');
  });

  it('should show a loading indicator with the template name while fetching', async () => {
    getResourceClaimTemplateMock.mockImplementation(
      () =>
        new Promise(() => {
          // Never settles so the loading state stays visible.
        }),
    );
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    expect(await screen.findByTestId('device-requests-loading')).toBeInTheDocument();
    expect(screen.getByTestId('device-requests-claim-template')).toHaveTextContent(TEMPLATE_NAME);
  });

  it('should show "Template not found" for a 404 while keeping the template name', async () => {
    getResourceClaimTemplateMock.mockRejectedValue(new K8sStatusError(mock404Error({})));
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    const alert = await screen.findByTestId('device-requests-missing');
    expect(alert).toHaveTextContent('Template not found');
    expect(alert).toHaveTextContent(
      `This template is not in the ${WORKLOAD_NAMESPACE} project. Contact your administrator.`,
    );
    expect(alert).not.toHaveTextContent('deleted');
    expect(screen.getByTestId('device-requests-claim-template')).toHaveTextContent(TEMPLATE_NAME);
    expect(screen.queryByTestId('device-requests-forbidden')).not.toBeInTheDocument();
  });

  it('should show "details unavailable" for a 403 while keeping the template name', async () => {
    getResourceClaimTemplateMock.mockRejectedValue(new K8sStatusError(mock403Error({})));
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    const alert = await screen.findByTestId('device-requests-forbidden');
    expect(alert).toHaveTextContent('Device request details unavailable');
    expect(alert).toHaveTextContent(
      `You do not have permission to view this template in the ${WORKLOAD_NAMESPACE} project. Contact your administrator for access.`,
    );
    expect(alert).not.toHaveTextContent('not found');
    expect(screen.getByTestId('device-requests-claim-template')).toHaveTextContent(TEMPLATE_NAME);
    expect(screen.queryByTestId('device-requests-missing')).not.toBeInTheDocument();
  });

  it('should show a load failure for other errors while keeping the template name', async () => {
    getResourceClaimTemplateMock.mockRejectedValue(
      new K8sStatusError(mock500Error({ message: 'upstream exploded' })),
    );
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    const alert = await screen.findByTestId('device-requests-error');
    expect(alert).toHaveTextContent('Device request details could not be loaded');
    expect(alert).toHaveTextContent('upstream exploded');
    expect(screen.getByTestId('device-requests-claim-template')).toHaveTextContent(TEMPLATE_NAME);
  });

  it('should never render raw CEL for an unsupported selector', async () => {
    const rawExpression = 'device.attributes["gpu.nvidia.com"].profile.matches("3g.*")';
    resolveTemplate([
      {
        name: 'gpu',
        exactly: {
          deviceClassName: 'gpu.nvidia.com',
          count: 1,
          selectors: [
            { cel: { expression: rawExpression } },
            { cel: { expression: 'device.driver == "gpu.nvidia.com"' } },
          ],
        },
      },
    ]);
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    const filters = await screen.findByTestId('device-request-0-filters');
    expect(within(filters).getByTestId('device-request-0-filters-unsupported')).toHaveTextContent(
      'This filter cannot be displayed.',
    );
    expect(filters).toHaveTextContent('driver = "gpu.nvidia.com"');
    expect(screen.getByTestId('hardware-profile-details')).not.toHaveTextContent('matches(');
    expect(screen.getByTestId('hardware-profile-details')).not.toHaveTextContent(rawExpression);
  });

  it('should render long template, request, and class names', async () => {
    const longTemplate = `very-long-resource-claim-template-name-${'x'.repeat(60)}`;
    const longRequest = `very-long-request-name-${'y'.repeat(60)}`;
    const longClass = `very-long-device-class-${'z'.repeat(60)}.example.com`;
    resolveTemplate([
      { name: longRequest, exactly: { deviceClassName: longClass, count: 1 } },
      { name: 'other', exactly: { deviceClassName: 'gpu.nvidia.com', count: 1 } },
    ]);
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile(longTemplate)}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );
    await openPopover();

    expect(await screen.findByTestId('device-request-0-name')).toHaveTextContent(longRequest);
    expect(screen.getByTestId('device-requests-claim-template')).toHaveTextContent(longTemplate);
    expect(screen.getByTestId('device-request-0-device-class')).toHaveTextContent(longClass);
  });

  it('should show the template name with an unavailable state when no namespace is known', async () => {
    renderPopover(<HardwareProfileDetailsPopover hardwareProfile={draProfile()} />);
    await openPopover();

    const alert = await screen.findByTestId('device-requests-no-namespace');
    expect(alert).toHaveTextContent('Device request details unavailable');
    expect(screen.getByTestId('device-requests-claim-template')).toHaveTextContent(TEMPLATE_NAME);
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should open and close with the keyboard and return focus to the trigger', async () => {
    resolveTemplate([{ name: 'gpu', exactly: { deviceClassName: 'gpu.nvidia.com', count: 1 } }]);
    renderPopover(
      <HardwareProfileDetailsPopover
        hardwareProfile={draProfile()}
        namespace={WORKLOAD_NAMESPACE}
      />,
    );

    const trigger = screen.getByTestId(TRIGGER);
    await userEvent.tab();
    expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByTestId(SECTION)).toBeInTheDocument();
    await screen.findByTestId('device-request-0-device-class');

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByTestId(SECTION)).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(getResourceClaimTemplateMock).toHaveBeenCalledTimes(1);
  });
});
