import { TolerationEffect, TolerationOperator } from '~/types';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { HardwareProfileModel } from '~/__tests__/cypress/cypress/utils/models';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import {
  createHardwareProfile,
  createNodeSelectorModal,
  createTolerationModal,
  duplicateHardwareProfile,
  editHardwareProfile,
  editNodeSelectorModal,
  editTolerationModal,
} from '~/__tests__/cypress/cypress/pages/hardwareProfile';

type HandlersProps = {
  isPresent?: boolean;
};

const initIntercepts = ({ isPresent = true }: HandlersProps) => {
  cy.interceptK8s(
    { model: HardwareProfileModel, ns: 'opendatahub', name: 'test-hardware-profile' },
    isPresent
      ? mockHardwareProfile({
          namespace: 'opendatahub',
          name: 'test-hardware-profile',
          displayName: 'Test Hardware Profile',
          description: 'Test description',
          identifiers: [
            {
              identifier: 'nvidia.com/gpu',
              displayName: 'GPU',
              maxCount: 2,
              minCount: 1,
              defaultCount: 1,
            },
          ],
          tolerations: [
            {
              key: 'nvidia.com/gpu',
              operator: TolerationOperator.EXISTS,
              effect: TolerationEffect.NO_SCHEDULE,
            },
          ],
          nodeSelectors: [{ key: 'test-key', value: 'test-value' }],
        })
      : {
          statusCode: 404,
        },
  );
};

