import { mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__';
import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
  mockProjectScopedHardwareProfiles,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mock403Error, mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import { DeviceAllocationMode, type DeviceRequest } from '@odh-dashboard/k8s-core/dra/types';
import { ResourceClaimTemplateModel } from '@odh-dashboard/k8s-core/api/models';
import { initIntercepts } from './workbenchTestUtils';
import { failOnDraInventoryRequests } from '../../../../utils/draNetworkGuards';
import { HardwareProfileModel } from '../../../../utils/models';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection';
import { workbenchPage } from '../../../../pages/workbench';

const NAMESPACE = 'test-project';
const PROFILE = 'dra-profile';
const PROFILE_DISPLAY_NAME = 'DRA Profile';
const TEMPLATE = 'single-gpu';
const DEVICE_CLASS = 'gpu.nvidia.com';
const EXACT_REQUEST: DeviceRequest = {
  name: 'gpu',
  exactly: {
    deviceClassName: DEVICE_CLASS,
    count: 1,
    selectors: [
      { cel: { expression: 'device.attributes["gpu.nvidia.com"].profile == "3g.40gb"' } },
    ],
  },
};

const draProfile = (templateName = TEMPLATE) =>
  mockHardwareProfile({
    name: PROFILE,
    displayName: PROFILE_DISPLAY_NAME,
    resourceClaimTemplateName: templateName,
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        minCount: '1',
        maxCount: '2',
        defaultCount: '1',
        resourceType: IdentifierResourceType.CPU,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        minCount: '2Gi',
        maxCount: '4Gi',
        defaultCount: '2Gi',
        resourceType: IdentifierResourceType.MEMORY,
      },
    ],
  });

const TEMPLATE_ROUTE = { model: ResourceClaimTemplateModel, ns: NAMESPACE, name: TEMPLATE };

/** The DRA profile beside the standard global profiles; the table workbench is bound to it. */
const initProfileIntercepts = (profile = draProfile()) => {
  // Any template read in the project, registered first so the named intercept wins.
  cy.interceptK8s(
    { model: ResourceClaimTemplateModel, ns: NAMESPACE, name: '*' },
    { statusCode: 404, body: mock404Error({}) },
  ).as('getAnyTemplate');
  cy.interceptK8s({ model: HardwareProfileModel, ns: 'opendatahub', name: PROFILE }, profile);
  initIntercepts({
    hardwareProfiles: {
      global: [...mockGlobalScopedHardwareProfiles, profile],
      project: mockProjectScopedHardwareProfiles,
    },
    notebooks: [
      mockNotebookK8sResource({
        name: 'dra-notebook',
        displayName: 'DRA Notebook',
        hardwareProfileName: PROFILE,
        hardwareProfileNamespace: 'opendatahub',
      }),
      mockNotebookK8sResource({ name: 'plain-notebook', displayName: 'Plain Notebook' }),
    ],
  });
};

const interceptTemplate = (requests: DeviceRequest[], delay = 0) =>
  cy
    .interceptK8s(TEMPLATE_ROUTE, {
      body: mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE, requests }),
      delay,
    })
    .as('getTemplate');

const openSpawnerWithProfile = (displayName: string) => {
  workbenchPage.visit(NAMESPACE);
  workbenchPage.findCreateButton().click();
  hardwareProfileSection.findSelect().click();
  hardwareProfileSection.selectProfileContaining(displayName);
  hardwareProfileSection.findSelect().should('contain.text', displayName);
};

