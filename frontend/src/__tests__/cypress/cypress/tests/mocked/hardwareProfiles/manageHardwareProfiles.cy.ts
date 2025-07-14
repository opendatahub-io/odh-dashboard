import {
  IdentifierResourceType,
  SchedulingType,
  TolerationEffect,
  TolerationOperator,
} from '#~/types';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import {
  HardwareProfileModel,
  AcceleratorProfileModel,
  WorkloadPriorityClassModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import {
  createHardwareProfile,
  createNodeResourceModal,
  createNodeSelectorModal,
  createTolerationModal,
  duplicateHardwareProfile,
  editHardwareProfile,
  editNodeResourceModal,
  editNodeSelectorModal,
  editTolerationModal,
  hardwareProfile,
  legacyHardwareProfile,
} from '#~/__tests__/cypress/cypress/pages/hardwareProfile';
import { migrationModal } from '#~/__tests__/cypress/cypress/pages/components/MigrationModal';
import { mock200Status, mockDashboardConfig } from '#~/__mocks__';
import { mockWorkloadPriorityClassK8sResource as mockWorkloadPriorityClass } from '#~/__mocks__/mockWorkloadPriorityClassK8Resource';

type HandlersProps = {
  isPresent?: boolean;
  withLocalQueue?: boolean;
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
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '2Gi',
              maxCount: '5Gi',
              defaultCount: '2Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
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
          nodeSelector: { 'test-key': 'test-value' },
        })
      : {
          statusCode: 404,
        },
  );
};

function makeProfile({ withLocalQueue = false } = {}) {
  return mockHardwareProfile({
    name: 'test-hardware-profile',
    namespace: 'opendatahub',
    displayName: 'Test Hardware Profile',
    description: 'Test description',
    schedulingType: withLocalQueue ? SchedulingType.QUEUE : SchedulingType.NODE,
    localQueueName: 'test-queue',
    priorityClass: 'high',
    tolerations: [
      {
        key: 'nvidia.com/gpu',
        operator: TolerationOperator.EXISTS,
        effect: TolerationEffect.NO_SCHEDULE,
      },
    ],
    nodeSelector: { 'test-key': 'test-value' },
  });
}

function setupIntercepts({ disableKueue = false, isPresent = true, withLocalQueue = false } = {}) {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableKueue }));

  cy.interceptK8sList(
    { model: WorkloadPriorityClassModel },
    mockK8sResourceList([
      mockWorkloadPriorityClass({ name: 'high', description: 'High priority', value: 1000 }),
      mockWorkloadPriorityClass({ name: 'medium', description: 'Medium priority', value: 500 }),
      mockWorkloadPriorityClass({ name: 'low', description: 'Low priority', value: 100 }),
    ]),
  );

  cy.interceptK8s(
    { model: HardwareProfileModel, ns: 'opendatahub', name: 'test-hardware-profile' },
    isPresent ? makeProfile({ withLocalQueue }) : { statusCode: 404 },
  );
}

