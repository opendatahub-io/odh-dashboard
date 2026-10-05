import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { initIntercepts } from './infrastructureMocks';

import { ProjectModel } from '../../../utils/models';
import { asProjectAdminUser } from '../../../utils/mockUsers';
import { infrastructurePage } from '../../../pages/infrastructure';

describe('GPUaaS Workloads project selector', () => {
  it('should update the selected project', () => {
    asProjectAdminUser();
    initIntercepts();
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([
        mockProjectK8sResource({ k8sName: 'project-a', displayName: 'Project-A' }),
        mockProjectK8sResource({ k8sName: 'project-b', displayName: 'Project-B' }),
      ]),
    );

    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();

    infrastructurePage.selectProjectByName('Project-B');

    infrastructurePage.findProjectSelectorToggle().should('contain.text', 'Project-B');
  });
});
