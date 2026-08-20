import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
  mockProjectScopedHardwareProfiles,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { IdentifierResourceType, SchedulingType } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { initIntercepts } from './workbenchTestUtils';
import {
  NotebookModel,
  PodModel,
  PVCModel,
  ProjectModel,
  HardwareProfileModel,
  LocalQueueModel,
} from '../../../../utils/models';
import { be } from '../../../../utils/should';
import { verifyRelativeURL } from '../../../../utils/url';
import { workbenchPage, notebookConfirmModal } from '../../../../pages/workbench';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection.ts';

describe('Workbench page', () => {
  it('should display Local queue and Cluster queue in hardware profile popover when clicking profile in table and Kueue is enabled', () => {
    const queueProfile = mockHardwareProfile({
      name: 'queue-profile',
      displayName: 'Queue Profile',
      schedulingType: SchedulingType.QUEUE,
      localQueueName: 'test-queue',
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
    const globalProfilesWithQueue = [...mockGlobalScopedHardwareProfiles, queueProfile];

    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
                'opendatahub.io/hardware-profile-name': 'queue-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
              },
            },
          },
        }),
      ],
      hardwareProfiles: {
        global: globalProfilesWithQueue,
        project: mockProjectScopedHardwareProfiles,
      },
    });
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ disableKueue: false, disableProjectScoped: true }),
    );
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
          [DataScienceStackComponent.KUEUE]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([mockProjectK8sResource({ enableKueue: true })]),
    );
    cy.interceptK8s(ProjectModel, mockProjectK8sResource({ enableKueue: true }));
    cy.interceptK8sList(
      { model: LocalQueueModel, ns: 'test-project' },
      mockK8sResourceList([
        mockLocalQueueK8sResource({ name: 'test-queue', namespace: 'test-project' }),
      ]),
    );
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'queue-profile',
      },
      queueProfile,
    );

    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.shouldHaveHardwareProfile('Queue Profile');
    notebookRow
      .findHardwareProfileColumn()
      .findByTestId('hardware-profile-details-popover')
      .click();
    hardwareProfileSection
      .findDetails()
      .should('be.visible')
      .within(() => {
        cy.contains('Local queue').should('be.visible');
        cy.contains('test-queue').should('be.visible');
        cy.contains('Cluster queue').should('be.visible');
        cy.contains('test-cluster-queue').should('be.visible');
      });
  });

  it('list workbench and table sorting', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
                'opendatahub.io/hardware-profile-name': 'small-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
              },
            },
          },
        }),
      ],
    });
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'small-profile',
      },
      mockGlobalScopedHardwareProfiles[0],
    );
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.shouldHaveNotebookImageName('Test Image');
    notebookRow.shouldHaveHardwareProfile('Small');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Ready');
    notebookRow.findNotebookRouteLink().should('not.have.attr', 'aria-disabled');

    //Name sorting
    workbenchPage.findNotebookTableHeaderButton('Name').click();
    workbenchPage.findNotebookTableHeaderButton('Name').should(be.sortAscending);
    workbenchPage.findNotebookTableHeaderButton('Name').click();
    workbenchPage.findNotebookTableHeaderButton('Name').should(be.sortDescending);

    //status sorting
    workbenchPage.findNotebookTableHeaderButton('Status').click();
    workbenchPage.findNotebookTableHeaderButton('Status').should(be.sortAscending);
    workbenchPage.findNotebookTableHeaderButton('Status').click();
    workbenchPage.findNotebookTableHeaderButton('Status').should(be.sortDescending);
  });

  it('Validate the notebook status when workbench is stopped and starting', () => {
    initIntercepts({});
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');

    //stop Workbench
    notebookRow.findNotebookStopToggle().click();
    notebookConfirmModal.findStopWorkbenchButton().should('be.enabled');
    cy.interceptK8s(
      NotebookModel,
      mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {
              'opendatahub.io/notebook-image': 'true',
            },
            annotations: {
              'kubeflow-resource-stopped': '2023-02-14T21:45:14Z',
              'opendatahub.io/image-display-name': 'Test image',
            },
          },
        },
      }),
    );
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({ isRunning: false })]));

    notebookConfirmModal.findStopWorkbenchButton().click();
    cy.wait('@stopWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        {
          op: 'add',
          path: '/metadata/annotations/kubeflow-resource-stopped',
        },
      ]);
    });
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped');
    notebookRow.findNotebookRouteLink().should('have.attr', 'aria-disabled', 'true');

    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('startWorkbench');
    cy.interceptK8s(
      NotebookModel,
      mockNotebookK8sResource({
        opts: {
          metadata: {
            name: 'test-notebook',
            labels: {
              'opendatahub.io/notebook-image': 'true',
            },
            annotations: {
              'opendatahub.io/image-display-name': 'Test image',
            },
          },
        },
      }),
    );

    notebookRow.findNotebookStopToggle().click();
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Starting');
    notebookRow.findHaveNotebookStatusText().click();

    cy.wait('@startWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        { op: 'remove', path: '/metadata/annotations/kubeflow-resource-stopped' },
      ]);
    });

    notebookRow.findNotebookStatusModal().should('exist');
  });

  it('Should stop a running workbench with a deleted hardware profile', () => {
    initIntercepts({});
    cy.interceptK8s(
      { model: HardwareProfileModel, ns: 'opendatahub', name: 'deleted-gpu-profile' },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );

    cy.interceptK8sList(
      { model: NotebookModel, ns: 'test-project' },
      mockK8sResourceList([
        mockNotebookK8sResource({
          name: 'test-notebook',
          displayName: 'Test Notebook',
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/hardware-profile-name': 'deleted-gpu-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
                'opendatahub.io/hardware-profile-resource-version': '12345',
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ]),
    );

    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');

    notebookRow.findNotebookStopToggle().click();
    notebookConfirmModal.findStopWorkbenchButton().should('be.enabled');

    cy.interceptK8s(
      NotebookModel,
      mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {
              'opendatahub.io/notebook-image': 'true',
            },
            annotations: {
              'kubeflow-resource-stopped': '2024-11-06T10:00:00Z',
              'opendatahub.io/image-display-name': 'Test image',
            },
          },
        },
      }),
    );
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({ isRunning: false })]));

    notebookConfirmModal.findStopWorkbenchButton().click();

    cy.wait('@stopWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        {
          op: 'add',
          path: '/metadata/annotations/kubeflow-resource-stopped',
        },
      ]);
      expect(interception.request.body).to.deep.include({
        op: 'remove',
        path: '/metadata/annotations/opendatahub.io~1hardware-profile-name',
      });
      expect(interception.request.body).to.deep.include({
        op: 'remove',
        path: '/metadata/annotations/opendatahub.io~1hardware-profile-namespace',
      });
    });

    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped');
  });

  it('Should start a stopped workbench with a deleted hardware profile', () => {
    initIntercepts({ mockPodList: [] });

    cy.interceptK8s(
      { model: HardwareProfileModel, ns: 'opendatahub', name: 'deleted-gpu-profile' },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );

    cy.interceptK8sList(
      { model: NotebookModel, ns: 'test-project' },
      mockK8sResourceList([
        mockNotebookK8sResource({
          name: 'test-notebook',
          displayName: 'Test Notebook',
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'kubeflow-resource-stopped': '2024-11-06T10:00:00Z',
                'opendatahub.io/hardware-profile-name': 'deleted-gpu-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
                'opendatahub.io/hardware-profile-resource-version': '12345',
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ]),
    );

    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped');
    notebookRow.findHardwareProfileColumn().should('contain', 'Deleted');

    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('startWorkbench');
    cy.interceptK8s(
      NotebookModel,
      mockNotebookK8sResource({
        opts: {
          metadata: {
            name: 'test-notebook',
            labels: {
              'opendatahub.io/notebook-image': 'true',
            },
            annotations: {
              'opendatahub.io/image-display-name': 'Test image',
            },
          },
        },
      }),
    );

    notebookRow.findNotebookStopToggle().click();
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Starting');

    cy.wait('@startWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        { op: 'remove', path: '/metadata/annotations/kubeflow-resource-stopped' },
      ]);
      expect(interception.request.body).to.deep.include({
        op: 'remove',
        path: '/metadata/annotations/opendatahub.io~1hardware-profile-name',
      });
      expect(interception.request.body).to.deep.include({
        op: 'remove',
        path: '/metadata/annotations/opendatahub.io~1hardware-profile-namespace',
      });
    });
  });

  it('Validate the start button is enabled when the notebook image is deleted', () => {
    initIntercepts({ mockPodList: [] });

    cy.interceptK8sList(
      {
        model: NotebookModel,
        ns: 'test-project',
      },
      mockK8sResourceList([
        mockNotebookK8sResource({
          name: 'deleted-image-notebook',
          opts: {
            metadata: {
              annotations: {
                'kubeflow-resource-stopped': '2023-02-14T21:45:14Z',
              },
            },
          },
          displayName: 'Notebook with deleted image',
          image: 'test-imagestream:invalid',
        }),
      ]),
    );

    workbenchPage.visit('test-project');

    const notebookRow = workbenchPage.getNotebookRow('Notebook with deleted image');
    notebookRow.findNotebookImageAvailability().should('have.text', 'Deleted');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped');
    notebookRow.findNotebookStopToggle().should('not.be.disabled');
  });

  it('Handle custom hardware profile resources in workbenches table', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          resources: {
            requests: { cpu: '3', memory: '6Gi' },
            limits: { cpu: '3', memory: '6Gi' },
          },
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ],
    });
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.shouldHaveNotebookImageName('Test Image');
    notebookRow.shouldHaveHardwareProfile('No hardware profile');
    notebookRow.findKebabAction('Edit workbench').click();

    hardwareProfileSection.findSelect().should('contain.text', 'Use existing settings');
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    verifyRelativeURL('/projects/test-project/spawner');
    hardwareProfileSection.findSelect().click();
    cy.findByRole('option', { name: /Use existing settings/ }).should('not.exist');
  });

  it('Shows migration required label and popover for unmigrated workbenches', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          name: 'test-notebook',
          displayName: 'Unmigrated Notebook',
          injectAuth: null,
          lastImageSelection: 'test-imagestream:1.2',
          opts: {
            metadata: {
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
        mockNotebookK8sResource({
          name: 'migrated-notebook',
          displayName: 'Migrated Notebook',
          lastImageSelection: 'test-imagestream:1.2',
          opts: {
            metadata: {
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ],
    });
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([
        mockPVCK8sResource({ name: 'test-notebook' }),
        mockPVCK8sResource({ name: 'migrated-notebook' }),
      ]),
    );
    workbenchPage.visit('test-project');

    const unmigratedRow = workbenchPage.getNotebookRow('Unmigrated Notebook');
    unmigratedRow.findMigrationRequiredLabel().should('have.text', 'Migration required').click();
    unmigratedRow.findMigrationRequiredPopoverTitle().should('have.text', 'Migration required');
    unmigratedRow
      .findMigrationRequiredPopover()
      .should(
        'contain.text',
        'To prevent access issues, migrate this workbench by editing the workbench description and saving.',
      )
      .and(
        'contain.text',
        'Alternatively, delete this workbench and create a new one using the same cluster storage to preserve user data.',
      )
      .and(
        'contain.text',
        'Note: Once migrated, the old URL will no longer work. Access the new URL by clicking on the name link.',
      );

    workbenchPage
      .getNotebookRow('Migrated Notebook')
      .findMigrationRequiredLabel()
      .should('not.exist');
  });

  it('Expanded workbench table row', () => {
    initIntercepts({});
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findExpansionButton().click();
    notebookRow.findExpansion().should('be.visible');
    notebookRow.shouldHaveClusterStorageTitle();
    notebookRow.shouldHaveMountPath('/opt/app-root/src/root');
  });
});
