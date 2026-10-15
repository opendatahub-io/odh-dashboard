import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mock403Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { SecretModel } from '@odh-dashboard/k8s-core/api/models';
import { projectName, initIntercepts } from './pipelinesTestUtils';
import { pipelinesGlobal, configurePipelineServerModal } from '../../../pages/pipelines';
import { DataSciencePipelineApplicationModel } from '../../../utils/models';
import { captureTracking, expectSafeTracking } from '../../../utils/analytics';

describe('Pipeline server failure tracking', () => {
  ['credentials', 'resource'].forEach((failureStage) => {
    it(`should keep ${failureStage} configuration diagnostics out of telemetry`, () => {
      const message = `Private pipeline ${failureStage} diagnostic 95482`;
      initIntercepts({ isEmpty: true });
      cy.interceptK8sList(
        { model: SecretModel, ns: projectName },
        mockK8sResourceList([
          mockSecretK8sResource({ s3Bucket: 'c2RzZA==', namespace: projectName }),
        ]),
      );
      cy.interceptK8s(
        'POST',
        { model: SecretModel, ns: projectName },
        failureStage === 'credentials'
          ? { statusCode: 403, body: mock403Error({ message }) }
          : mockSecretK8sResource({ namespace: projectName }),
      );
      cy.interceptK8s(
        'POST',
        { model: DataSciencePipelineApplicationModel, ns: projectName },
        {
          statusCode: 403,
          body: mock403Error({ message }),
        },
      );
      // Resource-create failures clean up the external database secret.
      cy.interceptK8s(
        'DELETE',
        { model: SecretModel, ns: projectName, name: 'pipelines-db-password' },
        mockSecretK8sResource({ namespace: projectName, name: 'pipelines-db-password' }),
      );
      pipelinesGlobal.visit(projectName);
      pipelinesGlobal.findConfigurePipelineServerButton().click();
      configurePipelineServerModal.selectViableConnection('Test Secret •••••••••••••••••');
      captureTracking();
      configurePipelineServerModal.findSubmitButton().click();
      configurePipelineServerModal.find().should('contain.text', message);
      expectSafeTracking(
        'Pipeline Server Configured',
        { success: false, error: 'k8s_403' },
        message,
      );
    });
  });
});
