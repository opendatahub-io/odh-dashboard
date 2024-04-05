/* eslint-disable camelcase */
import {
  InputDefinitionParameterType,
  PipelineRunJobKFv2,
  PipelineRunKFv2,
} from '~/concepts/pipelines/kfTypes';
import {
  buildMockRunKF,
  buildMockPipelineV2,
  buildMockPipelineVersionV2,
  buildMockJobKF,
  buildMockExperimentKF,
} from '~/__mocks__';
import {
  createRunPage,
  cloneRunPage,
  pipelineRunJobTable,
  pipelineRunsGlobal,
  activeRunsTable,
  createSchedulePage,
  cloneSchedulePage,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url.cy';

import { getCorePipelineSpec } from '~/concepts/pipelines/getCorePipelineSpec';
import { configIntercept, dspaIntercepts, projectsIntercept, statusIntercept } from './intercepts';

const projectName = 'test-project-name';
const mockPipeline = buildMockPipelineV2();
const mockPipelineVersion = buildMockPipelineVersionV2({ pipeline_id: mockPipeline.pipeline_id });
const pipelineVersionRef = {
  pipeline_id: mockPipeline.pipeline_id,
  pipeline_version_id: mockPipelineVersion.pipeline_version_id,
};
const mockExperiments = [
  buildMockExperimentKF({
    display_name: 'Test experiment 1',
    experiment_id: 'experiment-1',
  }),
  buildMockExperimentKF({
    display_name: 'Test experiment 2',
    experiment_id: 'experiment-1',
  }),
];
const initialMockRuns = [
  buildMockRunKF({
    pipeline_version_reference: pipelineVersionRef,
    experiment_id: 'experiment-1',
  }),
];
const initialMockRecurringRuns = [
  buildMockJobKF({
    pipeline_version_reference: pipelineVersionRef,
    experiment_id: 'experiment-1',
  }),
];

describe('Pipeline create runs', () => {
  beforeEach(() => {
    initIntercepts();
    pipelineRunsGlobal.visit(projectName);
  });

  it('renders the page with scheduled and active runs table data', () => {
    pipelineRunsGlobal.findSchedulesTab().click();
    pipelineRunJobTable.getRowByName('Test job').find().should('exist');

    pipelineRunsGlobal.findActiveRunsTab().click();
    activeRunsTable.getRowByName('Test run').find().should('exist');
  });

  describe('Runs', () => {
    beforeEach(() => {
      mockExperiments.forEach((experiment) => {
        cy.intercept(
          {
            method: 'POST',
            pathname: `/api/proxy/apis/v2beta1/experiments/${experiment.experiment_id}`,
          },
          experiment,
        );
      });
    });

    it('switches to scheduled runs from triggered', () => {
      // Mock experiments, pipelines & versions for form select dropdowns
      createRunPage.mockGetExperiments(mockExperiments);
      createRunPage.mockGetPipelines([mockPipeline]);
      createRunPage.mockGetPipelineVersions([mockPipelineVersion], mockPipelineVersion.pipeline_id);

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      verifyRelativeURL(`/pipelineRuns/${projectName}/pipelineRun/create`);
      createRunPage.find();
      createRunPage.findRunTypeSwitchLink().click();
      cy.url().should('include', '?runType=scheduled');
    });

    it('creates an active run', () => {
      const createRunParams: Partial<PipelineRunKFv2> = {
        display_name: 'New run',
        description: 'New run description',
        run_id: 'new-run-id',
        runtime_config: {
          parameters: {
            min_max_scaler: false,
            neighbors: 1,
            standard_scaler: 'yes',
          },
        },
      };

      // Mock experiments, pipelines & versions for form select dropdowns
      createRunPage.mockGetExperiments(mockExperiments);
      createRunPage.mockGetPipelines([mockPipeline]);
      createRunPage.mockGetPipelineVersions([mockPipelineVersion], mockPipelineVersion.pipeline_id);

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      verifyRelativeURL(`/pipelineRuns/${projectName}/pipelineRun/create`);
      createRunPage.find();

      // Fill out the form without a schedule and submit
      createRunPage.fillName('New run');
      createRunPage.fillDescription('New run description');
      createRunPage.findExperimentSelect().should('not.be.disabled').click();
      createRunPage.selectExperimentByName('Test experiment 1');
      createRunPage.findPipelineSelect().should('not.be.disabled').click();
      createRunPage.selectPipelineByName('Test pipeline');
      createRunPage.findPipelineVersionSelect().should('not.be.disabled');

      const parameters = createRunParams.runtime_config?.parameters || {};
      const paramsSection = createRunPage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').click();
      paramsSection.fillParamInputById('neighbors', String(parameters.neighbors));
      paramsSection.fillParamInputById('standard_scaler', String(parameters.standard_scaler));
      createRunPage.mockCreateRun(mockPipelineVersion, createRunParams).as('createRun');
      createRunPage.submit();

      cy.wait('@createRun').then((interception) => {
        expect(interception.request.body).to.eql({
          path: '/apis/v2beta1/runs',
          method: 'POST',
          host: 'https://ds-pipeline-pipelines-definition-test-project-name.apps.user.com',
          queryParams: {},
          data: {
            display_name: 'New run',
            description: 'New run description',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: '8ce2d04a0-828c-45209fdf1c20',
            },
            runtime_config: {
              parameters: { min_max_scaler: false, neighbors: 1, standard_scaler: 'yes' },
            },
            service_account: '',
            experiment_id: 'experiment-1',
          },
        });
      });

      // Should be redirected to the run details page
      verifyRelativeURL(`/pipelineRuns/${projectName}/pipelineRun/view/${createRunParams.run_id}`);
    });

    it('duplicates an active run', () => {
      const [mockRun] = initialMockRuns;
      const mockExperiment = mockExperiments[0];
      const mockDuplicateRun = buildMockRunKF({
        display_name: 'Duplicate of Test run',
        run_id: 'duplicate-run-id',
        experiment_id: mockExperiment.experiment_id,
      });

      // Mock experiments, pipelines & versions for form select dropdowns
      cloneRunPage.mockGetExperiments(mockExperiments);
      cloneRunPage.mockGetPipelines([mockPipeline]);
      cloneRunPage.mockGetPipelineVersions([mockPipelineVersion], mockPipelineVersion.pipeline_id);
      cloneRunPage.mockGetRun(mockRun);
      cloneRunPage.mockGetPipelineVersion(mockPipelineVersion);
      cloneRunPage.mockGetPipeline(mockPipeline);
      cloneRunPage.mockGetExperiment(mockExperiment);

      // Mock runs list with newly cloned run
      activeRunsTable.mockGetActiveRuns([...initialMockRuns, mockDuplicateRun]);

      // Navigate to clone run page for a given active run
      pipelineRunsGlobal.findActiveRunsTab().click();
      activeRunsTable.getRowByName(mockRun.display_name).findKebabAction('Duplicate').click();
      verifyRelativeURL(`/pipelineRuns/${projectName}/pipelineRun/clone/${mockRun.run_id}`);

      // Verify pre-populated values & submit
      cloneRunPage.findExperimentSelect().should('have.text', mockExperiment.display_name);
      cloneRunPage.findPipelineSelect().should('have.text', mockPipeline.display_name);
      cloneRunPage
        .findPipelineVersionSelect()
        .should('have.text', mockPipelineVersion.display_name);
      const paramsSection = cloneRunPage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').should('be.checked');
      paramsSection.findParamById('neighbors').find('input').should('have.value', '1');
      paramsSection.findParamById('standard_scaler').should('have.value', 'false');

      cloneRunPage.mockCreateRun(mockPipelineVersion, mockDuplicateRun).as('duplicateRun');
      cloneRunPage.submit();

      cy.wait('@duplicateRun').then((interception) => {
        expect(interception.request.body).to.eql({
          path: '/apis/v2beta1/runs',
          method: 'POST',
          host: 'https://ds-pipeline-pipelines-definition-test-project-name.apps.user.com',
          queryParams: {},
          data: {
            display_name: 'Duplicate of Test run',
            description: '',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: '8ce2d04a0-828c-45209fdf1c20',
            },
            runtime_config: {
              parameters: { min_max_scaler: false, neighbors: 1, standard_scaler: false },
            },
            service_account: '',
            experiment_id: 'experiment-1',
          },
        });
      });

      // Should redirect to the details of the newly cloned active run
      verifyRelativeURL(`/pipelineRuns/${projectName}/pipelineRun/view/${mockDuplicateRun.run_id}`);
    });

    it('create run with default and optional parameters', () => {
      const createRunParams: Partial<PipelineRunKFv2> = {
        display_name: 'New run',
        description: 'New run description',
        run_id: 'new-run-id',
        runtime_config: {
          parameters: {
            string_param: 'String default value',
            double_param: null,
            int_param: 1,
            struct_param: { default: 'value' },
            list_param: [{ default: 'value' }],
            bool_param: true,
          },
        },
      };

      // Mock experiments, pipelines & versions for form select dropdowns
      createRunPage.mockGetExperiments(mockExperiments);
      createRunPage.mockGetPipelines([mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        [
          {
            ...mockPipelineVersion,
            pipeline_spec: {
              components: {},
              deploymentSpec: { executors: {} },
              pipelineInfo: { name: '' },
              schemaVersion: '',
              sdkVersion: '',
              ...getCorePipelineSpec(mockPipelineVersion.pipeline_spec),
              root: {
                dag: { tasks: {} },
                inputDefinitions: {
                  parameters: {
                    string_param: {
                      parameterType: InputDefinitionParameterType.STRING,
                      defaultValue: 'String default value',
                      description: 'Some string helper text',
                    },
                    double_param: {
                      parameterType: InputDefinitionParameterType.DOUBLE,
                      defaultValue: 0.1,
                      description: 'Some double helper text',
                      isOptional: true,
                    },
                    int_param: {
                      parameterType: InputDefinitionParameterType.INTEGER,
                      defaultValue: 1,
                    },
                    struct_param: {
                      parameterType: InputDefinitionParameterType.STRUCT,
                      defaultValue: { default: 'value' },
                    },
                    list_param: {
                      parameterType: InputDefinitionParameterType.LIST,
                      defaultValue: [{ default: 'value' }],
                    },
                    bool_param: {
                      parameterType: InputDefinitionParameterType.BOOLEAN,
                      defaultValue: true,
                    },
                  },
                },
              },
            },
          },
        ],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      cy.url().should('include', '/pipelineRun/create');
      createRunPage.find();

      // Fill required fields
      createRunPage.fillName('New run');
      createRunPage.findExperimentSelect().click();
      createRunPage.selectExperimentByName('Test experiment 1');
      createRunPage.findPipelineSelect().click();
      createRunPage.selectPipelineByName('Test pipeline');

      // Verify default parameter values & helper text
      const paramsSection = createRunPage.getParamsSection();
      paramsSection.findParamById('string_param').should('have.value', 'String default value');
      cy.findByTestId('string_param-helper-text').should('have.text', 'Some string helper text');

      paramsSection.findParamById('double_param').should('have.value', '0.1');
      cy.findByTestId('double_param-form-group').should('not.have.text', '*', { exact: false });
      cy.findByTestId('double_param-helper-text').should('have.text', 'Some double helper text');

      paramsSection.findParamById('int_param').find('input').should('have.value', '1');
      paramsSection.findParamById('struct_param').should('have.value', '{"default":"value"}');
      paramsSection.findParamById('list_param').should('have.value', '[{"default":"value"}]');
      paramsSection.findParamById('radio-bool_param-true').should('be.checked');

      // Clear optional parameter then submit
      paramsSection.findParamById('double_param').clear();
      createRunPage.mockCreateRun(mockPipelineVersion, createRunParams).as('createRuns');
      createRunPage.submit();

      cy.wait('@createRuns').then((interception) => {
        expect(interception.request.body).to.eql({
          path: '/apis/v2beta1/runs',
          method: 'POST',
          host: 'https://ds-pipeline-pipelines-definition-test-project-name.apps.user.com',
          queryParams: {},
          data: {
            display_name: 'New run',
            description: '',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: '8ce2d04a0-828c-45209fdf1c20',
            },
            runtime_config: createRunParams.runtime_config,
            service_account: '',
            experiment_id: 'experiment-1',
          },
        });
      });

      // Should be redirected to the run details page
      cy.url().should('include', '/pipelineRun/view/new-run-id');
    });

    it('create run with all parameter types', () => {
      const createRunParams: Partial<PipelineRunKFv2> = {
        display_name: 'New run',
        description: 'New run description',
        run_id: 'new-run-id',
        runtime_config: {
          parameters: {
            string_param: 'some string wrong',
            double_param: 1.2,
            int_param: 1,
            struct_param: { patrick: 'star' },
            list_param: [{ mr: 'krabs', sponge: 'bob' }],
            bool_param: false,
          },
        },
      };

      // Mock experiments, pipelines & versions for form select dropdowns
      createRunPage.mockGetExperiments(mockExperiments);
      createRunPage.mockGetPipelines([mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        [
          {
            ...mockPipelineVersion,
            pipeline_spec: {
              // Volume PipelineSpecs cause weird type issues
              components: {},
              deploymentSpec: { executors: {} },
              pipelineInfo: { name: '' },
              schemaVersion: '',
              sdkVersion: '',
              ...getCorePipelineSpec(mockPipelineVersion.pipeline_spec),
              root: {
                dag: { tasks: {} },
                inputDefinitions: {
                  parameters: {
                    string_param: {
                      parameterType: InputDefinitionParameterType.STRING,
                    },
                    double_param: {
                      parameterType: InputDefinitionParameterType.DOUBLE,
                    },
                    int_param: {
                      parameterType: InputDefinitionParameterType.INTEGER,
                    },
                    struct_param: {
                      parameterType: InputDefinitionParameterType.STRUCT,
                    },
                    list_param: {
                      parameterType: InputDefinitionParameterType.LIST,
                    },
                    bool_param: {
                      parameterType: InputDefinitionParameterType.BOOLEAN,
                    },
                  },
                },
              },
            },
          },
        ],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      cy.url().should('include', '/pipelineRun/create');
      createRunPage.find();

      // Fill out the form with all input parameters
      createRunPage.fillName('New run');
      createRunPage.findExperimentSelect().should('not.be.disabled').click();
      createRunPage.selectExperimentByName('Test experiment 1');
      createRunPage.findPipelineSelect().should('not.be.disabled').click();
      createRunPage.selectPipelineByName('Test pipeline');
      createRunPage.findPipelineVersionSelect().should('not.be.disabled');

      const parameters = createRunParams.runtime_config?.parameters || {};
      const paramsSection = createRunPage.getParamsSection();
      paramsSection.fillParamInputById('string_param', String(parameters.string_param));
      paramsSection.fillParamInputById('double_param', String(parameters.double_param));
      paramsSection
        .findParamById('int_param')
        .find('input')
        .clear()
        .type(String(parameters.int_param));
      paramsSection.fillParamInputById('struct_param', JSON.stringify(parameters.struct_param));
      paramsSection.fillParamInputById('list_param', JSON.stringify(parameters.list_param));
      paramsSection.findParamById('radio-bool_param-false').click();

      createRunPage.mockCreateRun(mockPipelineVersion, createRunParams).as('createRuns');
      createRunPage.submit();

      cy.wait('@createRuns').then((interception) => {
        expect(interception.request.body).to.eql({
          path: '/apis/v2beta1/runs',
          method: 'POST',
          host: 'https://ds-pipeline-pipelines-definition-test-project-name.apps.user.com',
          queryParams: {},
          data: {
            display_name: 'New run',
            description: '',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: '8ce2d04a0-828c-45209fdf1c20',
            },
            runtime_config: createRunParams.runtime_config,
            service_account: '',
            experiment_id: 'experiment-1',
          },
        });
      });
      // Should be redirected to the run details page
      cy.url().should('include', '/pipelineRun/view/new-run-id');
    });
  });

  describe('Schedules', () => {
    beforeEach(() => {
      mockExperiments.forEach((experiment) => {
        cy.intercept(
          {
            method: 'POST',
            pathname: `/api/proxy/apis/v2beta1/experiments/${experiment.experiment_id}`,
          },
          experiment,
        );
      });

      pipelineRunsGlobal.findSchedulesTab().click();
    });

    it('switches to scheduled runs from triggered', () => {
      // Mock experiments, pipelines & versions for form select dropdowns
      createSchedulePage.mockGetExperiments(mockExperiments);
      createSchedulePage.mockGetPipelines([mockPipeline]);
      createSchedulePage.mockGetPipelineVersions(
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findScheduleRunButton().click();
      verifyRelativeURL(`/pipelineRuns/${projectName}/pipelineRun/create?runType=scheduled`);
      createSchedulePage.find();
      createSchedulePage.findRunTypeSwitchLink().click();
      cy.url().should('include', '?runType=active');
    });

    it('creates a schedule', () => {
      const createRecurringRunParams: Partial<PipelineRunJobKFv2> = {
        display_name: 'New job',
        description: 'New job description',
        recurring_run_id: 'new-job-id',
        runtime_config: {
          parameters: {
            min_max_scaler: false,
            neighbors: 1,
            standard_scaler: 'no',
          },
        },
      };

      // Mock experiments, pipelines & versions for form select dropdowns
      createSchedulePage.mockGetExperiments(mockExperiments);
      createSchedulePage.mockGetPipelines([mockPipeline]);
      createSchedulePage.mockGetPipelineVersions(
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findScheduleRunButton().click();
      verifyRelativeURL(`/pipelineRuns/${projectName}/pipelineRun/create?runType=scheduled`);
      createSchedulePage.find();

      // Fill out the form with a schedule and submit
      createSchedulePage.fillName('New job');
      createSchedulePage.fillDescription('New job description');
      createSchedulePage.findExperimentSelect().should('not.be.disabled').click();
      createSchedulePage.selectExperimentByName('Test experiment 1');
      createSchedulePage.findPipelineSelect().should('not.be.disabled').click();
      createSchedulePage.selectPipelineByName('Test pipeline');
      createSchedulePage.findPipelineVersionSelect().should('not.be.disabled');

      const parameters = createRecurringRunParams.runtime_config?.parameters || {};
      const paramsSection = createRunPage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').click();
      paramsSection.fillParamInputById('neighbors', String(parameters.neighbors));
      paramsSection.fillParamInputById('standard_scaler', String(parameters.standard_scaler));
      createSchedulePage
        .mockCreateRecurringRun(mockPipelineVersion, createRecurringRunParams)
        .as('createSchedule');
      createSchedulePage.submit();

      cy.wait('@createSchedule').then((interception) => {
        expect(interception.request.body).to.eql({
          path: '/apis/v2beta1/recurringruns',
          method: 'POST',
          host: 'https://ds-pipeline-pipelines-definition-test-project-name.apps.user.com',
          queryParams: {},
          data: {
            display_name: 'New job',
            description: 'New job description',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: '8ce2d04a0-828c-45209fdf1c20',
            },
            runtime_config: {
              parameters: { min_max_scaler: false, neighbors: 1, standard_scaler: 'no' },
            },
            trigger: { periodic_schedule: { interval_second: '604800' } },
            max_concurrency: '10',
            mode: 'ENABLE',
            no_catchup: false,
            service_account: '',
            experiment_id: 'experiment-1',
          },
        });
      });

      // Should be redirected to the schedule details page
      verifyRelativeURL(
        `/pipelineRuns/${projectName}/pipelineRunJob/view/${createRecurringRunParams.recurring_run_id}`,
      );
    });

    it('duplicates a schedule', () => {
      const [mockRecurringRun] = initialMockRecurringRuns;
      const mockExperiment = mockExperiments[0];
      const mockDuplicateRecurringRun = buildMockJobKF({
        display_name: 'Duplicate of Test job',
        recurring_run_id: 'duplicate-job-id',
        experiment_id: mockExperiment.experiment_id,
      });

      // Mock experiments, pipelines & versions for form select dropdowns
      cloneSchedulePage.mockGetExperiments(mockExperiments);
      cloneSchedulePage.mockGetPipelines([mockPipeline]);
      cloneSchedulePage.mockGetPipelineVersions(
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );
      cloneSchedulePage.mockGetRecurringRun(mockRecurringRun);
      cloneSchedulePage.mockGetPipelineVersion(mockPipelineVersion);
      cloneSchedulePage.mockGetPipeline(mockPipeline);
      cloneSchedulePage.mockGetExperiment(mockExperiment);

      // Navigate to clone run page for a given schedule
      pipelineRunJobTable
        .getRowByName(mockRecurringRun.display_name)
        .findKebabAction('Duplicate')
        .click();
      verifyRelativeURL(
        `/pipelineRuns/${projectName}/pipelineRun/cloneJob/${mockRecurringRun.recurring_run_id}?runType=scheduled`,
      );

      // Verify pre-populated values & submit
      cloneSchedulePage.findExperimentSelect().should('have.text', mockExperiment.display_name);
      cloneSchedulePage.findPipelineSelect().should('have.text', mockPipeline.display_name);
      cloneSchedulePage
        .findPipelineVersionSelect()
        .should('have.text', mockPipelineVersion.display_name);
      const paramsSection = cloneSchedulePage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').should('be.checked');
      paramsSection.findParamById('neighbors').find('input').should('have.value', '0');
      paramsSection.findParamById('standard_scaler').should('have.value', 'yes');
      cloneSchedulePage
        .mockCreateRecurringRun(mockPipelineVersion, mockDuplicateRecurringRun)
        .as('duplicateSchedule');
      cloneSchedulePage.submit();

      cy.wait('@duplicateSchedule').then((interception) => {
        expect(interception.request.body).to.eql({
          path: '/apis/v2beta1/recurringruns',
          method: 'POST',
          host: 'https://ds-pipeline-pipelines-definition-test-project-name.apps.user.com',
          queryParams: {},
          data: {
            display_name: 'Duplicate of Test job',
            description: '',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: '8ce2d04a0-828c-45209fdf1c20',
            },
            runtime_config: {
              parameters: { min_max_scaler: false, neighbors: 0, standard_scaler: 'yes' },
            },
            trigger: {
              periodic_schedule: {
                interval_second: '60',
                start_time: '2024-02-08T14:56:00.000Z',
                end_time: '2024-02-08T15:00:00.000Z',
              },
            },
            max_concurrency: '10',
            mode: 'ENABLE',
            no_catchup: false,
            service_account: '',
            experiment_id: 'experiment-1',
          },
        });
      });

      // Should be redirected to the schedule details page
      verifyRelativeURL(
        `/pipelineRuns/${projectName}/pipelineRunJob/view/${mockDuplicateRecurringRun.recurring_run_id}`,
      );
    });

    it('shows cron & periodic fields', () => {
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findScheduledRunTypeSelector().click();
      createSchedulePage.findScheduledRunTypeSelectorPeriodic().click();
      createSchedulePage.findScheduledRunRunEvery().should('exist');
      createSchedulePage.findScheduledRunCron().should('not.exist');

      createSchedulePage.findScheduledRunTypeSelector().click();
      createSchedulePage.findScheduledRunTypeSelectorCron().click();
      createSchedulePage.findScheduledRunCron().should('exist');
      createSchedulePage.findScheduledRunRunEvery().should('not.exist');
    });

    it('should start concurrent at the max, 10', () => {
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldMinus().should('be.enabled');
      createSchedulePage.findMaxConcurrencyFieldPlus().should('be.disabled');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '10');
    });

    it('should allow the concurrency to update via +/-', () => {
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldMinus().click();
      createSchedulePage.findMaxConcurrencyFieldMinus().click();
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '8');

      createSchedulePage.findMaxConcurrencyFieldPlus().click();
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '9');
    });

    it('should not allow concurrency to go under or above the bounds', () => {
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldValue().fill('0');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', 1);

      createSchedulePage.findMaxConcurrencyFieldValue().fill('20');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', 10);
    });

    it('should hide and show date toggles', () => {
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findStartDatePickerDate().should('not.be.visible');
      createSchedulePage.findStartDatePickerTime().should('not.be.visible');
      createSchedulePage.findStartDatePickerSwitch().click();
      createSchedulePage.findStartDatePickerDate().should('be.visible');
      createSchedulePage.findStartDatePickerTime().should('be.visible');

      createSchedulePage.findEndDatePickerDate().should('not.be.visible');
      createSchedulePage.findEndDatePickerTime().should('not.be.visible');
      createSchedulePage.findEndDatePickerSwitch().click();
      createSchedulePage.findEndDatePickerDate().should('be.visible');
      createSchedulePage.findEndDatePickerTime().should('be.visible');
    });

    it('should see catch up is enabled by default', () => {
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findCatchUpSwitchValue().should('be.checked');
      createSchedulePage.findCatchUpSwitch().click();
      createSchedulePage.findCatchUpSwitchValue().should('not.be.checked');
    });
  });
});

const initIntercepts = () => {
  statusIntercept();
  configIntercept();
  dspaIntercepts(projectName);
  projectsIntercept([{ k8sName: projectName, displayName: 'Test project' }]);

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v2beta1/recurringruns',
    },
    { recurringRuns: initialMockRecurringRuns, total_size: initialMockRecurringRuns.length },
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v2beta1/runs',
    },
    { runs: initialMockRuns, total_size: initialMockRuns.length },
  );
};
