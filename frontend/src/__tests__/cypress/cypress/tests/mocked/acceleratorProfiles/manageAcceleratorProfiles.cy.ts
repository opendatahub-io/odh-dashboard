import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import {
  editTolerationModal,
  createAcceleratorProfile,
  createTolerationModal,
  editAcceleratorProfile,
  identifierAcceleratorProfile,
} from '~/__tests__/cypress/cypress/pages/acceleratorProfile';
import { TolerationEffect, TolerationOperator } from '~/types';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { AcceleratorProfileModel } from '~/__tests__/cypress/cypress/utils/models';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/users';

type HandlersProps = {
  isPresent?: boolean;
};

const initIntercepts = ({ isPresent = true }: HandlersProps) => {
  cy.interceptK8s(
    { model: AcceleratorProfileModel, ns: 'opendatahub', name: 'test-accelerator' },
    isPresent
      ? mockAcceleratorProfile({
          namespace: 'opendatahub',
          name: 'test-accelerator',
          displayName: 'Test Accelerator',
          description: 'Test description',
          identifier: 'nvidia.com/gpu',
          tolerations: [
            {
              key: 'nvidia.com/gpu',
              operator: TolerationOperator.EXISTS,
              effect: TolerationEffect.NO_SCHEDULE,
            },
          ],
        })
      : {
          statusCode: 404,
        },
  );
};

describe('Manage Accelerator Profile', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('create accelerator profile', () => {
    initIntercepts({});
    createAcceleratorProfile.visit();
    createAcceleratorProfile.findSubmitButton().should('be.disabled');

    // test required fields
    createAcceleratorProfile.findAcceleratorNameInput().fill('test-accelerator');
    createAcceleratorProfile.findSubmitButton().should('be.disabled');
    createAcceleratorProfile.findIdentifierInput().fill('nvidia.com/gpu');
    createAcceleratorProfile.findSubmitButton().should('be.enabled');

    // test tolerations
    createAcceleratorProfile.shouldHaveModalEmptyState();

    //open modal
    createAcceleratorProfile.findTolerationsButton().click();

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
    createAcceleratorProfile
      .getRow('test-key')
      .shouldHaveOperator('Equal')
      .shouldHaveEffect('NoExecute')
      .shouldHaveTolerationSeconds('1 seconds(s)');

    // test bare minimum fields
    createAcceleratorProfile.findTolerationsButton().click();
    createTolerationModal.findTolerationKeyInput().fill('toleration-key');
    createTolerationModal.findTolerationSubmitButton().click();
    createAcceleratorProfile
      .getRow('toleration-key')
      .shouldHaveOperator('Equal')
      .shouldHaveEffect('-')
      .shouldHaveTolerationSeconds('-');

    // test edit toleration
    let tableRow = createAcceleratorProfile.getRow('test-key');
    tableRow.findKebabAction('Edit').click();
    editTolerationModal.findTolerationKeyInput().fill('test-update');
    editTolerationModal.findCancelButton().click();
    createAcceleratorProfile.getRow('test-key');
    tableRow.findKebabAction('Edit').click();
    editTolerationModal.findTolerationKeyInput().fill('updated-test');
    editTolerationModal.findTolerationSubmitButton().click();
    tableRow = createAcceleratorProfile.getRow('updated-test');
    tableRow.shouldHaveOperator('Equal');

    // test cancel clears fields
    tableRow.findKebabAction('Edit').click();
    editTolerationModal.findCancelButton().click();
    createAcceleratorProfile.findTolerationsButton().click();
    createTolerationModal.findTolerationSubmitButton().should('be.disabled');
    createTolerationModal.findCancelButton().click();

    // test delete
    tableRow.findKebabAction('Delete').click();
    createAcceleratorProfile.getRow('toleration-key').findKebabAction('Delete').click();
    createAcceleratorProfile.shouldHaveModalEmptyState();
    cy.interceptOdh('POST /api/accelerator-profiles', { success: true }).as('createAccelerator');
    createAcceleratorProfile.findSubmitButton().click();

    cy.wait('@createAccelerator').then((interception) => {
      expect(interception.request.body).to.be.eql({
        displayName: 'test-accelerator',
        identifier: 'nvidia.com/gpu',
        enabled: true,
        tolerations: [],
      });
    });
  });

  it('edit page has expected values', () => {
    initIntercepts({});
    editAcceleratorProfile.visit('test-accelerator');
    editAcceleratorProfile.findAcceleratorNameInput().should('have.value', 'Test Accelerator');
    editAcceleratorProfile.findIdentifierInput().should('have.value', 'nvidia.com/gpu');
    editAcceleratorProfile.findDescriptionInput().should('have.value', 'Test description');
    editAcceleratorProfile
      .getRow('nvidia.com/gpu')
      .shouldHaveEffect('NoSchedule')
      .shouldHaveOperator('Exists')
      .shouldHaveTolerationSeconds('-');

    //update the description
    cy.interceptOdh(
      'PUT /api/accelerator-profiles/:name',
      { path: { name: 'test-accelerator' } },
      { success: true },
    ).as('updatedAccelerator');
    editAcceleratorProfile.findDescriptionInput().fill('Updated description');
    editAcceleratorProfile.findSubmitButton().click();
    cy.wait('@updatedAccelerator').then((interception) => {
      expect(interception.request.body).to.eql({
        displayName: 'Test Accelerator',
        identifier: 'nvidia.com/gpu',
        enabled: true,
        tolerations: [{ key: 'nvidia.com/gpu', operator: 'Exists', effect: 'NoSchedule' }],
        description: 'Updated description',
      });
    });
  });

  it('invalid id in edit page', () => {
    initIntercepts({ isPresent: false });
    editAcceleratorProfile.visit('test-accelerator');
    editAcceleratorProfile.findErrorText().should('exist');
    cy.interceptK8sList(
      AcceleratorProfileModel,
      mockK8sResourceList([mockAcceleratorProfile({ namespace: 'opendatahub', uid: 'test-12' })]),
    ).as('listAcceleratorProfiles');
    editAcceleratorProfile.findViewAllAcceleratorButton().click();
    cy.wait('@listAcceleratorProfiles');
  });

  it('one preset identifier is auto filled and disabled', () => {
    initIntercepts({});
    identifierAcceleratorProfile.visit();
    identifierAcceleratorProfile.findIdentifierInput().should('have.value', 'test-identifier');
    identifierAcceleratorProfile.findIdentifierInput().should('be.disabled');
  });

  it('multiple preset identifiers show dropdown', () => {
    initIntercepts({});
    identifierAcceleratorProfile.visit(true);
    identifierAcceleratorProfile
      .findAcceleratorIdentifierSelect()
      .findSelectOption('test-identifier')
      .should('exist');
  });
});
