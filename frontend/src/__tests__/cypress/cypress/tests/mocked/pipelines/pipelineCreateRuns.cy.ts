/* eslint-disable camelcase */
import type { PipelineRecurringRunKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import {
  buildMockRunKF,
  buildMockPipelineV2,
  buildMockPipelineVersionV2,
  buildMockRecurringRunKF,
  buildMockExperimentKF,
} from '~/__mocks__';
import {
  createRunPage,
  cloneRunPage,
  pipelineRecurringRunTable,
  pipelineRunsGlobal,
  activeRunsTable,
  createSchedulePage,
  cloneSchedulePage,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { getCorePipelineSpec } from '~/concepts/pipelines/getCorePipelineSpec';
import { configIntercept, dspaIntercepts, projectsIntercept } from './intercepts';

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
  buildMockRecurringRunKF({
    pipeline_version_reference: pipelineVersionRef,
    experiment_id: 'experiment-1',
  }),
];

const visitLegacyRunsPage = (pipelineId?: string, versionId?: string) =>
  pipelineRunsGlobal.visit(
    projectName,
    pipelineId || mockPipelineVersion.pipeline_id,
    versionId || mockPipelineVersion.pipeline_version_id,
  );

describe('Pipeline create runs', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('renders the page with scheduled and active runs table data', () => {
    visitLegacyRunsPage();

    pipelineRunsGlobal.findSchedulesTab().click();
    pipelineRecurringRunTable.getRowByName('Test recurring run').find().should('exist');

    pipelineRunsGlobal.findActiveRunsTab().click();
    activeRunsTable.getRowByName('Test run').find().should('exist');
  });

  describe('Runs', () => {
    it('switches to scheduled runs from triggered', () => {
      visitLegacyRunsPage();

      // Mock experiments, pipelines & versions for form select dropdowns
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/runs/create`,
      );
      createRunPage.find();
      createRunPage.findRunTypeSwitchLink().click();
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/schedules/create`,
      );
    });

    it('creates an active run', () => {
      visitLegacyRunsPage();

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
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/runs/create`,
      );
      createRunPage.find();

      // Fill out the form without a schedule and submit
      createRunPage.fillName(initialMockRuns[0].display_name);
      cy.findByTestId('duplicate-name-help-text').should('be.visible');
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
      createRunPage
        .mockCreateRun(projectName, mockPipelineVersion, createRunParams)
        .as('createRun');
      createRunPage.submit();

      cy.wait('@createRun').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: 'New run',
          description: 'New run description',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline',
            pipeline_version_id: 'test-pipeline-version',
          },
          runtime_config: {
            parameters: { min_max_scaler: false, neighbors: 1, standard_scaler: 'yes' },
          },
          service_account: '',
          experiment_id: 'experiment-1',
        });
      });

      // Should be redirected to the run details page
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/runs/${createRunParams.run_id}`,
      );
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
      cloneRunPage.mockGetExperiments(projectName, mockExperiments);
      cloneRunPage.mockGetPipelines(projectName, [mockPipeline]);
      cloneRunPage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );
      cloneRunPage.mockGetRun(projectName, mockRun);
      cloneRunPage.mockGetPipelineVersion(projectName, mockPipelineVersion);
      cloneRunPage.mockGetPipeline(projectName, mockPipeline);
      cloneRunPage.mockGetExperiment(projectName, mockExperiment);

      // Mock runs list with newly cloned run
      activeRunsTable.mockGetActiveRuns([...initialMockRuns, mockDuplicateRun], projectName);

      // Navigate to clone run page for a given active run
      cy.visitWithLogin(`/experiments/${projectName}/experiment-1/runs`);
      pipelineRunsGlobal.findActiveRunsTab().click();
      activeRunsTable.getRowByName(mockRun.display_name).findKebabAction('Duplicate').click();
      verifyRelativeURL(`/experiments/${projectName}/experiment-1/runs/clone/${mockRun.run_id}`);

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

      cloneRunPage
        .mockCreateRun(projectName, mockPipelineVersion, mockDuplicateRun)
        .as('duplicateRun');
      cloneRunPage.submit();

      cy.wait('@duplicateRun').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: 'Duplicate of Test run',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline',
            pipeline_version_id: 'test-pipeline-version',
          },
          runtime_config: {
            parameters: { min_max_scaler: false, neighbors: 1, standard_scaler: false },
          },
          service_account: '',
          experiment_id: 'experiment-1',
        });
      });

      // Should redirect to the details of the newly cloned active run
      verifyRelativeURL(`/experiments/${projectName}/experiment-1/runs/${mockDuplicateRun.run_id}`);
    });

    it('create run with default and optional parameters', () => {
      visitLegacyRunsPage();

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
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
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
                      defaultValue: 7.0,
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
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/runs/create`,
      );
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

      paramsSection.findParamById('double_param').should('have.value', '7.0');
      cy.findByTestId('double_param-form-group').should('not.have.text', '*', { exact: false });
      cy.findByTestId('double_param-helper-text').should('have.text', 'Some double helper text');

      paramsSection.findParamById('int_param').find('input').should('have.value', '1');
      paramsSection.findParamById('struct_param').should('have.value', '{"default":"value"}');
      paramsSection.findParamById('list_param').should('have.value', '[{"default":"value"}]');
      paramsSection.findParamById('radio-bool_param-true').should('be.checked');

      // Clear optional parameter then submit
      paramsSection.findParamById('double_param').clear();
      createRunPage
        .mockCreateRun(projectName, mockPipelineVersion, createRunParams)
        .as('createRuns');
      createRunPage.submit();

      cy.wait('@createRuns').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: 'New run',
          description: '',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline',
            pipeline_version_id: 'test-pipeline-version',
          },
          runtime_config: createRunParams.runtime_config,
          service_account: '',
          experiment_id: 'experiment-1',
        });
      });

      // Should be redirected to the run details page
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/runs/${createRunParams.run_id}`,
      );
    });

    it('create run with all parameter types', () => {
      visitLegacyRunsPage();

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
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
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
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/runs/create`,
      );
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

      createRunPage
        .mockCreateRun(projectName, mockPipelineVersion, createRunParams)
        .as('createRuns');
      createRunPage.submit();

      cy.wait('@createRuns').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: 'New run',
          description: '',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline',
            pipeline_version_id: 'test-pipeline-version',
          },
          runtime_config: createRunParams.runtime_config,
          service_account: '',
          experiment_id: 'experiment-1',
        });
      });
      // Should be redirected to the run details page
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/runs/${createRunParams.run_id}`,
      );
    });
  });

  describe('Schedules', () => {
    beforeEach(() => {
      mockExperiments.forEach((experiment) => {
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId',
          {
            path: {
              namespace: projectName,
              serviceName: 'dspa',
              experimentId: experiment.experiment_id,
            },
          },
          experiment,
        );
      });
    });

    it('switches to scheduled runs from triggered', () => {
      visitLegacyRunsPage();
      pipelineRunsGlobal.findSchedulesTab().click();

      // Mock experiments, pipelines & versions for form select dropdowns
      createSchedulePage.mockGetExperiments(projectName, mockExperiments);
      createSchedulePage.mockGetPipelines(projectName, [mockPipeline]);
      createSchedulePage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findScheduleRunButton().click();
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/schedules/create`,
      );
      createSchedulePage.find();
      createSchedulePage.findRunTypeSwitchLink().click();
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/runs/create`,
      );
    });

    it('creates a schedule', () => {
      visitLegacyRunsPage();
      pipelineRunsGlobal.findSchedulesTab().click();

      const createRecurringRunParams: Partial<PipelineRecurringRunKFv2> = {
        display_name: 'New recurring run',
        description: 'New recurring run description',
        recurring_run_id: 'new-recurring-run-id',
        runtime_config: {
          parameters: {
            min_max_scaler: false,
            neighbors: 1,
            standard_scaler: 'no',
          },
        },
      };

      // Mock experiments, pipelines & versions for form select dropdowns
      createSchedulePage.mockGetExperiments(projectName, mockExperiments);
      createSchedulePage.mockGetPipelines(projectName, [mockPipeline]);
      createSchedulePage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findScheduleRunButton().click();
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/schedules/create`,
      );
      createSchedulePage.find();

      // Fill out the form with a schedule and submit
      createRunPage.fillName(initialMockRecurringRuns[0].display_name);
      cy.findByTestId('duplicate-name-help-text').should('be.visible');
      createSchedulePage.fillName('New recurring run');
      createSchedulePage.fillDescription('New recurring run description');
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
        .mockCreateRecurringRun(projectName, mockPipelineVersion, createRecurringRunParams)
        .as('createSchedule');
      createSchedulePage.submit();

      cy.wait('@createSchedule').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: 'New recurring run',
          description: 'New recurring run description',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline',
            pipeline_version_id: 'test-pipeline-version',
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
        });
      });

      // Should be redirected to the schedule details page
      verifyRelativeURL(
        `/pipelines/${projectName}/${mockPipelineVersion.pipeline_id}/${mockPipelineVersion.pipeline_version_id}/schedules/${createRecurringRunParams.recurring_run_id}`,
      );
    });

    it('duplicates a schedule', () => {
      const [mockRecurringRun] = initialMockRecurringRuns;
      const mockExperiment = mockExperiments[0];
      const mockDuplicateRecurringRun = buildMockRecurringRunKF({
        display_name: 'Duplicate of Test recurring run',
        recurring_run_id: 'duplicate-recurring-run-id',
        experiment_id: mockExperiment.experiment_id,
      });

      // Mock experiments, pipelines & versions for form select dropdowns
      cloneSchedulePage.mockGetExperiments(projectName, mockExperiments);
      cloneSchedulePage.mockGetPipelines(projectName, [mockPipeline]);
      cloneSchedulePage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );
      cloneSchedulePage.mockGetRecurringRun(projectName, mockRecurringRun);
      cloneSchedulePage.mockGetPipelineVersion(projectName, mockPipelineVersion);
      cloneSchedulePage.mockGetPipeline(projectName, mockPipeline);
      cloneSchedulePage.mockGetExperiment(projectName, mockExperiment);

      // Navigate to clone run page for a given schedule
      cy.visitWithLogin(`/experiments/${projectName}/experiment-1/runs`);
      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRecurringRunTable
        .getRowByName(mockRecurringRun.display_name)
        .findKebabAction('Duplicate')
        .click();
      verifyRelativeURL(
        `/experiments/${projectName}/experiment-1/schedules/clone/${mockRecurringRun.recurring_run_id}`,
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
        .mockCreateRecurringRun(projectName, mockPipelineVersion, mockDuplicateRecurringRun)
        .as('duplicateSchedule');
      cloneSchedulePage.submit();

      cy.wait('@duplicateSchedule').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: 'Duplicate of Test recurring run',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline',
            pipeline_version_id: 'test-pipeline-version',
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
        });
      });

      // Should be redirected to the schedule details page
      verifyRelativeURL(
        `/experiments/${projectName}/experiment-1/schedules/${mockDuplicateRecurringRun.recurring_run_id}`,
      );
    });

    it('shows cron & periodic fields', () => {
      visitLegacyRunsPage();

      pipelineRunsGlobal.findSchedulesTab().click();
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
      visitLegacyRunsPage();

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldMinus().should('be.enabled');
      createSchedulePage.findMaxConcurrencyFieldPlus().should('be.disabled');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '10');
    });

    it('should allow the concurrency to update via +/-', () => {
      visitLegacyRunsPage();

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldMinus().click();
      createSchedulePage.findMaxConcurrencyFieldMinus().click();
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '8');

      createSchedulePage.findMaxConcurrencyFieldPlus().click();
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '9');
    });

    it('should not allow concurrency to go under or above the bounds', () => {
      visitLegacyRunsPage();

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldValue().fill('0');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', 1);

      createSchedulePage.findMaxConcurrencyFieldValue().fill('20');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', 10);
    });

    it('should hide and show date toggles', () => {
      visitLegacyRunsPage();

      pipelineRunsGlobal.findSchedulesTab().click();
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
      visitLegacyRunsPage();

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findCatchUpSwitchValue().should('be.checked');
      createSchedulePage.findCatchUpSwitch().click();
      createSchedulePage.findCatchUpSwitchValue().should('not.be.checked');
    });
  });
});

const initIntercepts = () => {
  configIntercept();
  dspaIntercepts(projectName);
  projectsIntercept([{ k8sName: projectName, displayName: 'Test project' }]);
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    { recurringRuns: initialMockRecurringRuns, total_size: initialMockRecurringRuns.length },
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    { runs: initialMockRuns, total_size: initialMockRuns.length },
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: mockPipelineVersion.pipeline_id,
      },
    },
    buildMockPipelineV2({
      pipeline_id: mockPipelineVersion.pipeline_id,
    }),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: mockPipelineVersion.pipeline_id,
        pipelineVersionId: mockPipelineVersion.pipeline_version_id,
      },
    },
    buildMockPipelineVersionV2({
      pipeline_id: mockPipelineVersion.pipeline_id,
      pipeline_version_id: mockPipelineVersion.pipeline_version_id,
    }),
  );
};
