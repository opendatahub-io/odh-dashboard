import React from 'react';
import { render } from '@testing-library/react';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import { ModelServerTemplateSelectField } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY } from '../../deploymentMethodField';
import { KServeServingRuntimeFieldWizardField } from '../KServeServingRuntimeField';

jest.mock('@odh-dashboard/model-serving/shared/wizard-fields', () => ({
  ...jest.requireActual('@odh-dashboard/model-serving/shared/wizard-fields'),
  ModelServerTemplateSelectField: jest.fn(() => null),
}));

const mockModelServerTemplateSelectField = jest.mocked(ModelServerTemplateSelectField);
const KServeServingRuntimeField = KServeServingRuntimeFieldWizardField.component;

describe('KServeServingRuntimeField', () => {
  it.each([ServingRuntimeModelType.PREDICTIVE, ServingRuntimeModelType.GENERATIVE])(
    'should render with the host namespace for a %s model without main dashboard Redux',
    (modelType) => {
      const dashboardNamespace = 'custom-dashboard';
      const globalTemplate = mockServingRuntimeTemplateK8sResource({
        name: 'global-runtime',
        namespace: dashboardNamespace,
      });
      const projectTemplate = mockServingRuntimeTemplateK8sResource({
        name: 'project-runtime',
        namespace: 'my-project',
      });

      expect(
        KServeServingRuntimeFieldWizardField.isActive({
          modelType: { data: { type: modelType } },
          deploymentMethod: { method: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY },
        }),
      ).toBe(true);

      render(
        <HostApiCoreContext.Provider
          value={{
            dashboardNamespace,
            checkAccess: jest.fn(),
            trackEvent: jest.fn(),
            fetchDashboardConfig: jest.fn(),
            fetchClusterSettings: jest.fn(),
            updateClusterSettings: jest.fn(),
          }}
        >
          <KServeServingRuntimeField
            id="kserve/modelServer"
            onChange={jest.fn()}
            dependencies={{
              modelServerTemplates: [globalTemplate, projectTemplate],
              modelType: { type: modelType },
              deploymentMethod: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
            }}
            externalData={{
              data: { extraOptions: [] },
              loaded: true,
            }}
          />
        </HostApiCoreContext.Provider>,
      );

      expect(mockModelServerTemplateSelectField).toHaveBeenLastCalledWith(
        expect.objectContaining({
          modelServerState: expect.objectContaining({
            options: expect.arrayContaining([
              expect.objectContaining({ name: 'global-runtime', scope: 'global' }),
              expect.objectContaining({ name: 'project-runtime', scope: 'project' }),
            ]),
          }),
        }),
        expect.anything(),
      );
    },
  );
});
