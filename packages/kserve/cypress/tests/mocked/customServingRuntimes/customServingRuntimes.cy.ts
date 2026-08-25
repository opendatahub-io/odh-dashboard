import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimePlatform,
} from '@odh-dashboard/model-serving/shared';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { servingRuntimeTemplates } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/servingRuntimeTemplates';
import { deleteModal } from '@odh-dashboard/cypress/cypress/pages/components/DeleteModal';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { pageNotfound } from '@odh-dashboard/cypress/cypress/pages/pageNotFound';
import { TemplateModel } from '@odh-dashboard/cypress/cypress/utils/models';
import { customServingRuntimesIntercept } from './customServingRuntimesUtils';

const editfilePath =
  './cypress/fixtures/resources/modelServing/mock-custom-serving-runtime-edit.yaml';

it('Custom servingruntimes should not be available for non product admins', () => {
  asProjectAdminUser();
  servingRuntimeTemplates.visit(false);
  pageNotfound.findPage().should('exist');
  servingRuntimeTemplates.findNavItem().should('not.exist');
});

describe('Custom serving runtimes', () => {
  beforeEach(() => {
    asProductAdminUser();
    customServingRuntimesIntercept();

    servingRuntimeTemplates.visit();
  });

  it('should display serving runtime version label', () => {
    servingRuntimeTemplates
      .getRowById('template-1')
      .findServingRuntimeVersionLabel()
      .should('exist');
    servingRuntimeTemplates
      .getRowById('template-2')
      .findServingRuntimeVersionLabel()
      .should('exist');
  });

  it('should test pre-installed label', () => {
    servingRuntimeTemplates.getRowById('template-1').shouldHavePreInstalledLabel(false);
    servingRuntimeTemplates
      .getRowById('template-1')
      .find()
      .findKebabAction('Delete')
      .should('exist');
    servingRuntimeTemplates.getRowById('template-1').find().findKebabAction('Edit').should('exist');
    servingRuntimeTemplates
      .getRowById('template-1')
      .find()
      .findKebabAction('Duplicate')
      .should('exist');
  });

  it('should display api protocol in table row', () => {
    servingRuntimeTemplates
      .getRowById('template-1')
      .shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.GRPC);
    servingRuntimeTemplates
      .getRowById('template-2')
      .shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.REST);
  });

  it('should return to the serving runtime templates list on cancel from add', () => {
    servingRuntimeTemplates.findAddButton().click();
    servingRuntimeTemplates.findAppTitle().should('contain', 'Add serving runtime');
    servingRuntimeTemplates.findCancelButton().click();
    // Back on the templates tab, not General settings.
    cy.url().should(
      'include',
      '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates',
    );
    servingRuntimeTemplates.getRowById('template-1').find().should('exist');
  });

  it('should add a new single model serving runtime', () => {
    cy.interceptOdh(
      'POST /api/servingRuntimes/',
      { query: { dryRun: 'All' } },
      mockServingRuntimeK8sResource({}),
    ).as('createSingleModelServingRuntime');
    cy.interceptOdh('POST /api/templates/', mockServingRuntimeTemplateK8sResource({})).as(
      'createTemplate',
    );

    servingRuntimeTemplates.findAddButton().click();
    servingRuntimeTemplates.findAppTitle().should('contain', 'Add serving runtime');

    servingRuntimeTemplates.findSubmitButton().should('be.disabled');
    servingRuntimeTemplates.shouldDisplayAPIProtocolValues([
      ServingRuntimeAPIProtocol.REST,
      ServingRuntimeAPIProtocol.GRPC,
    ]);
    servingRuntimeTemplates.selectAPIProtocol(ServingRuntimeAPIProtocol.REST);
    servingRuntimeTemplates.findSelectModelTypeButton().click();
    servingRuntimeTemplates.selectModelType('Predictive model');

    // Drive Monaco via the model-backed setValue (Buffer to hidden file input) —
    // not startFromScratch + fixture upload + DOM .view-lines assertion, which was
    // the flaky path. Gate readiness on the submit button enabling.
    servingRuntimeTemplates.getDashboardCodeEditor()
      .setValue(`apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: template-new
  annotations:
    openshift.io/display-name: New OVMS Server
spec:
  supportedModelFormats:
    - autoSelect: true
      name: openvino_ir
      version: opset1
  containers:
    - name: ovms
      image: quay.io/opendatahub/openvino_model_server:latest`);

    servingRuntimeTemplates.findSubmitButton().should('be.enabled').click();

    cy.wait('@createSingleModelServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'template-new',
          annotations: { 'openshift.io/display-name': 'New OVMS Server' },
          namespace: 'opendatahub',
        },
      });
    });
    cy.wait('@createTemplate').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'opendatahub.io/modelServingSupport': '["single"]',
            'opendatahub.io/apiProtocol': 'REST',
          },
        },
      });
    });

    // Returned to the templates tab; wait for the list to mount/subscribe before
    // pushing the websocket event so the new row is not missed.
    cy.findByTestId('app-tab-page-title').should('contain', 'Model deployment settings');
    servingRuntimeTemplates.getRowById('template-1').find().should('exist');

    cy.wsK8s(
      'ADDED',
      TemplateModel,
      mockServingRuntimeTemplateK8sResource({
        name: 'template-new',
        displayName: 'New OVMS Server',
        platforms: [ServingRuntimePlatform.SINGLE],
        apiProtocol: ServingRuntimeAPIProtocol.REST,
      }),
    );

    servingRuntimeTemplates.getRowById('template-new').find().should('exist');
  });

  it('should duplicate a serving runtime', () => {
    cy.interceptOdh(
      'POST /api/servingRuntimes/',
      { query: { dryRun: 'All' } },
      mockServingRuntimeK8sResource({}),
    ).as('duplicateServingRuntime');

    cy.interceptOdh('POST /api/templates/', mockServingRuntimeTemplateK8sResource({})).as(
      'duplicateTemplate',
    );

    servingRuntimeTemplates.getRowById('template-1').find().findKebabAction('Duplicate').click();
    servingRuntimeTemplates.findAppTitle().should('have.text', 'Duplicate serving runtime');
    cy.url().should('include', '/serving-runtime-templates/duplicate/template-1');

    servingRuntimeTemplates.shouldDisplayAPIProtocolValues([
      ServingRuntimeAPIProtocol.REST,
      ServingRuntimeAPIProtocol.GRPC,
    ]);
    servingRuntimeTemplates.selectAPIProtocol(ServingRuntimeAPIProtocol.GRPC);
    servingRuntimeTemplates.findSubmitButton().should('be.enabled');
    servingRuntimeTemplates.findSubmitButton().click();

    cy.wait('@duplicateServingRuntime').then((interception) => {
      expect(interception.request.body.metadata).to.containSubset({
        name: 'template-1-copy',
        annotations: { 'openshift.io/display-name': 'Copy of Caikit' },
        namespace: 'opendatahub',
      });
    });

    cy.wait('@duplicateTemplate').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'opendatahub.io/modelServingSupport': '["single"]',
            'opendatahub.io/apiProtocol': 'gRPC',
          },
        },
        objects: [
          {
            metadata: {
              name: 'template-1-copy',
              annotations: { 'openshift.io/display-name': 'Copy of Caikit' },
            },
          },
        ],
      });
    });

    // After submitting, we return to the serving-runtime-templates list, which is now a
    // tab on the Model deployment settings page — so the visible title is the tabbed
    // page shell's, not a standalone "Serving runtimes" page title.
    cy.findByTestId('app-tab-page-title').should('contain', 'Model deployment settings');
    // Wait for the templates list itself to finish mounting after the navigation before
    // pushing the websocket ADDED event — otherwise the event can fire before the list
    // has subscribed and the new row is missed.
    servingRuntimeTemplates.getRowById('template-1').find().should('exist');

    cy.wsK8s(
      'ADDED',
      TemplateModel,
      mockServingRuntimeTemplateK8sResource({
        name: 'template-1-copy',
        displayName: 'Copy of Caikit',
        platforms: [ServingRuntimePlatform.SINGLE],
        apiProtocol: ServingRuntimeAPIProtocol.GRPC,
      }),
    );

    servingRuntimeTemplates.getRowById('template-1-copy').find().should('exist');
    servingRuntimeTemplates
      .getRowById('template-1-copy')
      .shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.GRPC);
  });

  it('should edit a serving runtime', () => {
    cy.interceptOdh(
      'POST /api/servingRuntimes/',
      { query: { dryRun: 'All' } },
      mockServingRuntimeK8sResource({}),
    ).as('editServingRuntime');
    cy.interceptOdh(
      'PATCH /api/templates/:namespace/:name',
      { path: { namespace: 'opendatahub', name: 'template-1' } },
      mockServingRuntimeTemplateK8sResource({}),
    ).as('editTemplate');

    servingRuntimeTemplates.getRowById('template-1').find().findKebabAction('Edit').click();
    servingRuntimeTemplates.findAppTitle().should('contain', 'Edit Caikit');
    cy.url().should('include', '/serving-runtime-templates/edit/template-1');
    servingRuntimeTemplates.findSubmitButton().should('be.disabled');
    servingRuntimeTemplates.uploadYaml(editfilePath);
    servingRuntimeTemplates.findSubmitButton().click();

    cy.wait('@editServingRuntime').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'template-1',
          annotations: { 'openshift.io/display-name': 'Updated Caikit' },
        },
      });
    });

    cy.wait('@editTemplate').then((interception) => {
      expect(interception.request.body).to.containSubset([
        {
          value: {
            metadata: {
              name: 'template-1',
              annotations: { 'openshift.io/display-name': 'Updated Caikit' },
            },
          },
        },
        {
          op: 'replace',
          path: '/metadata/annotations/opendatahub.io~1model-type',
          value: '["predictive"]',
        },
        {
          op: 'replace',
          path: '/metadata/annotations/opendatahub.io~1apiProtocol',
          value: 'gRPC',
        },
      ]);
    });
  });

  it('delete serving runtime', () => {
    cy.interceptOdh(
      'DELETE /api/templates/:namespace/:name',
      { path: { namespace: 'opendatahub', name: 'template-1' } },
      mockServingRuntimeTemplateK8sResource({}),
    ).as('deleteServingRuntime');

    servingRuntimeTemplates.getRowById('template-1').find().findKebabAction('Delete').click();
    deleteModal.findSubmitButton().should('be.disabled');

    // test delete form is enabled after filling out required fields
    deleteModal.findInput().type('Caikit');
    deleteModal.findSubmitButton().should('be.enabled').click();

    cy.wait('@deleteServingRuntime');
    cy.wsK8s(
      'DELETED',
      TemplateModel,
      mockServingRuntimeTemplateK8sResource({
        name: 'template-1',
        displayName: 'Caikit',
        platforms: [ServingRuntimePlatform.SINGLE],
        apiProtocol: ServingRuntimeAPIProtocol.REST,
      }),
    );
    servingRuntimeTemplates.getRowById('template-1').find().should('not.exist');
  });

  describe('redirect from old standalone routes to the tab', () => {
    // Both `/servingRuntimes/*` and the removed standalone
    // `/settings/model-resources-operations/serving-runtimes/*` now redirect straight
    // to the serving-runtime-templates tab on the Model deployment settings page. The
    // redirect lands on the tabbed page shell, so the visible title is the shell's
    // ("Model deployment settings"), not a tab-specific title.
    it('root (legacy /servingRuntimes URL)', () => {
      cy.visitWithLogin('/servingRuntimes');
      cy.findByTestId('app-tab-page-title').contains('Model deployment settings');
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates',
      );
    });

    it('root (removed standalone URL)', () => {
      cy.visitWithLogin('/settings/model-resources-operations/serving-runtimes');
      cy.findByTestId('app-tab-page-title').contains('Model deployment settings');
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates',
      );
    });

    // The pre-migration standalone routes (`CustomServingRuntimeRoutes.tsx` +
    // `v2Redirects.ts`, both since removed) used to translate these two
    // legacy sub-path aliases via a nested router before landing on the add/edit form.
    // That mapping is now restored as two dedicated `app.route` redirects in
    // `packages/model-serving/extensions/odh.ts`, registered more specifically than
    // the general `/servingRuntimes/*` redirect above so they win.
    it('add', () => {
      cy.visitWithLogin('/servingRuntimes/addServingRuntime');
      cy.findByTestId('app-page-title').contains('Add serving runtime');
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates/add',
      );
    });

    it('edit', () => {
      cy.visitWithLogin('/servingRuntimes/editServingRuntime/template-1');
      cy.findByTestId('app-page-title').contains('Edit Caikit');
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates/edit/template-1',
      );
    });
  });
});
