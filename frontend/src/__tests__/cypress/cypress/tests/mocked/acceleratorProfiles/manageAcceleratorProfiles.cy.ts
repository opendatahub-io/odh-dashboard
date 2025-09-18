import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import {
  editTolerationModal,
  createAcceleratorProfile,
  createTolerationModal,
  editAcceleratorProfile,
  identifierAcceleratorProfile,
} from '#~/__tests__/cypress/cypress/pages/acceleratorProfile';
import { TolerationEffect, TolerationOperator } from '#~/types';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { AcceleratorProfileModel } from '#~/__tests__/cypress/cypress/utils/models';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';

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
    createAcceleratorProfile.k8sNameDescription.findDisplayNameInput().fill('test-accelerator');
    createAcceleratorProfile.findSubmitButton().should('be.disabled');
    createAcceleratorProfile.findIdentifierInput().fill('nvidia.com/gpu');
    createAcceleratorProfile.findSubmitButton().should('be.enabled');

    // test resource name validation
    createAcceleratorProfile.k8sNameDescription.findResourceEditLink().click();
    createAcceleratorProfile.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'false');
    createAcceleratorProfile.k8sNameDescription
      .findResourceNameInput()
      .should('have.value', 'test-accelerator');
    // Invalid character k8s names fail
    createAcceleratorProfile.k8sNameDescription
      .findResourceNameInput()
      .clear()
      .type('InVaLiD vAlUe!');
    createAcceleratorProfile.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    createAcceleratorProfile.findSubmitButton().should('be.disabled');
    createAcceleratorProfile.k8sNameDescription
      .findResourceNameInput()
      .clear()
      .type('test-accelerator-name');
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
    cy.interceptK8s(
      'POST',
      {
        model: AcceleratorProfileModel,
        name: 'test-accelerator-name',
        ns: 'opendatahub',
        times: 1,
      },
      mockAcceleratorProfile({
        name: 'test-accelerator-name',
        namespace: 'opendatahub',
      }),
    ).as('createAccelerator');

    createAcceleratorProfile.findSubmitButton().click();

    cy.wait('@createAccelerator');
  });

  it('edit page has expected values', () => {
    initIntercepts({});
    editAcceleratorProfile.visit('test-accelerator');

    // Wait for form to be populated with accelerator profile data
    editAcceleratorProfile.k8sNameDescription
      .findDisplayNameInput()
      .should('have.value', 'Test Accelerator');
    editAcceleratorProfile.findIdentifierInput().should('have.value', 'nvidia.com/gpu');
    editAcceleratorProfile.k8sNameDescription
      .findDescriptionInput()
      .should('have.value', 'Test description');

    // Wait for toleration table to be populated before checking row data
    cy.findByTestId('toleration-table').should('be.visible');
    editAcceleratorProfile
      .getRow('nvidia.com/gpu')
      .shouldHaveEffect('NoSchedule')
      .shouldHaveOperator('Exists')
      .shouldHaveTolerationSeconds('-');

    //update the description
    cy.interceptK8s(
      'PUT',
      {
        model: AcceleratorProfileModel,
        name: 'test-accelerator',
        ns: 'opendatahub',
        times: 1,
      },
      mockAcceleratorProfile({
        name: 'test-accelerator',
        namespace: 'opendatahub',
      }),
    ).as('updatedAccelerator');

    cy.interceptK8s(
      'GET',
      {
        model: AcceleratorProfileModel,
        name: 'test-accelerator',
        ns: 'opendatahub',
        times: 1,
      },
      mockAcceleratorProfile({
        name: 'test-accelerator',
        namespace: 'opendatahub',
      }),
    );

    editAcceleratorProfile.k8sNameDescription.findDescriptionInput().fill('Updated description');
    editAcceleratorProfile.findSubmitButton().click();
    cy.wait('@updatedAccelerator');
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
    identifierAcceleratorProfile
      .findAcceleratorIdentifierSelect()
      .should('contain.text', 'test-identifier');
    identifierAcceleratorProfile.findAcceleratorIdentifierSelect().should('be.disabled');
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