describe('Manage Hardware Profile', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('create hardware profile', () => {
    initIntercepts({});
    createHardwareProfile.visit();
    createHardwareProfile.findSubmitButton().should('be.disabled');

    // test required fields
    createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill('Test hardware profile');
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
    createHardwareProfile.k8sNameDescription.findDescriptionInput().fill('Test description');

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
      expect(
        interception.request.body.metadata.annotations['opendatahub.io/display-name'],
      ).to.be.eql('Test hardware profile');
      expect(
        interception.request.body.metadata.annotations['opendatahub.io/description'],
      ).to.be.eql('Test description');
    });
  });

  it('test node resources section', () => {
    initIntercepts({});
    createHardwareProfile.visit();
    createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill('test-hardware-profile');

    // test node resource table
    createHardwareProfile.findNodeResourceTable().should('exist');
    // open node resource modal
    createHardwareProfile.findAddNodeResourceButton().click();
    // fill in form required fields
    createNodeResourceModal.findNodeResourceSubmitButton().should('be.disabled');
    createNodeResourceModal.findNodeResourceLabelInput().fill('Test GPU');
    // test duplicated identifier
    createNodeResourceModal.findNodeResourceIdentifierInput().fill('cpu');
    createNodeResourceModal.findNodeResourceExistingErrorMessage().should('exist');
    createNodeResourceModal.findNodeResourceSubmitButton().should('be.disabled');
    createNodeResourceModal.findNodeResourceIdentifierInput().fill('test-gpu');
    createNodeResourceModal.findNodeResourceTypeSelect().should('contain.text', 'Other');
    createNodeResourceModal.findNodeResourceSubmitButton().should('be.enabled');
    createNodeResourceModal.findNodeResourceSubmitButton().click();
    // test that values were added correctly
    createHardwareProfile.getNodeResourceTableRow('test-gpu').shouldHaveResourceLabel('Test GPU');

    // make a new one; a test-ack that should be deletable - no dialog should show up
    createHardwareProfile.findAddNodeResourceButton().click();
    // fill in form required fields
    createNodeResourceModal.findNodeResourceSubmitButton().should('be.disabled');
    createNodeResourceModal.findNodeResourceLabelInput().fill('Test Ack');
    createNodeResourceModal.findNodeResourceIdentifierInput().fill('test-ack');
    createNodeResourceModal.findNodeResourceTypeSelect().should('contain.text', 'Other');
    createNodeResourceModal.findNodeResourceSubmitButton().should('be.enabled');
    createNodeResourceModal.findNodeResourceSubmitButton().click();
    // test that values were added correctly
    createHardwareProfile.getNodeResourceTableRow('test-ack').shouldHaveResourceLabel('Test Ack');

    // now; delete it; no dialog should show:
    createHardwareProfile.getNodeResourceTableRow('test-ack').findDeleteAction().click();
    createHardwareProfile.findNodeResourceDeletionDialog().should('not.exist');
    createHardwareProfile.findNodeResourceTableAlert().should('not.exist');

    // Assert that the row does not exist
    createHardwareProfile.hasNodeResourceRow('test-ack').should('be.false');

    // test edit node resource
    createHardwareProfile.getNodeResourceTableRow('cpu').findEditAction().click();
    editNodeResourceModal.findNodeResourceTypeSelect().should('contain.text', 'CPU');
    // test default value should be within min and max value
    editNodeResourceModal.selectNodeResourceDefaultUnit('Milicores');
    editNodeResourceModal.findNodeResourceDefaultErrorMessage().should('exist');
    editNodeResourceModal.selectNodeResourceDefaultUnit('Cores');
    editNodeResourceModal.findNodeResourceDefaultErrorMessage().should('not.exist');
    // test min value should not exceed max value
    editNodeResourceModal.findNodeResourceMinInput().type('3');
    editNodeResourceModal.findNodeResourceMinErrorMessage().should('exist');
    editNodeResourceModal.findNodeResourceMinInput().clear();
    editNodeResourceModal.findNodeResourceMinErrorMessage().should('exist');
    editNodeResourceModal.findCancelButton().click();

    createHardwareProfile.getNodeResourceTableRow('memory').findEditAction().click();
    editNodeResourceModal.findNodeResourceTypeSelect().should('contain.text', 'Memory');
    // test default value should be within min and max value
    editNodeResourceModal.selectNodeResourceDefaultUnit('MiB');
    editNodeResourceModal.findNodeResourceDefaultErrorMessage().should('exist');
    editNodeResourceModal.selectNodeResourceDefaultUnit('GiB');
    editNodeResourceModal.findNodeResourceDefaultErrorMessage().should('not.exist');
    // test min value should not exceed max value
    editNodeResourceModal.findNodeResourceMinInput().type('3');
    editNodeResourceModal.findNodeResourceMinErrorMessage().should('exist');
    editNodeResourceModal.findNodeResourceMinInput().clear();
    editNodeResourceModal.findNodeResourceMinErrorMessage().should('exist');
    editNodeResourceModal.findCancelButton().click();

    createHardwareProfile.getNodeResourceTableRow('test-gpu').findEditAction().click();
    editNodeResourceModal.findNodeResourceLabelInput().fill('Test GPU Edited');
    editNodeResourceModal.findNodeResourceIdentifierInput().fill('test-gpu-edited');
    // test default value should be within min and max value
    editNodeResourceModal.findNodeResourceDefaultInput().type('3');
    editNodeResourceModal.findNodeResourceDefaultErrorMessage().should('exist');
    editNodeResourceModal.findNodeResourceSubmitButton().should('be.disabled');
    editNodeResourceModal.findNodeResourceDefaultInput().type('{backspace}');
    editNodeResourceModal.findNodeResourceDefaultErrorMessage().should('not.exist');
    editNodeResourceModal.findNodeResourceSubmitButton().should('be.enabled');
    // test min value should not exceed max value
    editNodeResourceModal.findNodeResourceMinInput().type('3');
    editNodeResourceModal.findNodeResourceMinErrorMessage().should('exist');
    editNodeResourceModal.findNodeResourceSubmitButton().should('be.disabled');
    editNodeResourceModal.findNodeResourceMinInput().type('{backspace}');
    editNodeResourceModal.findNodeResourceMinErrorMessage().should('not.exist');
    editNodeResourceModal.findNodeResourceSubmitButton().should('be.enabled');
    editNodeResourceModal.findNodeResourceMaxInput().type('3');
    editNodeResourceModal.findNodeResourceSubmitButton().click();
    createHardwareProfile
      .getNodeResourceTableRow('test-gpu-edited')
      .shouldHaveResourceLabel('Test GPU Edited')
      .shouldHaveResourceIdentifier('test-gpu-edited');

    // test deleting the last CPU trigger the alert shown
    createHardwareProfile.getNodeResourceTableRow('cpu').findDeleteAction().click();
    createHardwareProfile.findNodeResourceDeletionDialog().should('exist');
    createHardwareProfile.findNodeResourceDeletionDialogDeleteButton().click();
    createHardwareProfile.findNodeResourceDeletionDialog().should('not.exist');
    createHardwareProfile.findSubmitButton().should('be.enabled');

    createHardwareProfile.findNodeResourceTableAlert().should('exist');
    createHardwareProfile.findAddNodeResourceButton().click();
    createNodeResourceModal.findNodeResourceLabelInput().fill('CPU');
    createNodeResourceModal.findNodeResourceIdentifierInput().fill('cpu');
    createNodeResourceModal.findNodeResourceTypeSelect().findSelectOption('CPU').click();
    createNodeResourceModal.findNodeResourceSubmitButton().should('be.enabled');
    createNodeResourceModal.findNodeResourceSubmitButton().click();

    createHardwareProfile.findNodeResourceTableAlert().should('not.exist');

    // add an extra memory:
    createHardwareProfile.findAddNodeResourceButton().click();
    createNodeResourceModal.findNodeResourceLabelInput().fill('extra-memory');
    createNodeResourceModal.findNodeResourceIdentifierInput().fill('extra-memory');
    createNodeResourceModal.findNodeResourceTypeSelect().findSelectOption('Memory').click();
    createNodeResourceModal.findNodeResourceSubmitButton().should('be.enabled');
    createNodeResourceModal.findNodeResourceSubmitButton().click();

    createHardwareProfile.hasNodeResourceRow('extra-memory').should('be.true');

    // test deleting one of the two memory slots does NOT trigger an alert (or the dialog):
    createHardwareProfile.getNodeResourceTableRow('extra-memory').findDeleteAction().click();

    createHardwareProfile.findNodeResourceDeletionDialog().should('not.exist');
    createHardwareProfile.findNodeResourceTableAlert().should('not.exist');
    // Assert that the row does not exist
    createHardwareProfile.hasNodeResourceRow('extra-memory').should('be.false');

    // now: test deleting the last Memory trigger the alert shown
    createHardwareProfile.getNodeResourceTableRow('memory').findDeleteAction().click();
    createHardwareProfile.findNodeResourceDeletionDialog().should('exist');
    createHardwareProfile.findSubmitButton().should('be.enabled');

    // first; cancel; should be a no-op (row still there, no alert shown)
    createHardwareProfile.findNodeResourceDeletionDialogCancelButton().click();
    createHardwareProfile.hasNodeResourceRow('memory').should('be.true');
    createHardwareProfile.findNodeResourceTableAlert().should('not.exist');

    // now; do it again and actually delete it:
    createHardwareProfile.getNodeResourceTableRow('memory').findDeleteAction().click();
    createHardwareProfile.findNodeResourceDeletionDialog().should('exist');
    createHardwareProfile.findNodeResourceDeletionDialogDeleteButton().click();
    createHardwareProfile.findNodeResourceDeletionDialog().should('not.exist');

    createHardwareProfile.findNodeResourceTableAlert().should('exist');
    createHardwareProfile.findAddNodeResourceButton().click();
    createNodeResourceModal.findNodeResourceLabelInput().fill('MEMORY');
    createNodeResourceModal.findNodeResourceIdentifierInput().fill('memory');
    createNodeResourceModal.findNodeResourceTypeSelect().findSelectOption('Memory').click();
    createNodeResourceModal.findNodeResourceSubmitButton().should('be.enabled');
    createNodeResourceModal.findNodeResourceSubmitButton().click();

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
      expect(interception.request.body.spec.identifiers).to.be.eql([
        {
          displayName: 'Test GPU Edited',
          identifier: 'test-gpu-edited',
          minCount: 1,
          maxCount: 13,
          defaultCount: 1,
        },
        {
          identifier: 'cpu',
          displayName: 'CPU',
          defaultCount: 2,
          maxCount: 4,
          minCount: 1,
          resourceType: 'CPU',
        },
        {
          identifier: 'memory',
          displayName: 'MEMORY',
          defaultCount: '4Gi',
          maxCount: '8Gi',
          minCount: '2Gi',
          resourceType: 'Memory',
        },
      ]);
    });
  });

  it('test node selectors section', () => {
    initIntercepts({});
    createHardwareProfile.visit();
    createHardwareProfile.findSubmitButton().should('be.disabled');
    createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill('test-hardware-profile');

    // test node selectors empty state
    createHardwareProfile.findNodeSelectorTable().should('not.exist');
    // open node selector modal
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
    // test edit node selector
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
      expect(interception.request.body.spec.scheduling.node.nodeSelector).to.be.eql({
        'new-test-node-selector': 'new-test-value',
      });
    });
  });

  it('test tolerations section', () => {
    initIntercepts({});
    createHardwareProfile.visit();
    createHardwareProfile.findSubmitButton().should('be.disabled');
    createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill('test-hardware-profile');

    // test tolerations empty state
    createHardwareProfile.findTolerationTable().should('not.exist');
    // open toleration modal
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
      expect(interception.request.body.spec.scheduling.node.tolerations).to.be.eql([]);
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

    editHardwareProfile.findNodeResourceTable().should('exist');
    editHardwareProfile
      .getNodeResourceTableRow('nvidia.com/gpu')
      .shouldHaveResourceLabel('GPU')
      .findDeleteAction()
      .click();

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
      expect(interception.request.body.metadata.annotations).to.contain({
        'opendatahub.io/display-name': 'Test Hardware Profile',
        'opendatahub.io/description': 'Updated description',
        'opendatahub.io/disabled': 'false',
      });
      expect(interception.request.body.spec).to.eql({
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '2Gi',
            maxCount: '5Gi',
            defaultCount: '2Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '1',
            maxCount: '2',
            defaultCount: '1',
            resourceType: IdentifierResourceType.CPU,
          },
        ],
        scheduling: {
          type: SchedulingType.NODE,
          node: {
            tolerations: [
              {
                key: 'nvidia.com/gpu',
                operator: 'Exists',
                effect: 'NoSchedule',
              },
            ],
            nodeSelector: {},
          },
        },
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

    editHardwareProfile.findNodeResourceTable().should('exist');
    editHardwareProfile.getNodeResourceTableRow('nvidia.com/gpu').shouldHaveResourceLabel('GPU');

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
      expect(interception.request.body.metadata.annotations).to.contain({
        'opendatahub.io/display-name': 'duplicate hardware profile',
        'opendatahub.io/disabled': 'false',
      });
      expect(interception.request.body.spec).to.eql({
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '2Gi',
            maxCount: '5Gi',
            defaultCount: '2Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '1',
            maxCount: '2',
            defaultCount: '1',
            resourceType: IdentifierResourceType.CPU,
          },
          {
            identifier: 'nvidia.com/gpu',
            displayName: 'GPU',
            maxCount: 2,
            minCount: 1,
            defaultCount: 1,
          },
        ],
        scheduling: {
          type: 'Node',
          node: {
            tolerations: [
              {
                key: 'nvidia.com/gpu',
                operator: 'Exists',
                effect: 'NoSchedule',
              },
            ],
            nodeSelector: {},
          },
        },
      });
    });
  });

  it('invalid id in edit page', () => {
    initIntercepts({ isPresent: false });
    cy.interceptK8sList(
      HardwareProfileModel,
      mockK8sResourceList([
        mockHardwareProfile({ name: 'test 12', namespace: 'opendatahub', uid: 'test-12' }),
      ]),
    ).as('listHardwareProfiles');
    editHardwareProfile.visit('test-hardware-profile');
    editHardwareProfile.findErrorText().should('exist');
    editHardwareProfile.findViewAllHardwareProfilesButton().click();
    cy.wait('@listHardwareProfiles');
  });

  it('invalid id in duplicate page', () => {
    initIntercepts({ isPresent: false });
    cy.interceptK8sList(
      HardwareProfileModel,
      mockK8sResourceList([
        mockHardwareProfile({ name: 'test 12', namespace: 'opendatahub', uid: 'test-12' }),
      ]),
    ).as('listHardwareProfiles');
    duplicateHardwareProfile.visit('test-hardware-profile');
    duplicateHardwareProfile.findErrorText().should('exist');
    duplicateHardwareProfile.findViewAllHardwareProfilesButton().click();
    cy.wait('@listHardwareProfiles');
  });

  it('multiple preset identifiers show in the node selector table', () => {
    initIntercepts({});
    createHardwareProfile.visit('test-identifier1,test-identifier2');

    createHardwareProfile
      .getNodeResourceTableRow('test-identifier1')
      .shouldHaveResourceIdentifier('test-identifier1');
    createHardwareProfile
      .getNodeResourceTableRow('test-identifier2')
      .shouldHaveResourceIdentifier('test-identifier2');
  });

  it('migrate hardware profile', () => {
    // mocked model server size
    const modelServerSize = {
      name: 'Test Model Server Size',
      resources: { requests: { cpu: '2', memory: '2Gi' }, limits: { cpu: '3', memory: '3Gi' } },
    };
    // mocked notebook size
    const notebookSize = {
      name: 'Test Notebook Size',
      resources: { requests: { cpu: '1', memory: '1Gi' }, limits: { cpu: '2', memory: '2Gi' } },
    };
    // mock dashboard config
    const dashboardConfig = mockDashboardConfig({
      modelServerSizes: [modelServerSize],
      notebookSizes: [notebookSize],
    });

    cy.interceptOdh('GET /api/config', dashboardConfig);

    const originalAcceleratorProfile = mockAcceleratorProfile({
      namespace: 'opendatahub',
      name: 'legacy-hardware-profile',
      displayName: 'Legacy Hardware Profile',
      description: 'Legacy profile to be migrated',
      identifier: 'nvidia.com/gpu',
      enabled: true,
      tolerations: [
        {
          key: 'nvidia.com/gpu',
          operator: TolerationOperator.EXISTS,
          effect: TolerationEffect.NO_SCHEDULE,
        },
      ],
    });

    // Mock the accelerator profile that will be migrated
    cy.interceptK8sList(
      { model: AcceleratorProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([originalAcceleratorProfile]),
    );

    const migratedServingHardwareProfile = mockHardwareProfile({
      namespace: 'opendatahub',
      name: `${originalAcceleratorProfile.metadata.name}-serving`,
      displayName: originalAcceleratorProfile.spec.displayName,
      description: originalAcceleratorProfile.spec.description,
      annotations: {
        'opendatahub.io/dashboard-feature-visibility': '["model-serving","pipelines"]',
      },
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: modelServerSize.resources.requests.cpu,
          maxCount: modelServerSize.resources.limits.cpu,
          defaultCount: modelServerSize.resources.requests.cpu,
          resourceType: IdentifierResourceType.CPU,
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: modelServerSize.resources.requests.memory,
          maxCount: modelServerSize.resources.limits.memory,
          defaultCount: modelServerSize.resources.requests.memory,
          resourceType: IdentifierResourceType.MEMORY,
        },
        {
          displayName: originalAcceleratorProfile.spec.identifier,
          identifier: originalAcceleratorProfile.spec.identifier,
          minCount: 1,
          defaultCount: 1,
        },
      ],
      schedulingType: SchedulingType.NODE,
      tolerations: originalAcceleratorProfile.spec.tolerations,
    });

    const migratedNotebooksHardwareProfile = mockHardwareProfile({
      namespace: 'opendatahub',
      name: `${originalAcceleratorProfile.metadata.name}-notebooks`,
      annotations: {
        'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
      },
      displayName: originalAcceleratorProfile.spec.displayName,
      description: originalAcceleratorProfile.spec.description,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: notebookSize.resources.requests.cpu,
          maxCount: notebookSize.resources.limits.cpu,
          defaultCount: notebookSize.resources.requests.cpu,
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: notebookSize.resources.requests.memory,
          maxCount: notebookSize.resources.limits.memory,
          defaultCount: notebookSize.resources.requests.memory,
        },
        {
          displayName: originalAcceleratorProfile.spec.identifier,
          identifier: originalAcceleratorProfile.spec.identifier,
          minCount: 0,
          defaultCount: 1,
        },
      ],
      schedulingType: SchedulingType.NODE,
      tolerations: [
        ...(originalAcceleratorProfile.spec.tolerations || []),
        {
          key: 'NotebooksOnlyChange',
          operator: TolerationOperator.EXISTS,
          effect: TolerationEffect.NO_SCHEDULE,
        },
      ],
    });

    // Mock the API calls for migration
    cy.interceptK8s(
      'DELETE',
      { model: AcceleratorProfileModel, ns: 'opendatahub', name: 'legacy-hardware-profile' },
      mock200Status({}),
    ).as('deleteSource');

    // Mock the creation of the new hardware profiles
    cy.interceptK8s('POST', { model: HardwareProfileModel, ns: 'opendatahub' }, (req) => {
      // Check if the request body has the specific annotation
      const annotations =
        req.body.metadata?.annotations?.['opendatahub.io/dashboard-feature-visibility'];

      if (annotations?.includes('model-serving')) {
        req.reply(migratedServingHardwareProfile);
      } else if (annotations?.includes('workbench')) {
        req.reply(migratedNotebooksHardwareProfile);
      }
    }).as('create');

    // Visit the hardware profiles page
    hardwareProfile.visit();

    // expand the migrated hardware profiles section
    legacyHardwareProfile.findExpandButton().click();

    // Find the legacy hardware profile row
    const legacyProfileRow = legacyHardwareProfile.getRow('Legacy Hardware Profile');

    // Click the edit action
    legacyProfileRow.findKebabAction('Edit').click();

    // submit manage hardware profile form
    editHardwareProfile.findSubmitButton().click();

    // submit migration modal
    migrationModal.findSubmitButton().should('be.enabled').click();

    // assert the creation of the new hardware profiles
    cy.wait('@deleteSource');
    cy.wait('@create').then((interception) => {
      // Assert individually the properties that include random values
      const { name, annotations } = interception.request.body.metadata;
      expect(annotations).to.have.property('opendatahub.io/modified-date');

      const actual = Cypress._.omit(
        interception.request.body,
        'metadata.annotations["opendatahub.io/modified-date"]',
        'metadata.name',
      );

      const visibility =
        interception.request.body.metadata?.annotations?.[
          'opendatahub.io/dashboard-feature-visibility'
        ];

      if (visibility?.includes('model-serving')) {
        expect(name).to.match(new RegExp(`${originalAcceleratorProfile.metadata.name}-.*-serving`));

        const expected = JSON.parse(JSON.stringify(migratedServingHardwareProfile));

        expected.metadata = {
          namespace: 'opendatahub',
          annotations: {
            'opendatahub.io/dashboard-feature-visibility': '["model-serving","pipelines"]',
            'opendatahub.io/display-name': originalAcceleratorProfile.spec.displayName,
            'opendatahub.io/description': originalAcceleratorProfile.spec.description,
            'opendatahub.io/disabled': 'false',
          },
        };

        expect(actual).to.eql(expected);
      } else if (visibility?.includes('workbench')) {
        expect(name).to.match(
          new RegExp(`${originalAcceleratorProfile.metadata.name}-.*-notebooks`),
        );

        const expected = JSON.parse(JSON.stringify(migratedNotebooksHardwareProfile));

        expected.metadata = {
          namespace: 'opendatahub',
          annotations: {
            'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
            'opendatahub.io/display-name': originalAcceleratorProfile.spec.displayName,
            'opendatahub.io/description': originalAcceleratorProfile.spec.description,
            'opendatahub.io/disabled': 'false',
          },
        };

        // Check that the actual object matches the expected object
        expect(actual).to.eql(expected);
      }
    });
  });
  describe('Kueue enabled', () => {
    beforeEach(() => setupIntercepts({ disableKueue: false }));

    it('creating a new hardware profile', () => {
      createHardwareProfile.visit();
      createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill('Test hardware profile');

      // The default workload allocation strategy pick should be 'Local queue'
      createHardwareProfile.findLocalQueueRadio().should('be.checked');

      // The default local queue value is ''
      createHardwareProfile.findLocalQueueInput().should('have.value', 'default');

      // The default workload priority is None, and is optional
      createHardwareProfile.findWorkloadPrioritySelect().should('contain.text', 'None');

      // The workload priority dropdown should show all the workload priorities available
      createHardwareProfile.findWorkloadPrioritySelect().click();
      cy.findByTestId('None').should('exist');
      cy.findByTestId('high').should('exist');
      cy.findByTestId('medium').should('exist');
      cy.findByTestId('low').should('exist');
      cy.findByTestId('None').click();

      // Should be able to select node selectors and tolerations radio button
      createHardwareProfile.findNodeStrategyRadio().click();
      createHardwareProfile.findNodeStrategyRadio().should('be.checked');

      // Should be able to add node selectors and tolerations to the table
      createHardwareProfile.findAddNodeSelectorButton().click();
      createNodeSelectorModal.findNodeSelectorKeyInput().fill('test-key');
      createNodeSelectorModal.findNodeSelectorValueInput().fill('test-value');
      createNodeSelectorModal.findNodeSelectorSubmitButton().click();
      createHardwareProfile.getNodeSelectorTableRow('test-key').shouldHaveValue('test-value');

      createHardwareProfile.findAddTolerationButton().click();
      createTolerationModal.findTolerationKeyInput().fill('test-key');
      createTolerationModal.findTolerationSubmitButton().click();
      createHardwareProfile.getTolerationTableRow('test-key').shouldHaveOperator('Equal');

      // Switch back to local queue and set values
      createHardwareProfile.findLocalQueueRadio().click();
      createHardwareProfile.findLocalQueueInput().clear().type('my-queue');
      createHardwareProfile.selectWorkloadPriority('high');

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
        expect(interception.request.body.spec.scheduling).to.eql({
          type: SchedulingType.QUEUE,
          kueue: {
            localQueueName: 'my-queue',
            priorityClass: 'high',
          },
        });
      });
    });

    it('editing a preexisting hardware profile with local queue/workload priority', () => {
      setupIntercepts({ withLocalQueue: true });

      editHardwareProfile.visit('test-hardware-profile');

      // The local queue radio button should be selected
      editHardwareProfile.findLocalQueueRadio().should('be.checked');

      // The local queue name should be prefilled into the text input
      editHardwareProfile.findLocalQueueInput().should('have.value', 'test-queue');

      // The correct workload priority should be preselected
      editHardwareProfile.findWorkloadPrioritySelect().should('contain.text', 'high');

      // Update the values
      editHardwareProfile.findLocalQueueInput().clear().type('updated-queue');
      editHardwareProfile.selectWorkloadPriority('medium');

      cy.interceptK8s(
        'PUT',
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'test-hardware-profile',
        },
        mockHardwareProfile({ name: 'test-hardware-profile', namespace: 'opendatahub' }),
      ).as('updateHardwareProfile');

      editHardwareProfile.findSubmitButton().click();

      cy.wait('@updateHardwareProfile').then((interception) => {
        expect(interception.request.body.spec.scheduling).to.eql({
          type: SchedulingType.QUEUE,
          kueue: {
            localQueueName: 'updated-queue',
            priorityClass: 'medium',
          },
        });
      });
    });

    it('editing a preexisting hardware profile with node selector and tolerations', () => {
      editHardwareProfile.visit('test-hardware-profile');

      // The node selector and tolerations button should be selected
      editHardwareProfile.findNodeStrategyRadio().should('be.checked');

      // The nodes and tolerations should be preset in the table
      editHardwareProfile.findNodeSelectorTable().should('exist');
      editHardwareProfile.getNodeSelectorTableRow('test-key').shouldHaveValue('test-value');

      editHardwareProfile.findTolerationTable().should('exist');
      editHardwareProfile.getTolerationTableRow('nvidia.com/gpu').shouldHaveOperator('Exists');

      // Switch to local queue
      editHardwareProfile.findLocalQueueRadio().click();
      editHardwareProfile.findLocalQueueInput().clear().type('new-queue');
      editHardwareProfile.selectWorkloadPriority('low');

      cy.interceptK8s(
        'PUT',
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'test-hardware-profile',
        },
        mockHardwareProfile({ name: 'test-hardware-profile', namespace: 'opendatahub' }),
      ).as('updateHardwareProfile');

      editHardwareProfile.findSubmitButton().click();

      cy.wait('@updateHardwareProfile').then((interception) => {
        expect(interception.request.body.spec.scheduling).to.eql({
          type: SchedulingType.QUEUE,
          kueue: {
            localQueueName: 'new-queue',
            priorityClass: 'low',
          },
        });
      });
    });
  });

  describe('Kueue disabled', () => {
    it('creating a new hardware profile', () => {
      setupIntercepts({ disableKueue: true });
      createHardwareProfile.visit();
      createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill('Test hardware profile');

      // The radio options shouldn't be shown
      createHardwareProfile.findLocalQueueRadio().should('not.exist');
      createHardwareProfile.findNodeStrategyRadio().should('not.exist');

      // Add node selectors and tolerations
      createHardwareProfile.findAddNodeSelectorButton().click();
      createNodeSelectorModal.findNodeSelectorKeyInput().fill('test-key');
      createNodeSelectorModal.findNodeSelectorValueInput().fill('test-value');
      createNodeSelectorModal.findNodeSelectorSubmitButton().click();
      createHardwareProfile.getNodeSelectorTableRow('test-key').shouldHaveValue('test-value');

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
        expect(interception.request.body.spec.scheduling).to.eql({
          type: SchedulingType.NODE,
          node: {
            nodeSelector: { 'test-key': 'test-value' },
            tolerations: [],
          },
        });
      });
    });

    it('editing a preexisting hardware profile with local queue/workload priority', () => {
      setupIntercepts({ disableKueue: true, withLocalQueue: true });

      editHardwareProfile.visit('test-hardware-profile');

      // The local queue radio button should be selected
      editHardwareProfile.findLocalQueueRadio().should('be.checked');

      // Should be able to see the info alert
      editHardwareProfile.findKueueDisabledAlert().should('be.visible');

      // The local queue text input and workload priority select should be disabled
      editHardwareProfile.findLocalQueueInput().should('be.disabled');
      editHardwareProfile.findWorkloadPrioritySelect().should('be.disabled');

      // Should be able to select node selectors and tolerations radio button
      editHardwareProfile.findNodeStrategyRadio().click();
      editHardwareProfile.findNodeStrategyRadio().should('be.checked');

      // Add node selectors
      editHardwareProfile.findAddNodeSelectorButton().click();
      createNodeSelectorModal.findNodeSelectorKeyInput().fill('test-key');
      createNodeSelectorModal.findNodeSelectorValueInput().fill('test-value');
      createNodeSelectorModal.findNodeSelectorSubmitButton().click();

      cy.interceptK8s(
        'PUT',
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'test-hardware-profile',
        },
        mockHardwareProfile({ name: 'test-hardware-profile', namespace: 'opendatahub' }),
      ).as('updateHardwareProfile');

      editHardwareProfile.findSubmitButton().click();

      cy.wait('@updateHardwareProfile').then((interception) => {
        expect(interception.request.body.spec.scheduling).to.eql({
          type: SchedulingType.NODE,
          node: {
            nodeSelector: { 'test-key': 'test-value' },
            tolerations: [],
          },
        });
      });
    });

    it('editing a preexisting hardware profile with node selector and tolerations', () => {
      setupIntercepts({ disableKueue: true });

      editHardwareProfile.visit('test-hardware-profile');

      editHardwareProfile.findLocalQueueRadio().should('not.exist');
      editHardwareProfile.findNodeStrategyRadio().should('not.exist');

      // The nodes and tolerations should be preset in the table
      editHardwareProfile.findNodeSelectorTable().should('exist');
      editHardwareProfile.getNodeSelectorTableRow('test-key').shouldHaveValue('test-value');

      editHardwareProfile.findTolerationTable().should('exist');
      editHardwareProfile.getTolerationTableRow('nvidia.com/gpu').shouldHaveOperator('Exists');

      // Update node selector
      editHardwareProfile.getNodeSelectorTableRow('test-key').findEditAction().click();
      editNodeSelectorModal.findNodeSelectorValueInput().clear().type('updated-value');
      editNodeSelectorModal.findNodeSelectorSubmitButton().click();

      cy.interceptK8s(
        'PUT',
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'test-hardware-profile',
        },
        mockHardwareProfile({ name: 'test-hardware-profile', namespace: 'opendatahub' }),
      ).as('updateHardwareProfile');

      editHardwareProfile.findSubmitButton().click();

      cy.wait('@updateHardwareProfile').then((interception) => {
        expect(interception.request.body.spec.scheduling).to.eql({
          type: SchedulingType.NODE,
          node: {
            nodeSelector: { 'test-key': 'updated-value' },
            tolerations: [
              {
                key: 'nvidia.com/gpu',
                operator: 'Exists',
                effect: 'NoSchedule',
              },
            ],
          },
        });
      });
    });
  });
});
