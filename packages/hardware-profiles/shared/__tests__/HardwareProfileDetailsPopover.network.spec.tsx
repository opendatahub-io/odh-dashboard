import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ResourceClaimTemplateModel } from '@odh-dashboard/k8s-core/api/models';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import { mockHardwareProfile } from '../../src/__mocks__/mockHardwareProfile';
import HardwareProfileDetailsPopover from '../HardwareProfileDetailsPopover';

// The SDK is mocked, not the named API, so every Kubernetes read the popover makes is visible.
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
}));

const getMock = jest.mocked(k8sGetResource);
const listMock = jest.mocked(k8sListResource);

const NAMESPACE = 'a-test-project';
const TEMPLATE = 'single-gpu';

describe('HardwareProfileDetailsPopover network', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should only GET the named ResourceClaimTemplate; never DeviceClasses, ResourceSlices, or Nodes', async () => {
    getMock.mockResolvedValue(mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE }));
    render(
      <LocalQueuesContext.Provider
        value={{
          localQueues: { data: [], loaded: true, refresh: () => Promise.resolve(undefined) },
        }}
      >
        <HardwareProfileDetailsPopover
          hardwareProfile={mockHardwareProfile({
            name: 'dra-enabled-profile',
            namespace: 'redhat-ods-applications',
            resourceClaimTemplateName: TEMPLATE,
          })}
          namespace={NAMESPACE}
        />
      </LocalQueuesContext.Provider>,
    );
    expect(getMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));
    await screen.findByTestId('device-request-0-device-class');

    expect(listMock).not.toHaveBeenCalled();
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock.mock.calls.map(([{ model }]) => model)).toEqual([ResourceClaimTemplateModel]);
    expect(getMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: expect.objectContaining({ ns: NAMESPACE, name: TEMPLATE }),
      }),
    );
  });
});