describe('Manage Hardware Profile', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('create hardware profile', () => {
    initIntercepts({});
    createHardwareProfile.visit();
    createHardwareProfile.findSubmitButton().should('be.disabled');

    // test required fields
    createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill('test-hardware-profile');
    createHardwareProfile.findSubmitButton().should('be.enabled');

    // test resource name validation
    createHardwareProfile.k8sNameDescription.findResourceEditLink().click();
    createHardwareProfile.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'false');
    createHardwareProfile.k8sNameDescription
      .findResourceNameInput()
      .should('have.value', 'test-hardware-profile');
    // Invalid character k8s names fail
    createHardwareProfile.k8sNameDescription.findResourceNameInput().clear().type('InVaLiD vAlUe!');
    createHardwareProfile.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    createHardwareProfile.findSubmitButton().should('be.disabled');
    createHardwareProfile.k8sNameDescription
      .findResourceNameInput()
      .clear()
      .type('test-hardware-profile-name');
    createHardwareProfile.findSubmitButton().should('be.enabled');

    /* TODO: Add tests for identifiers table */

    // test tolerations empty state
    createHardwareProfile.findTolerationTable().should('not.exist');

    //open toleration modal
    createHardwareProfile.findAddTolerationButton().click();

    // fill in form required fields
    createTolerationModal.findTolerationSubmitButton().should('be.disabled');
    createTolerationModal.findTolerationKeyInput().fill('test-key');
    createTolerationModal.findTolerationSubmitButton().should('be.enabled');

    // test value info warning when operator is Exists
    createTolerationModal.findOperatorOptionExist().click();

    createTolerationModal.findTolerationValueInput().fill('test-value');
    createTolerationModal.findTolerationValueAlert().should('exist');
    createTolerationModal.findOperatorOptionEqual().click();
    createTolerationModal.findTolerationValueAlert().should('not.exist');

    // test toleration seconds warning when effect is not NoExecute
    createTolerationModal.findTolerationSecondRadioCustom().click();
    createTolerationModal.findTolerationSecondAlert().should('exist');
    createTolerationModal.findEffectOptionNoExecute().click();
    createTolerationModal.findTolerationSecondAlert().should('not.exist');
    createTolerationModal.findPlusButton().click();
    createTolerationModal.findTolerationSubmitButton().click();

    // test that values were added correctly
    createHardwareProfile
      .getTolerationTableRow('test-key')
      .shouldHaveOperator('Equal')
      .shouldHaveEffect('NoExecute')
      .shouldHaveTolerationSeconds('1 second(s)');

    // test bare minimum fields
    createHardwareProfile.findAddTolerationButton().click();
    createTolerationModal.findTolerationKeyInput().fill('toleration-key');
    createTolerationModal.findTolerationSubmitButton().click();
    createHardwareProfile
      .getTolerationTableRow('toleration-key')
      .shouldHaveOperator('Equal')
      .shouldHaveEffect('-')
      .shouldHaveTolerationSeconds('-');

    // test edit toleration
    let tolerationTableRow = createHardwareProfile.getTolerationTableRow('test-key');
    tolerationTableRow.findEditAction().click();
    editTolerationModal.findTolerationKeyInput().fill('test-update');
    editTolerationModal.findCancelButton().click();
    tolerationTableRow = createHardwareProfile.getTolerationTableRow('test-key');
    tolerationTableRow.findEditAction().click();
    editTolerationModal.findTolerationKeyInput().fill('updated-test');
    editTolerationModal.findTolerationSubmitButton().click();
    tolerationTableRow = createHardwareProfile.getTolerationTableRow('updated-test');
    tolerationTableRow.shouldHaveOperator('Equal');

    // test cancel clears fields
    tolerationTableRow.findEditAction().click();
    editTolerationModal.findCancelButton().click();
    createHardwareProfile.findAddTolerationButton().click();
    createTolerationModal.findTolerationSubmitButton().should('be.disabled');
    createTolerationModal.findCancelButton().click();

    // test delete
    tolerationTableRow.findDeleteAction().click();
    createHardwareProfile.getTolerationTableRow('toleration-key').findDeleteAction().click();
    createHardwareProfile.findTolerationTable().should('not.exist');

    // test node selectors empty state
    createHardwareProfile.findNodeSelectorTable().should('not.exist');

    //open node selector modal
    createHardwareProfile.findAddNodeSelectorButton().click();

    // fill in form required fields
    createNodeSelectorModal.findNodeSelectorSubmitButton().should('be.disabled');
    createNodeSelectorModal.findNodeSelectorKeyInput().fill('test-key');
    createNodeSelectorModal.findNodeSelectorSubmitButton().should('be.disabled');
    createNodeSelectorModal.findNodeSelectorValueInput().fill('test-value');
    createNodeSelectorModal.findNodeSelectorSubmitButton().should('be.enabled');
    createNodeSelectorModal.findNodeSelectorSubmitButton().click();

    // test that values were added correctly
    createHardwareProfile
      .getNodeSelectorTableRow('test-key')
      .shouldHaveKey('test-key')
      .shouldHaveValue('test-value');

    // test edit toleration
    let nodeSelectorTableRow = createHardwareProfile.getNodeSelectorTableRow('test-key');
    nodeSelectorTableRow.findEditAction().click();
    editNodeSelectorModal.findNodeSelectorKeyInput().fill('test-update');
    editNodeSelectorModal.findCancelButton().click();
    nodeSelectorTableRow.findEditAction().click();
    editNodeSelectorModal.findNodeSelectorKeyInput().fill('test-update');
    editNodeSelectorModal.findNodeSelectorSubmitButton().click();
    nodeSelectorTableRow = createHardwareProfile.getNodeSelectorTableRow('test-update');
    nodeSelectorTableRow.shouldHaveValue('test-value');

    // test cancel clears fields
    nodeSelectorTableRow.findEditAction().click();
    editNodeSelectorModal.findCancelButton().click();
    createHardwareProfile.findAddNodeSelectorButton().click();
    createNodeSelectorModal.findNodeSelectorSubmitButton().should('be.disabled');
    createNodeSelectorModal.findCancelButton().click();

    // add another field
    createHardwareProfile.findAddNodeSelectorButton().click();
    createNodeSelectorModal.findNodeSelectorKeyInput().fill('new-test-node-selector');
    createNodeSelectorModal.findNodeSelectorValueInput().fill('new-test-value');
    createNodeSelectorModal.findNodeSelectorSubmitButton().click();

    // delete the previous one
    nodeSelectorTableRow.findDeleteAction().click();

    cy.interceptK8s(
      'POST',
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'test-hardware-profile',
      },
      mockHardwareProfile({ name: 'test-hardware-profile', namespace: 'opendatahub' }),
    ).as('createHardwareProfile');
    createHardwareProfile.findSubmitButton().click();

    cy.wait('@createHardwareProfile').then((interception) => {
      expect(interception.request.body.spec.tolerations).to.be.eql([]);
      expect(interception.request.body.spec.nodeSelectors).to.be.eql([
        { key: 'new-test-node-selector', value: 'new-test-value' },
      ]);
    });
  });

  it('edit page has expected values', () => {
    initIntercepts({});
    //update the description intercept
    cy.interceptK8s(
      'PUT',
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'test-hardware-profile',
      },
      mockHardwareProfile({
        name: 'test-hardware-profile',
        namespace: 'opendatahub',
        description: 'Updated description',
      }),
    ).as('updatedHardwareProfile');
    editHardwareProfile.visit('test-hardware-profile');
    editHardwareProfile.k8sNameDescription
      .findDisplayNameInput()
      .should('have.value', 'Test Hardware Profile');
    editHardwareProfile.k8sNameDescription
      .findDescriptionInput()
      .should('have.value', 'Test description');

    editHardwareProfile.findTolerationTable().should('exist');
    editHardwareProfile
      .getTolerationTableRow('nvidia.com/gpu')
      .shouldHaveEffect('NoSchedule')
      .shouldHaveOperator('Exists')
      .shouldHaveTolerationSeconds('-');

    editHardwareProfile.findNodeSelectorTable().should('exist');
    editHardwareProfile
      .getNodeSelectorTableRow('test-key')
      .shouldHaveValue('test-value')
      .findDeleteAction()
      .click();

    editHardwareProfile.k8sNameDescription.findDescriptionInput().fill('Updated description');
    editHardwareProfile.findSubmitButton().click();
    cy.wait('@updatedHardwareProfile').then((interception) => {
      expect(interception.request.body.spec).to.eql({
        identifiers: [
          {
            identifier: 'nvidia.com/gpu',
            displayName: 'GPU',
            maxCount: 2,
            minCount: 1,
            defaultCount: 1,
          },
        ],
        displayName: 'Test Hardware Profile',
        enabled: true,
        tolerations: [
          {
            key: 'nvidia.com/gpu',
            operator: 'Exists',
            effect: 'NoSchedule',
          },
        ],
        nodeSelectors: [],
        description: 'Updated description',
      });
    });
  });

  it('duplicate page has expected values', () => {
    initIntercepts({});
    cy.interceptK8s(
      'POST',
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'duplicate-hardware-profile',
      },
      mockHardwareProfile({
        name: 'duplicate-hardware-profile',
        namespace: 'opendatahub',
        description: 'Updated description',
      }),
    ).as('createHardwareProfile');
    duplicateHardwareProfile.visit('test-hardware-profile');
    duplicateHardwareProfile.findSubmitButton().should('be.disabled');
    duplicateHardwareProfile.k8sNameDescription.findDisplayNameInput().should('have.value', '');
    duplicateHardwareProfile.k8sNameDescription.findDescriptionInput().should('have.value', '');

    duplicateHardwareProfile.findTolerationTable().should('exist');
    duplicateHardwareProfile
      .getTolerationTableRow('nvidia.com/gpu')
      .shouldHaveEffect('NoSchedule')
      .shouldHaveOperator('Exists')
      .shouldHaveTolerationSeconds('-');

    duplicateHardwareProfile.findNodeSelectorTable().should('exist');
    duplicateHardwareProfile
      .getNodeSelectorTableRow('test-key')
      .shouldHaveValue('test-value')
      .findDeleteAction()
      .click();

    duplicateHardwareProfile.k8sNameDescription
      .findDisplayNameInput()
      .fill('duplicate hardware profile');
    duplicateHardwareProfile.findSubmitButton().should('be.enabled').click();
    cy.wait('@createHardwareProfile').then((interception) => {
      expect(interception.request.body.spec).to.eql({
        identifiers: [
          {
            identifier: 'nvidia.com/gpu',
            displayName: 'GPU',
            maxCount: 2,
            minCount: 1,
            defaultCount: 1,
          },
        ],
        displayName: 'duplicate hardware profile',
        enabled: true,
        tolerations: [
          {
            key: 'nvidia.com/gpu',
            operator: 'Exists',
            effect: 'NoSchedule',
          },
        ],
        nodeSelectors: [],
        description: '',
      });
    });
  });

  it('invalid id in edit page', () => {
    initIntercepts({ isPresent: false });
    editHardwareProfile.visit('test-hardware-profile');
    editHardwareProfile.findErrorText().should('exist');
    cy.interceptK8sList(
      HardwareProfileModel,
      mockK8sResourceList([mockHardwareProfile({ namespace: 'opendatahub', uid: 'test-12' })]),
    ).as('listHardwareProfiles');
    editHardwareProfile.findViewAllHardwareProfilesButton().click();
    cy.wait('@listHardwareProfiles');
  });

  it('invalid id in duplicate page', () => {
    initIntercepts({ isPresent: false });
    duplicateHardwareProfile.visit('test-hardware-profile');
    duplicateHardwareProfile.findErrorText().should('exist');
    cy.interceptK8sList(
      HardwareProfileModel,
      mockK8sResourceList([mockHardwareProfile({ namespace: 'opendatahub', uid: 'test-12' })]),
    ).as('listHardwareProfiles');
    duplicateHardwareProfile.findViewAllHardwareProfilesButton().click();
    cy.wait('@listHardwareProfiles');
  });
});
