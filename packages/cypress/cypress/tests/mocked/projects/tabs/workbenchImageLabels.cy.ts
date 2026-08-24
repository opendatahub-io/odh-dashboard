import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__';
import { mockRouteK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockRouteK8sResource';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { initIntercepts } from './workbenchTestUtils';
import {
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  PodModel,
  RouteModel,
  HardwareProfileModel,
} from '../../../../utils/models';
import { workbenchPage, notebookImageUpdateModal } from '../../../../pages/workbench';

describe('Workbench page', () => {
  it('Update Notebook Image', () => {
    initIntercepts({});
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([
        mockPVCK8sResource({ name: 'outdated-notebook', displayName: 'Outdated Notebook' }),
      ]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'outdated-notebook' }));
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({ isRunning: true })]));
    workbenchPage.visit('test-project');
    workbenchPage.getNotebookRow('Outdated Notebook').findNotebookImageLabel().click();
    notebookImageUpdateModal.findUpdateImageButton().click();
    notebookImageUpdateModal.findSubmitUpdateImageButton().should('be.disabled');
    notebookImageUpdateModal.findLatestVersionOption().click();

    cy.interceptK8s('PATCH', NotebookModel, {
      delay: 500, //TODO: Remove the delay when we add support for loading states
      body: mockNotebookK8sResource({
        name: 'outdated-notebook',
        displayName: 'Outdated Notebook (updated)',
      }),
    }).as('updateNotebookImage');

    cy.interceptK8s(
      'GET',
      NotebookModel,
      mockNotebookK8sResource({
        name: 'outdated-notebook',
        displayName: 'Outdated Notebook',
      }),
    );
    notebookImageUpdateModal.findSubmitUpdateImageButton().click();
    workbenchPage.findUpdatingImageIcon().should('be.visible');
    cy.wait('@updateNotebookImage');
  });

  it('Shows latest image label', () => {
    initIntercepts({});
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'latest-notebook' })]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'latest-notebook' }));
    workbenchPage.visit('test-project');
    workbenchPage.getNotebookRow('Latest Notebook').findNotebookImageLabel().click();
    cy.contains('Latest image version');
  });

  it('Shows popover with version details', () => {
    initIntercepts({});
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'latest-notebook' })]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'latest-notebook' }));
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Latest Notebook');
    notebookRow.findNotebookImageVersionLink().click();
    const popover = notebookRow.findNotebookImageVersionPopover();
    popover.findImageVersionName().contains('Version: 2024.2');
    popover.findImageVersionBuildCommit().contains('Build Commit: 12345');
    popover.findImageVersionBuildDate().contains('Build Date: 6/30/2023, 3:07:36 PM UTC');
    popover.findImageVersionSoftware().contains('Software: Python v3.8');
  });

  it('Shows deprecated image label for commit mismatch', () => {
    initIntercepts({});
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([
        mockPVCK8sResource({ name: 'mismatch-commit-notebook' }),
        mockPVCK8sResource({ name: 'mismatch-commit-byon-notebook' }),
      ]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'mismatch-commit-notebook' }));
    workbenchPage.visit('test-project');
    workbenchPage.getNotebookRow('BYON Notebook').findNotebookImageLabel().should('not.exist');
    workbenchPage.getNotebookRow('Deprecated Notebook').findNotebookImageLabel().click();
    cy.contains('Notebook image deprecated');
  });

  it('Shows deleted image label when last image selection tag is missing', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          name: 'deleted-image-popover',
          displayName: 'Deleted Image Popover',
          image: 'nonexistent-image:0.0',
          lastImageSelection: 'nonexistent-image:0.0',
          opts: {
            metadata: {
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Deleted image',
              },
            },
          },
        }),
      ],
    });
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'deleted-image-popover' })]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'deleted-image-popover' }));
    workbenchPage.visit('test-project');
    workbenchPage.getNotebookRow('Deleted Image Popover').findNotebookImageLabel().click();
    cy.contains('Notebook image deleted');
  });

  it('Display project-scoped label for a notebook in workbenches table', () => {
    initIntercepts({
      disableProjectScoped: false,
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          workbenchImageNamespace: 'test-project',
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

    cy.interceptK8sList(
      ImageStreamModel,
      mockK8sResourceList([
        mockImageStreamK8sResource({
          namespace: 'test-project',
        }),
      ]),
    );
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
    notebookRow.find().findByText('Test Image').should('exist');
    notebookRow.findProjectScopedLabel().should('exist');
    notebookRow.shouldHaveHardwareProfile('Small');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Ready');
    notebookRow.findNotebookRouteLink().should('not.have.attr', 'aria-disabled');
  });
});
