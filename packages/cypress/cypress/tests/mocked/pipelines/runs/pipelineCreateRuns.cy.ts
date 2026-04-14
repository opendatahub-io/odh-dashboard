/* eslint-disable camelcase */
import type {
  PipelineRecurringRunKF,
  PipelineRunKF,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import {
  InputDefinitionParameterType,
  StorageStateKF,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import {
  buildMockRunKF,
  buildMockPipeline,
  buildMockPipelineVersion,
  buildMockRecurringRunKF,
  buildMockExperimentKF,
  mockDashboardConfig,
  mockArgoWorkflowPipelineVersion,
} from '@odh-dashboard/internal/__mocks__';
import { getCorePipelineSpec } from '@odh-dashboard/internal/concepts/pipelines/getCorePipelineSpec';
import {
  createRunPage,
  duplicateRunPage,
  pipelineRecurringRunTable,
  pipelineRunsGlobal,
  activeRunsTable,
  createSchedulePage,
  duplicateSchedulePage,
  pipelineVersionImportModal,
} from '../../../../pages/pipelines';
import { verifyRelativeURL } from '../../../../utils/url';
import { configIntercept, dspaIntercepts, projectsIntercept } from '../intercepts';

const projectName = 'test-project-name';
const mockPipeline = buildMockPipeline();
const mockPipelineVersion = buildMockPipelineVersion({ pipeline_id: mockPipeline.pipeline_id });
const mockPipelineVersions = [
  {
    ...mockPipelineVersion,
    display_name: 'Test pipeline version (latest)',
    pipeline_version_id: 'latest',
  },
  {
    ...mockPipelineVersion,
    display_name: 'Test pipeline version (old)',
    pipeline_version_id: 'old',
  },
  {
    ...mockPipelineVersion,
    display_name: 'Test pipeline version (oldest)',
    pipeline_version_id: 'oldest',
  },
];
const mockPipelineVersionWithEmpties = buildMockPipelineVersion(
  {
    pipeline_id: mockPipeline.pipeline_id,
  },
  {
    parameters: {
      min_max_scaler: {
        parameterType: InputDefinitionParameterType.BOOLEAN,
      },
      neighbors: {
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      standard_scaler: {
        parameterType: InputDefinitionParameterType.STRING,
      },
      empty_param_1: {
        parameterType: InputDefinitionParameterType.STRING,
        isOptional: true,
      },
      empty_param_2: {
        parameterType: InputDefinitionParameterType.STRING,
        isOptional: true,
      },
    },
  },
);
const mockArgoPipelineVersion = mockArgoWorkflowPipelineVersion({});
const pipelineVersionRef = {
  pipeline_id: mockPipeline.pipeline_id,
  pipeline_version_id: mockPipelineVersion.pipeline_version_id,
};
const mockExperiments = [
  buildMockExperimentKF({
    display_name: 'Test experiment 1',
    experiment_id: 'experiment-1',
    created_at: '2024-01-30T15:46:33Z',
  }),
  buildMockExperimentKF({
    display_name: 'Test experiment 2',
    experiment_id: 'experiment-2',
  }),
  buildMockExperimentKF({
    display_name: 'Default',
    experiment_id: 'default',
    storage_state: StorageStateKF.ARCHIVED,
    created_at: '2024-01-29T15:46:33Z',
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
const mockPipelineYamlPath = `./cypress/tests/mocked/pipelines/mock-upload-pipeline.yaml`;

describe('Pipeline create runs', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('renders the page with scheduled and active runs table data', () => {
    pipelineRunsGlobal.visit(projectName);

    pipelineRunsGlobal.findSchedulesTab().click();
    pipelineRecurringRunTable.getRowByName('Test recurring run').find().should('exist');

    pipelineRunsGlobal.findActiveRunsTab().click();
    activeRunsTable.getRowByName('Test run').find().should('exist');
  });

  describe('Runs', () => {
    describe('MLflow integration', () => {
      beforeEach(() => {
        cy.interceptOdh('GET /api/config', mockDashboardConfig({ mlflowPipelines: true }));
        pipelineRunsGlobal.visit(projectName);

        createRunPage.mockGetExperiments(projectName, mockExperiments);
        createRunPage.mockGetPipelines(projectName, [mockPipeline]);
        createRunPage.mockGetPipelineVersions(
          projectName,
          [mockPipelineVersion],
          mockPipelineVersion.pipeline_id,
        );
        createRunPage.mockGetMlflowExperiments(projectName, [
          { id: 'mlflow-exp-1', name: 'MLflow experiment 1' },
        ]);

        pipelineRunsGlobal.findCreateRunButton().click();
        createRunPage.find();
      });

      it('creates an active run with MLflow plugin payload', () => {
        const createRunParams = {
          display_name: 'Run with mlflow',
          description: 'Run with mlflow description',
          run_id: 'run-with-mlflow-id',
          runtime_config: {
            parameters: {
              min_max_scaler: false,
              neighbors: 2,
              standard_scaler: 'yes',
            },
          },
        } satisfies Partial<PipelineRunKF>;

        createRunPage.fillName(createRunParams.display_name);
        createRunPage.fillDescription(createRunParams.description);
        createRunPage.fillRunGroup('Test experiment 1');
        createRunPage.pipelineSelect.findToggleButton().click();
        createRunPage.selectPipelineByName('Test pipeline');
        createRunPage.mlflowExperimentSelect.findToggleButton().click();
        createRunPage.selectMlflowExperimentByName('MLflow experiment 1');

        fillDefaultMlflowRunParams();

        createRunPage
          .mockCreateRun(projectName, mockPipelineVersion, createRunParams)
          .as('createRunWithMlflow');
        createRunPage.submit();

        cy.wait('@createRunWithMlflow').then((interception) => {
          expect(interception.request.body).to.eql({
            display_name: 'Run with mlflow',
            description: 'Run with mlflow description',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: 'test-pipeline-version',
            },
            runtime_config: {
              parameters: {
                min_max_scaler: false,
                neighbors: 2,
                standard_scaler: 'yes',
              },
            },
            service_account: '',
            experiment_id: 'experiment-1',
            plugins_input: {
              mlflow: {
                experiment_name: 'MLflow experiment 1',
              },
            },
          });
        });
      });

      it('keeps submit disabled when MLflow existing mode has no selected experiment', () => {
        createRunPage.fillName('Run with missing mlflow selection');
        createRunPage.fillRunGroup('Test experiment 1');
        createRunPage.pipelineSelect.findToggleButton().click();
        createRunPage.selectPipelineByName('Test pipeline');

        fillDefaultMlflowRunParams();

        createRunPage.findSubmitButton().should('be.disabled');
      });

      it('keeps submit disabled when switching to new MLflow mode with empty name', () => {
        createRunPage.fillName('Run with empty new mlflow experiment');
        createRunPage.fillRunGroup('Test experiment 1');
        createRunPage.pipelineSelect.findToggleButton().click();
        createRunPage.selectPipelineByName('Test pipeline');
        createRunPage.mlflowExperimentSelect.findToggleButton().click();
        createRunPage.selectMlflowExperimentByName('MLflow experiment 1');

        fillDefaultMlflowRunParams();

        createRunPage.findSubmitButton().should('be.enabled');

        createRunPage.findMlflowNewRadio().click();
        createRunPage.findMlflowNewExperimentNameInput().type('   ');
        createRunPage.findSubmitButton().should('be.disabled');
      });

      it('creates a run with MLflow tracking disabled and disabled flag in plugins_input', () => {
        const createRunParams = {
          display_name: 'Run without mlflow',
          description: '',
          run_id: 'run-no-mlflow-id',
          runtime_config: {
            parameters: {
              min_max_scaler: false,
              neighbors: 2,
              standard_scaler: 'yes',
            },
          },
        } satisfies Partial<PipelineRunKF>;

        createRunPage.fillName(createRunParams.display_name);
        createRunPage.fillRunGroup('Test experiment 1');
        createRunPage.pipelineSelect.findToggleButton().click();
        createRunPage.selectPipelineByName('Test pipeline');

        createRunPage.findMlflowExperimentTrackingToggle().should('be.visible');
        createRunPage.findMlflowExperimentTrackingToggle().click();

        fillDefaultMlflowRunParams();

        createRunPage
          .mockCreateRun(projectName, mockPipelineVersion, createRunParams)
          .as('createRunNoMlflow');
        createRunPage.submit();

        cy.wait('@createRunNoMlflow').then((interception) => {
          expect(interception.request.body).to.eql({
            display_name: 'Run without mlflow',
            description: '',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: 'test-pipeline-version',
            },
            runtime_config: {
              parameters: {
                min_max_scaler: false,
                neighbors: 2,
                standard_scaler: 'yes',
              },
            },
            service_account: '',
            experiment_id: 'experiment-1',
            plugins_input: {
              mlflow: {
                disabled: true,
              },
            },
          });
        });
      });

      it('creates a run with a new MLflow experiment name', () => {
        const createRunParams = {
          display_name: 'Run with new mlflow experiment',
          description: '',
          run_id: 'run-new-mlflow-id',
          runtime_config: {
            parameters: {
              min_max_scaler: false,
              neighbors: 2,
              standard_scaler: 'yes',
            },
          },
        } satisfies Partial<PipelineRunKF>;

        createRunPage.fillName(createRunParams.display_name);
        createRunPage.fillRunGroup('Test experiment 1');
        createRunPage.pipelineSelect.findToggleButton().click();
        createRunPage.selectPipelineByName('Test pipeline');

        createRunPage.findMlflowNewRadio().click();
        createRunPage.findMlflowNewExperimentNameInput().type('My brand new experiment');

        fillDefaultMlflowRunParams();

        createRunPage
          .mockCreateRun(projectName, mockPipelineVersion, createRunParams)
          .as('createRunNewMlflow');
        createRunPage.submit();

        cy.wait('@createRunNewMlflow').then((interception) => {
          expect(interception.request.body).to.eql({
            display_name: 'Run with new mlflow experiment',
            description: '',
            pipeline_version_reference: {
              pipeline_id: 'test-pipeline',
              pipeline_version_id: 'test-pipeline-version',
            },
            runtime_config: {
              parameters: {
                min_max_scaler: false,
                neighbors: 2,
                standard_scaler: 'yes',
              },
            },
            service_account: '',
            experiment_id: 'experiment-1',
            plugins_input: {
              mlflow: {
                experiment_name: 'My brand new experiment',
              },
            },
          });
        });
      });
    });

    it('keeps submit disabled when run group is empty', () => {
      pipelineRunsGlobal.visit(projectName);

      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );

      pipelineRunsGlobal.findCreateRunButton().click();
      createRunPage.find();

      createRunPage.fillName('Run with empty run group');
      createRunPage.pipelineSelect.findToggleButton().click();
      createRunPage.selectPipelineByName('Test pipeline');

      const paramsSection = createRunPage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').click();
      paramsSection.fillParamInputById('neighbors', '2');
      paramsSection.fillParamInputById('standard_scaler', 'yes');

      createRunPage.findRunGroupInput().should('have.value', '');
      createRunPage.findSubmitButton().should('be.disabled');
    });

    it('switches to scheduled runs from triggered', () => {
      pipelineRunsGlobal.visit(projectName);

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
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
      createRunPage.find();
      createRunPage.findRunTypeSwitchLink().click();
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/schedules/create`);
    });

    it('Unsupported pipeline should not be displayed', () => {
      pipelineRunsGlobal.visit(projectName);

      // Mock experiments, pipelines & versions for form select dropdowns
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
        [mockArgoPipelineVersion, mockPipelineVersion],
        mockArgoPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
      createRunPage.find();

      createRunPage.pipelineSelect.findToggleButton().should('not.be.disabled').click();
      createRunPage.selectPipelineByName('Test pipeline');
      createRunPage.pipelineVersionSelect.findToggleButton().should('not.be.disabled').click();
      createRunPage.findPipelineVersionByName('argo unsupported').should('not.exist');
    });

    it('creates an active run', () => {
      pipelineRunsGlobal.visit(projectName);

      const createRunParams = {
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
      } satisfies Partial<PipelineRunKF>;

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
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
      createRunPage.find();

      const veryLongDesc = 'Test description'.repeat(30); // A string over 255 characters
      // Fill out the form without a schedule and submit
      createRunPage.fillName(initialMockRuns[0].display_name);
      cy.findByTestId('duplicate-name-help-text').should('be.visible');
      createRunPage.fillName('New run');
      createRunPage.fillDescription(veryLongDesc);
      createRunPage.findRunGroupInput().should('have.value', '');
      createRunPage.fillRunGroup('Test experiment 1');
      createRunPage.pipelineSelect.findToggleButton().should('not.be.disabled').click();
      createRunPage.selectPipelineByName('Test pipeline');
      createRunPage.pipelineVersionSelect.findToggleButton().should('not.be.disabled');

      const { parameters } = createRunParams.runtime_config;
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
          description: veryLongDesc.substring(0, 255), // Verify the description in truncated
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
        `/develop-train/pipelines/runs/${projectName}/runs/${createRunParams.run_id}`,
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
      duplicateRunPage.mockGetExperiments(projectName, mockExperiments);
      duplicateRunPage.mockGetPipelines(projectName, [mockPipeline]);
      duplicateRunPage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersionWithEmpties],
        mockPipelineVersion.pipeline_id,
      );
      duplicateRunPage.mockGetRun(projectName, mockRun);
      duplicateRunPage.mockGetPipelineVersion(projectName, mockPipelineVersionWithEmpties);
      duplicateRunPage.mockGetPipeline(projectName, mockPipeline);
      duplicateRunPage.mockGetExperiment(projectName, mockExperiment);

      // Mock runs list with newly duplicated run
      activeRunsTable.mockGetActiveRuns([...initialMockRuns, mockDuplicateRun], projectName);

      // Navigate to duplicate run page for a given active run
      cy.visitWithLogin(`/develop-train/pipelines/runs/${projectName}/runs`);
      pipelineRunsGlobal.findActiveRunsTab().click();
      activeRunsTable.getRowByName(mockRun.display_name).findKebabAction('Duplicate').click();
      verifyRelativeURL(
        `/develop-train/pipelines/runs/${projectName}/runs/duplicate/${mockRun.run_id}`,
      );

      // Verify pre-populated values & submit
      duplicateRunPage.findRunGroupInput().should('have.value', mockExperiment.display_name);
      duplicateRunPage.pipelineSelect
        .findToggleButton()
        .should('have.text', mockPipeline.display_name);
      duplicateRunPage.pipelineVersionSelect
        .findToggleButton()
        .should('have.text', mockPipelineVersion.display_name);
      const paramsSection = duplicateRunPage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').should('be.checked');
      paramsSection.findParamById('neighbors').find('input').should('have.value', '1');
      paramsSection.findParamById('standard_scaler').should('have.value', 'false');
      paramsSection.findParamById('empty_param_1').should('have.value', '');
      paramsSection.findParamById('empty_param_2').should('have.value', '');

      duplicateRunPage
        .mockCreateRun(projectName, mockPipelineVersion, mockDuplicateRun)
        .as('duplicateRun');
      duplicateRunPage.submit();

      // don't include the empty params as they are not included in the request body
      // since they have no value
      cy.wait('@duplicateRun').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: 'Duplicate of Test run',
          description: '',
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

      // Should redirect to the details of the newly duplicated active run
      verifyRelativeURL(
        `/develop-train/pipelines/runs/${projectName}/runs/${mockDuplicateRun.run_id}`,
      );
    });

    it('create run with default and optional parameters', () => {
      pipelineRunsGlobal.visit(projectName);

      const createRunParams = {
        display_name: 'New run',
        description: 'New run description',
        run_id: 'new-run-id',
        runtime_config: {
          parameters: {
            string_param: 'String default value',
            int_param: 1,
            struct_param: { default: 'value' },
            list_param: [{ default: 'value' }],
            bool_param: true,
          },
        },
      } satisfies Partial<PipelineRunKF>;

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
                    optional_string_param: {
                      parameterType: InputDefinitionParameterType.STRING,
                      isOptional: true,
                      description: 'Some string helper text',
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
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
      createRunPage.find();

      // Fill required fields
      createRunPage.fillName('New run');
      createRunPage.fillRunGroup('Test experiment 1');
      createRunPage.pipelineSelect.findToggleButton().click();
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
      paramsSection.findParamById('optional_string_param').should('have.value', '');

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
        `/develop-train/pipelines/runs/${projectName}/runs/${createRunParams.run_id}`,
      );
    });

    it('create run with all parameter types', () => {
      pipelineRunsGlobal.visit(projectName);

      const createRunParams = {
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
      } satisfies Partial<PipelineRunKF>;

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
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
      createRunPage.find();

      // Fill out the form with all input parameters
      createRunPage.fillName('New run');
      createRunPage.fillRunGroup('Test experiment 1');
      createRunPage.pipelineSelect.findToggleButton().should('not.be.disabled').click();
      createRunPage.selectPipelineByName('Test pipeline');
      createRunPage.pipelineVersionSelect.findToggleButton().should('not.be.disabled');

      const { parameters } = createRunParams.runtime_config;
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
        `/develop-train/pipelines/runs/${projectName}/runs/${createRunParams.run_id}`,
      );
    });

    it('should not redirect user after creating a new pipeline version', () => {
      pipelineRunsGlobal.visit(projectName);

      const createRunParams = {
        display_name: 'New run with new version',
        description: 'New run description',
        run_id: 'new-run-id',
        runtime_config: {
          parameters: {
            min_max_scaler: false,
            neighbors: 1,
            standard_scaler: 'no',
          },
        },
      } satisfies Partial<PipelineRunKF>;

      const newPipelineVersion = {
        pipeline_id: mockPipeline.pipeline_id,
        display_name: 'New pipeline version',
        pipeline_version_id: 'new-pipeline-version',
        description: 'New pipeline description',
        package_url: {
          pipeline_url: 'https://example.com/pipeline.yaml',
        },
      };

      // Mock experiements, pipelines, and versions
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage
        .mockGetPipelineVersions(
          projectName,
          [mockPipelineVersion, buildMockPipelineVersion(newPipelineVersion)],
          mockPipeline.pipeline_id,
        )
        .as('getPipelineVersions');

      // Mock create new pipeline version
      createRunPage
        .mockCreatePipelineVersion(projectName, newPipelineVersion)
        .as('createPipelineVersion');

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
      createRunPage.find();

      // Fill required fields
      createRunPage.fillName('New run with new version');
      createRunPage.fillRunGroup('Test experiment 1');
      createRunPage.pipelineSelect.findToggleButton().click();
      createRunPage.selectPipelineByName('Test pipeline');

      // Wait for pipeline versions to load
      cy.wait('@getPipelineVersions');

      // open and populate modal
      createRunPage.findPipelineCreateVersionButton().click();

      pipelineVersionImportModal.find();
      pipelineVersionImportModal.fillVersionName(newPipelineVersion.display_name);
      pipelineVersionImportModal.fillVersionDescription(newPipelineVersion.description);
      pipelineVersionImportModal.uploadPipelineYaml(mockPipelineYamlPath);
      pipelineVersionImportModal.submit();

      cy.wait('@createPipelineVersion').then((interception) => {
        expect(interception.response?.body).to.include({
          display_name: 'New pipeline version',
          pipeline_id: mockPipeline.pipeline_id,
          pipeline_version_id: 'new-pipeline-version',
        });
      });

      createRunPage.pipelineVersionSelect.openAndSelectItem('New pipeline version');

      // verify the modal is closed and we have not been redirected
      pipelineVersionImportModal.find().should('not.exist');
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);

      // populate arbitrary parameters
      const runParameters = createRunParams.runtime_config.parameters;
      createRunPage.getParamsSection().findParamById('radio-min_max_scaler-false').click();
      createRunPage
        .getParamsSection()
        .fillParamInputById('neighbors', runParameters.neighbors.toString());
      createRunPage
        .getParamsSection()
        .fillParamInputById('standard_scaler', runParameters.standard_scaler);

      // submit
      createRunPage
        .mockCreateRun(projectName, mockPipelineVersion, createRunParams)
        .as('createRuns');
      createRunPage.submit();

      cy.wait('@createRuns');

      verifyRelativeURL(
        `/develop-train/pipelines/runs/${projectName}/runs/${createRunParams.run_id}`,
      );
    });

    it('shows the run group input instead of the experiment dropdown', () => {
      pipelineRunsGlobal.visit(projectName);
      // Mock experiments for run group validation
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      createRunPage.find();

      createRunPage.findRunGroupInput().should('be.visible').and('have.value', '');
    });
  });

  describe('Schedules', () => {
    it('switches to scheduled runs from triggered', () => {
      pipelineRunsGlobal.visit(projectName);
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
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/schedules/create`);
      createSchedulePage.find();
      createSchedulePage.findRunTypeSwitchLink().click();
      verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
    });

    it('creates a schedule', () => {
      createScheduleRunCommonTest();
      createSchedulePage.findRunGroupInput().should('have.value', '');
      createSchedulePage.fillRunGroup('Test experiment 1');
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

      // Navigate to the 'Create run' page

      verifyRelativeURL(
        `/develop-train/pipelines/runs/${projectName}/schedules/${createRecurringRunParams.recurring_run_id}`,
      );
    });

    it('creates a schedule with MLflow plugin payload', () => {
      cy.interceptOdh('GET /api/config', mockDashboardConfig({ mlflowPipelines: true }));
      pipelineRunsGlobal.visit(projectName);
      pipelineRunsGlobal.findSchedulesTab().click();

      createSchedulePage.mockGetExperiments(projectName, mockExperiments);
      createSchedulePage.mockGetPipelines(projectName, [mockPipeline]);
      createSchedulePage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );
      createSchedulePage.mockGetMlflowExperiments(projectName, [
        { id: 'mlflow-exp-1', name: 'MLflow experiment 1' },
      ]);

      pipelineRunsGlobal.findScheduleRunButton().click();
      createSchedulePage.find();

      createSchedulePage.fillName('Schedule with mlflow');
      createSchedulePage.fillDescription('Schedule with mlflow desc');
      createSchedulePage.fillRunGroup('Test experiment 1');
      createSchedulePage.pipelineSelect.findToggleButton().click();
      createSchedulePage.selectPipelineByName('Test pipeline');
      createSchedulePage.findUseFixedVersionRadio().click();
      createSchedulePage.pipelineVersionSelect.findToggleButton().should('not.be.disabled');

      createSchedulePage.mlflowExperimentSelect.findToggleButton().click();
      createSchedulePage.selectMlflowExperimentByName('MLflow experiment 1');

      const paramsSection = createSchedulePage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').click();
      paramsSection.fillParamInputById('neighbors', '1');
      paramsSection.fillParamInputById('standard_scaler', 'no');

      createSchedulePage
        .mockCreateRecurringRun(projectName, mockPipelineVersion, {
          ...createRecurringRunParams,
          display_name: 'Schedule with mlflow',
          description: 'Schedule with mlflow desc',
        })
        .as('createScheduleWithMlflow');
      createSchedulePage.submit();

      cy.wait('@createScheduleWithMlflow').then((interception) => {
        expect(interception.request.body).to.have.property('plugins_input');
        expect(interception.request.body.plugins_input).to.eql({
          mlflow: {
            experiment_name: 'MLflow experiment 1',
          },
        });
      });
    });

    it('creates a schedule with trigger type cron without whitespace', () => {
      // Fill out the form with a schedule and submit
      createScheduleRunCommonTest();
      createSchedulePage.fillRunGroup('Test experiment 1');
      createSchedulePage.findScheduledRunTypeSelector().findSelectOption('Cron').click();
      createSchedulePage.findScheduledRunCron().fill('@every 5m');
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
          trigger: { cron_schedule: { cron: '@every 5m' } },
          max_concurrency: '10',
          mode: 'ENABLE',
          no_catchup: false,
          service_account: '',
          experiment_id: 'experiment-1',
        });
      });

      // Should be redirected to the schedule details page
      verifyRelativeURL(
        `/develop-train/pipelines/runs/${projectName}/schedules/${createRecurringRunParams.recurring_run_id}`,
      );
    });

    it('creates a schedule with trigger type cron with whitespace', () => {
      createScheduleRunCommonTest();
      createSchedulePage.fillRunGroup('Test experiment 1');
      createSchedulePage.findScheduledRunTypeSelector().findSelectOption('Cron').click();
      createSchedulePage.findScheduledRunCron().fill('@every 5m ');
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
          trigger: { cron_schedule: { cron: '@every 5m' } },
          max_concurrency: '10',
          mode: 'ENABLE',
          no_catchup: false,
          service_account: '',
          experiment_id: 'experiment-1',
        });
      });
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
      duplicateSchedulePage.mockGetExperiments(projectName, mockExperiments);
      duplicateSchedulePage.mockGetPipelines(projectName, [mockPipeline]);
      duplicateSchedulePage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );
      duplicateSchedulePage.mockGetRecurringRun(projectName, mockRecurringRun);
      duplicateSchedulePage.mockGetPipelineVersion(projectName, mockPipelineVersion);
      duplicateSchedulePage.mockGetPipeline(projectName, mockPipeline);
      duplicateSchedulePage.mockGetExperiment(projectName, mockExperiment);

      // Navigate to duplicate run page for a given schedule
      cy.visitWithLogin(`/develop-train/pipelines/runs/${projectName}/schedules`);
      pipelineRecurringRunTable
        .getRowByName(mockRecurringRun.display_name)
        .findKebabAction('Duplicate')
        .click();
      verifyRelativeURL(
        `/develop-train/pipelines/runs/${projectName}/schedules/duplicate/${mockRecurringRun.recurring_run_id}`,
      );

      // Verify pre-populated values & submit
      duplicateSchedulePage.findRunGroupInput().should('have.value', mockExperiment.display_name);
      duplicateSchedulePage.pipelineSelect
        .findToggleButton()
        .should('have.text', mockPipeline.display_name);
      duplicateSchedulePage.findUseFixedVersionRadio().should('be.checked');
      duplicateSchedulePage.pipelineVersionSelect
        .findToggleButton()
        .should('have.text', mockPipelineVersion.display_name);
      const paramsSection = duplicateSchedulePage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').should('be.checked');
      paramsSection.findParamById('neighbors').find('input').should('have.value', '0');
      paramsSection.findParamById('standard_scaler').should('have.value', 'yes');
      duplicateSchedulePage
        .mockCreateRecurringRun(projectName, mockPipelineVersion, mockDuplicateRecurringRun)
        .as('duplicateSchedule');
      duplicateSchedulePage.submit();

      cy.wait('@duplicateSchedule').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: 'Duplicate of Test recurring run',
          description: '',
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
        `/develop-train/pipelines/runs/${projectName}/schedules/${mockDuplicateRecurringRun.recurring_run_id}`,
      );
    });

    it('duplicates a schedule with an archived experiment', () => {
      const [mockRecurringRun] = initialMockRecurringRuns;
      const mockExperiment = { ...mockExperiments[0], storage_state: StorageStateKF.ARCHIVED };

      // Mock experiments, pipelines & versions for form select dropdowns
      duplicateSchedulePage.mockGetExperiments(projectName, [
        mockExperiment,
        ...mockExperiments.slice(1),
      ]);
      duplicateSchedulePage.mockGetPipelines(projectName, [mockPipeline]);
      duplicateSchedulePage.mockGetPipelineVersions(
        projectName,
        [mockPipelineVersion],
        mockPipelineVersion.pipeline_id,
      );
      duplicateSchedulePage.mockGetRecurringRun(projectName, mockRecurringRun);
      duplicateSchedulePage.mockGetPipelineVersion(projectName, mockPipelineVersion);
      duplicateSchedulePage.mockGetPipeline(projectName, mockPipeline);
      duplicateSchedulePage.mockGetExperiment(projectName, mockExperiment);

      // Navigate to duplicate run page for a given schedule
      cy.visitWithLogin(`/develop-train/pipelines/runs/${projectName}/schedules`);
      pipelineRecurringRunTable
        .getRowByName(mockRecurringRun.display_name)
        .findKebabAction('Duplicate')
        .click();
      verifyRelativeURL(
        `/develop-train/pipelines/runs/${projectName}/schedules/duplicate/${mockRecurringRun.recurring_run_id}`,
      );

      // Verify pre-populated values
      duplicateSchedulePage.findRunGroupInput().should('have.value', mockExperiment.display_name);
    });

    it('shows cron & periodic fields', () => {
      pipelineRunsGlobal.visit(projectName);

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
      pipelineRunsGlobal.visit(projectName);

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldMinus().should('be.enabled');
      createSchedulePage.findMaxConcurrencyFieldPlus().should('be.disabled');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '10');
    });

    it('should allow the concurrency to update via +/-', () => {
      pipelineRunsGlobal.visit(projectName);

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldMinus().click();
      createSchedulePage.findMaxConcurrencyFieldMinus().click();
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '8');

      createSchedulePage.findMaxConcurrencyFieldPlus().click();
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', '9');
    });

    it('should not allow concurrency to go under or above the bounds', () => {
      pipelineRunsGlobal.visit(projectName);

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findMaxConcurrencyFieldValue().fill('0');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', 1);

      createSchedulePage.findMaxConcurrencyFieldValue().fill('20');
      createSchedulePage.findMaxConcurrencyFieldValue().should('have.value', 10);
    });

    it('should hide and show date toggles', () => {
      pipelineRunsGlobal.visit(projectName);

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
      pipelineRunsGlobal.visit(projectName);

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createSchedulePage.findCatchUpSwitchValue().should('be.checked');
      createSchedulePage.findCatchUpSwitch().click();
      createSchedulePage.findCatchUpSwitchValue().should('not.be.checked');
    });

    it('should not show the version selection area when the pipeline is not selected', () => {
      pipelineRunsGlobal.visit(projectName);

      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createRunPage.find();
      createRunPage.findPipelineNotSelectedAlert().should('exist');
      createRunPage.findUseLatestVersionRadio().should('not.exist');
    });

    it('should not show the version selection area when no pipeline versions are available', () => {
      pipelineRunsGlobal.visit(projectName);

      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(projectName, [], mockPipelineVersion.pipeline_id);

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createRunPage.find();
      createRunPage.pipelineSelect.findToggleButton().should('not.be.disabled').click();
      createRunPage.selectPipelineByName(mockPipeline.display_name);
      createRunPage.findNoPipelineVersionsAvailableAlert().should('exist');
      createRunPage.findUseLatestVersionRadio().should('not.exist');
    });

    it('should not include the pipeline version in the submission when the latest version is selected', () => {
      const createRunParams = {
        display_name: 'New run name',
        description: 'New run description',
        experiment_id: 'experiment-1',
        run_id: 'new-run-id',
        service_account: '',
        runtime_config: {
          parameters: {
            min_max_scaler: false,
            neighbors: 1,
            standard_scaler: 'yes',
          },
        },
      } satisfies Partial<PipelineRunKF>;

      pipelineRunsGlobal.visit(projectName);

      createRunPage
        .mockCreateRecurringRun(projectName, mockPipelineVersion, createRunParams)
        .as('submitRecurringRun');
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
        mockPipelineVersions,
        mockPipelineVersion.pipeline_id,
      );

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createRunPage.find();

      createRunPage.fillRunGroup(mockExperiments[0].display_name);

      createRunPage.fillName(createRunParams.display_name);
      createRunPage.fillDescription(createRunParams.description);

      createRunPage.pipelineSelect.findToggleButton().should('not.be.disabled').click();
      createRunPage.selectPipelineByName(mockPipeline.display_name);
      createRunPage.pipelineSelect
        .findToggleButton()
        .should('not.be.disabled')
        .should('have.text', mockPipeline.display_name);

      createRunPage.findUseLatestVersionRadio().should('be.checked');

      const { parameters } = createRunParams.runtime_config;
      const paramsSection = createRunPage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').click();
      paramsSection.fillParamInputById('neighbors', String(parameters.neighbors));
      paramsSection.fillParamInputById('standard_scaler', String(parameters.standard_scaler));

      createRunPage.submit();

      cy.wait('@submitRecurringRun').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: createRunParams.display_name,
          description: createRunParams.description,
          runtime_config: createRunParams.runtime_config,
          pipeline_version_reference: { pipeline_id: mockPipeline.pipeline_id },
          trigger: { periodic_schedule: { interval_second: '604800' } },
          max_concurrency: '10',
          mode: 'ENABLE',
          no_catchup: false,
          service_account: createRunParams.service_account,
          experiment_id: createRunParams.experiment_id,
        });
      });
    });

    it('should include the pipeline version in the submission when a fixed version is selected', () => {
      const createRunParams = {
        display_name: 'New run name',
        description: 'New run description',
        experiment_id: 'experiment-1',
        run_id: 'new-run-id',
        service_account: '',
        runtime_config: {
          parameters: {
            min_max_scaler: false,
            neighbors: 1,
            standard_scaler: 'yes',
          },
        },
      } satisfies Partial<PipelineRunKF>;

      pipelineRunsGlobal.visit(projectName);

      createRunPage
        .mockCreateRecurringRun(projectName, mockPipelineVersion, createRunParams)
        .as('submitRecurringRun');
      createRunPage.mockGetExperiments(projectName, mockExperiments);
      createRunPage.mockGetPipelines(projectName, [mockPipeline]);
      createRunPage.mockGetPipelineVersions(
        projectName,
        mockPipelineVersions,
        mockPipelineVersion.pipeline_id,
      );

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      createRunPage.find();

      createRunPage.fillRunGroup(mockExperiments[0].display_name);

      createRunPage.fillName(createRunParams.display_name);
      createRunPage.fillDescription(createRunParams.description);

      createRunPage.pipelineSelect.findToggleButton().should('not.be.disabled').click();
      createRunPage.selectPipelineByName(mockPipeline.display_name);
      createRunPage.pipelineSelect
        .findToggleButton()
        .should('not.be.disabled')
        .should('have.text', mockPipeline.display_name);

      const selectedPipelineVersion = mockPipelineVersions[1];
      createRunPage.findUseFixedVersionRadio().click();
      createRunPage.pipelineVersionSelect.openAndSelectItem(selectedPipelineVersion.display_name);

      const { parameters } = createRunParams.runtime_config;
      const paramsSection = createRunPage.getParamsSection();
      paramsSection.findParamById('radio-min_max_scaler-false').click();
      paramsSection.fillParamInputById('neighbors', String(parameters.neighbors));
      paramsSection.fillParamInputById('standard_scaler', String(parameters.standard_scaler));

      createRunPage.submit();

      cy.wait('@submitRecurringRun').then((interception) => {
        expect(interception.request.body).to.eql({
          display_name: createRunParams.display_name,
          description: createRunParams.description,
          pipeline_version_reference: {
            pipeline_id: mockPipeline.pipeline_id,
            pipeline_version_id: selectedPipelineVersion.pipeline_version_id,
          },
          runtime_config: createRunParams.runtime_config,
          trigger: { periodic_schedule: { interval_second: '604800' } },
          max_concurrency: '10',
          mode: 'ENABLE',
          no_catchup: false,
          service_account: createRunParams.service_account,
          experiment_id: createRunParams.experiment_id,
        });
      });
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
    buildMockPipeline({
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
    buildMockPipelineVersion({
      pipeline_id: mockPipelineVersion.pipeline_id,
      pipeline_version_id: mockPipelineVersion.pipeline_version_id,
    }),
  );

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
};

const createRecurringRunParams = {
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
} satisfies Partial<PipelineRecurringRunKF>;

const createScheduleRunCommonTest = () => {
  pipelineRunsGlobal.visit(projectName);
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
  verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/schedules/create`);
  createSchedulePage.find();
  createRunPage.fillName(initialMockRecurringRuns[0].display_name);
  cy.findByTestId('duplicate-name-help-text').should('be.visible');
  createSchedulePage.fillName('New recurring run');
  createSchedulePage.fillDescription('New recurring run description');
  createSchedulePage.pipelineSelect.findToggleButton().should('not.be.disabled').click();
  createSchedulePage.selectPipelineByName('Test pipeline');
  createSchedulePage.findUseFixedVersionRadio().click();
  createSchedulePage.pipelineVersionSelect.findToggleButton().should('not.be.disabled');
  const { parameters } = createRecurringRunParams.runtime_config;
  const paramsSection = createRunPage.getParamsSection();
  paramsSection.findParamById('radio-min_max_scaler-false').click();
  paramsSection.fillParamInputById('neighbors', String(parameters.neighbors));
  paramsSection.fillParamInputById('standard_scaler', String(parameters.standard_scaler));
};

const fillDefaultMlflowRunParams = () => {
  const paramsSection = createRunPage.getParamsSection();
  paramsSection.findParamById('radio-min_max_scaler-false').click();
  paramsSection.fillParamInputById('neighbors', '2');
  paramsSection.fillParamInputById('standard_scaler', 'yes');
};