describe('Hardware profile device requests popover', () => {
  beforeEach(() => {
    failOnDraInventoryRequests();
  });

  it('should show no device requests and read no template for a non-DRA profile', () => {
    initProfileIntercepts();
    openSpawnerWithProfile('Small Profile');

    hardwareProfileSection.findDetailsPopover().click();
    hardwareProfileSection.findDetails().should('be.visible');
    hardwareProfileSection.findDeviceRequests().should('not.exist');
    cy.get('@getAnyTemplate.all').should('have.length', 0);
  });

  it('should keep the default popover width for a workbench without a hardware profile', () => {
    initProfileIntercepts();
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('Plain Notebook');
    row.findHardwareProfileDetailsPopover().should('have.text', 'No hardware profile').click();
    hardwareProfileSection.findDetails().should('contain.text', 'No hardware profile is defined');
    hardwareProfileSection.findDeviceRequests().should('not.exist');
    hardwareProfileSection.shouldNotExceedWidth(360);
    cy.get('@getAnyTemplate.all').should('have.length', 0);
  });

  it('should show the requested configuration of an exact request and work with the keyboard', () => {
    initProfileIntercepts();
    interceptTemplate([EXACT_REQUEST], 300);
    openSpawnerWithProfile(PROFILE_DISPLAY_NAME);
    cy.get('@getTemplate.all').should('have.length', 0);

    // Space on the focused trigger opens the popover; the template is read only now.
    hardwareProfileSection.findDetailsPopover().focus().type(' ');
    hardwareProfileSection.findDeviceRequestsStatus('loading').should('be.visible');
    hardwareProfileSection.findDeviceRequestsStatus('claim-template').should('have.text', TEMPLATE);
    cy.wait('@getTemplate')
      .its('request.url')
      .should('include', `/namespaces/${NAMESPACE}/resourceclaimtemplates/${TEMPLATE}`);

    hardwareProfileSection.findDeviceRequest(0, 'device-class').should('have.text', DEVICE_CLASS);
    hardwareProfileSection.findDeviceRequestsStatus('loading').should('not.exist');
    hardwareProfileSection.findDeviceRequest(0, 'count').should('have.text', '1');
    hardwareProfileSection
      .findDeviceRequest(0, 'filters')
      .should('have.text', 'gpu.nvidia.com/profile = "3g.40gb"');
    hardwareProfileSection.findDetails().testA11y();

    // Escape closes the popover and returns focus to the trigger without another read.
    cy.get('body').type('{esc}');
    hardwareProfileSection.findDetails().should('not.exist');
    cy.focused().should('have.attr', 'data-testid', 'hardware-profile-details-popover');
    cy.get('@getTemplate.all').should('have.length', 1);
  });

  it('should show an All request and firstAvailable alternatives in template order', () => {
    initProfileIntercepts();
    interceptTemplate([
      {
        name: 'all-gpus',
        exactly: { deviceClassName: DEVICE_CLASS, allocationMode: DeviceAllocationMode.ALL },
      },
      {
        name: 'flex',
        firstAvailable: [
          { name: 'big', deviceClassName: 'mig.nvidia.com', count: 1 },
          { name: 'small', deviceClassName: 'mig.nvidia.com', count: 2 },
        ],
      },
    ]);
    openSpawnerWithProfile(PROFILE_DISPLAY_NAME);

    hardwareProfileSection.findDetailsPopover().click();
    cy.wait('@getTemplate');
    hardwareProfileSection.findDeviceRequest(0, 'name').should('have.text', 'all-gpus');
    hardwareProfileSection.findDeviceRequest(0, 'count').should('have.text', 'All');
    hardwareProfileSection.findDeviceRequest(1, 'name').should('have.text', 'flex');
    hardwareProfileSection.findDeviceRequestAlternatives(1).should('have.length', 2);
    hardwareProfileSection
      .findDeviceRequestAlternatives(1)
      .eq(0)
      .should('contain.text', '1 device · mig.nvidia.com');
    hardwareProfileSection
      .findDeviceRequestAlternatives(1)
      .eq(1)
      .should('contain.text', '2 devices · mig.nvidia.com');
    hardwareProfileSection
      .findDeviceRequests()
      .should('contain.text', 'Options are considered in this order during allocation.');
  });

  it('should say the template is not found in the table column and keep its name', () => {
    initProfileIntercepts();
    cy.interceptK8s(TEMPLATE_ROUTE, { statusCode: 404, body: mock404Error({}) }).as('getTemplate');
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('DRA Notebook');
    row.findHardwareProfileDetailsPopover().click();
    cy.wait('@getTemplate');

    hardwareProfileSection.findDeviceRequestsStatus('claim-template').should('have.text', TEMPLATE);
    hardwareProfileSection
      .findDeviceRequestsStatus('missing')
      .should('contain.text', 'Template not found')
      .and('contain.text', `This template is not in the ${NAMESPACE} project.`);
    hardwareProfileSection.findDeviceRequestsStatus('loading').should('not.exist');
    hardwareProfileSection.findDetails().testA11y();
  });

  it('should keep the template name and say details are unavailable when access is denied', () => {
    initProfileIntercepts();
    cy.interceptK8s(TEMPLATE_ROUTE, { statusCode: 403, body: mock403Error({}) }).as('getTemplate');
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('DRA Notebook');
    row.findHardwareProfileDetailsPopover().click();
    cy.wait('@getTemplate');

    hardwareProfileSection.findDeviceRequestsStatus('claim-template').should('have.text', TEMPLATE);
    hardwareProfileSection
      .findDeviceRequestsStatus('forbidden')
      .should('contain.text', 'Device request details unavailable')
      .and(
        'contain.text',
        `You do not have permission to view this template in the ${NAMESPACE} project.`,
      );
    hardwareProfileSection.findDeviceRequestsStatus('missing').should('not.exist');
    hardwareProfileSection.findDetails().testA11y();
  });

  it('should never show raw CEL and should fit long names into a narrow viewport', () => {
    const longTemplate = `very-long-resource-claim-template-name-${'x'.repeat(60)}`;
    const longClass = `very-long-device-class-name-${'y'.repeat(60)}.example.com`;
    const rawExpression = 'device.attributes["gpu.nvidia.com"].profile.matches("3g.*")';
    cy.viewport(375, 812);
    initProfileIntercepts(draProfile(longTemplate));
    cy.interceptK8s(
      { model: ResourceClaimTemplateModel, ns: NAMESPACE, name: longTemplate },
      mockResourceClaimTemplate({
        name: longTemplate,
        namespace: NAMESPACE,
        requests: [
          {
            name: 'gpu',
            exactly: {
              deviceClassName: longClass,
              count: 1,
              selectors: [
                { cel: { expression: rawExpression } },
                { cel: { expression: 'device.driver == "gpu.nvidia.com"' } },
              ],
            },
          },
        ],
      }),
    ).as('getTemplate');
    openSpawnerWithProfile(PROFILE_DISPLAY_NAME);

    hardwareProfileSection.findDetailsPopover().click();
    cy.wait('@getTemplate');
    hardwareProfileSection
      .findDeviceRequestsStatus('claim-template')
      .should('have.text', longTemplate);
    hardwareProfileSection.findDeviceRequest(0, 'device-class').should('have.text', longClass);
    hardwareProfileSection
      .findDeviceRequest(0, 'filters-unsupported')
      .should('have.text', 'This filter cannot be displayed.');
    hardwareProfileSection
      .findDeviceRequest(0, 'filters')
      .should('contain.text', 'driver = "gpu.nvidia.com"')
      .and('not.contain.text', 'matches(');
    hardwareProfileSection.findDetails().should('not.contain.text', rawExpression);
    hardwareProfileSection.shouldFitViewport();
  });
});
