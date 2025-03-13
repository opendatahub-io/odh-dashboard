import {
  Breadcrumb,
  BreadcrumbItem,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  PageSection,
} from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import GenericSidebar from '~/components/GenericSidebar';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import { useValidation, ValidationContext } from '~/utilities/useValidation';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import {
  ModelCustomizationFormData,
  modelCustomizationFormSchema,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { useIlabPipeline } from '~/concepts/pipelines/content/modelCustomizationForm/useIlabPipeline';
import {
  ModelCustomizationEndpointType,
  FineTuneTaxonomyType,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  registeredModelUrl,
  modelVersionUrl,
  modelRegistryUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import { modelCustomizationRootPath, ModelCustomizationRouterState } from '~/routes';
import { createHyperParametersSchema } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/hyperparameterValidationUtils';
import { getInputDefinitionParams } from '~/concepts/pipelines/content/createRun/utils';
import { InferenceServiceStorageType } from '~/pages/modelServing/screens/types';
import ModelCustomizationDrawerContent, {
  ModelCustomizationDrawerContentArgs,
  ModelCustomizationDrawerContentRef,
} from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import FineTunePage from './FineTunePage';
import { FineTunePageSections, fineTunePageSectionTitles } from './const';
import { filterHyperparameters, getParamsValueFromPipelineInput } from './utils';

const ModelCustomizationForm: React.FC = () => {
  const { project } = usePipelinesAPI();
  const {
    ilabPipeline,
    ilabPipelineVersion,
    loaded: ilabPipelineLoaded,
    loadError: ilabPipelineLoadError,
  } = useIlabPipeline();

  const { state }: { state?: ModelCustomizationRouterState } = useLocation();

  const [data, setData] = useGenericObjectState<ModelCustomizationFormData>({
    projectName: { value: project.metadata.name },
    outputModel: {
      addToRegistryEnabled: false,
      outputModelRegistryName: state?.modelRegistryName,
      outputModelName: state?.registeredModelName,
      outputModelRegistryApiUrl: state?.outputModelRegistryApiUrl,
      connectionData: {
        type: InferenceServiceStorageType.EXISTING_STORAGE,
      },
    },
    baseModel: {
      sdgBaseModel: state?.inputModelLocationUri ?? '',
    },
    inputPipelineParameters: {},
    taxonomy: {
      url: '',

      secret: {
        type: FineTuneTaxonomyType.SSH_KEY,
        sshKey: '',
      },
    },
    teacher: {
      endpointType: ModelCustomizationEndpointType.PUBLIC,
      apiToken: '',
      endpoint: '',
      modelName: '',
    },
    judge: {
      endpointType: ModelCustomizationEndpointType.PUBLIC,
      apiToken: '',
      endpoint: '',
      modelName: '',
    },
    trainingNode: 1,
    storageClass: '',
    hardware: {
      podSpecOptions: {
        cpuCount: 0,
        memoryCount: '0',
        gpuCount: 0,
        gpuIdentifier: '',
        tolerations: [],
        nodeSelector: {},
      },
    },
    runType: { value: '' },
    hyperparameters: {},
  });

  const { hyperparameters } = filterHyperparameters(ilabPipelineVersion);

  // training node and hyperparameter default value from pipeline spec
  React.useEffect(() => {
    if (ilabPipelineVersion) {
      const { hyperparameterFormData } = filterHyperparameters(ilabPipelineVersion);
      setData('hyperparameters', {
        ...hyperparameterFormData,
      });
      const parameters = getInputDefinitionParams(ilabPipelineVersion);
      if (parameters) {
        setData('inputPipelineParameters', parameters);
      }
      const trainingNodeDefaultValue = getParamsValueFromPipelineInput(
        ilabPipelineVersion,
        'train_num_workers',
      )?.defaultValue;
      if (trainingNodeDefaultValue) {
        setData('trainingNode', Number(trainingNodeDefaultValue));
      }
    }
  }, [ilabPipelineVersion, setData]);

  const formValidation = useValidation(
    data,
    modelCustomizationFormSchema.extend({
      hyperparameters: createHyperParametersSchema(hyperparameters),
    }),
  );

  const navigate = useNavigate();
  const pipelineParameterErrors =
    Object.keys(formValidation.getAllValidationIssues(['inputPipelineParameters'])).length > 0;

  const filteredFineTunePageSections = React.useMemo(
    () =>
      pipelineParameterErrors
        ? Object.values(FineTunePageSections).filter(
            (section) =>
              section === FineTunePageSections.PROJECT_DETAILS ||
              section === FineTunePageSections.PIPELINE_DETAILS,
          )
        : FineTunePageSections,
    [pipelineParameterErrors],
  );

  const drawerContentRef = React.useRef<ModelCustomizationDrawerContentRef>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const handleCloseDrawer = () => {
    setIsDrawerExpanded(false);
  };

  const handleOpenDrawer = (contentArgs: ModelCustomizationDrawerContentArgs) => {
    drawerContentRef.current?.update(contentArgs);
    setIsDrawerExpanded(true);
  };

  return (
    <ValidationContext.Provider value={formValidation}>
      <Drawer isExpanded={isDrawerExpanded} data-testid="drawer-model-customization" isInline>
        <DrawerContent
          panelContent={
            <ModelCustomizationDrawerContent
              ref={drawerContentRef}
              handleCloseDrawer={handleCloseDrawer}
            />
          }
        >
          <DrawerContentBody>
            <ApplicationsPage
              title="Start a LAB-tuning run"
              description={
                <>
                  InstructLab fine-tuning is a method which uses synthetic data generation (SDG)
                  techniques and a structured taxonomy to create diverse, high-quality training
                  datasets.{' '}
                  <Link to={modelCustomizationRootPath}>Learn more about the LAB method</Link>
                </>
              }
              breadcrumb={
                <Breadcrumb>
                  <BreadcrumbItem
                    to={
                      state?.modelRegistryName
                        ? modelRegistryUrl(state.modelRegistryName)
                        : undefined
                    }
                  >
                    {state?.modelRegistryDisplayName}
                  </BreadcrumbItem>
                  <BreadcrumbItem
                    to={
                      state?.registeredModelId && state.modelRegistryName
                        ? registeredModelUrl(state.registeredModelId, state.modelRegistryName)
                        : undefined
                    }
                  >
                    {state?.registeredModelName}
                  </BreadcrumbItem>
                  <BreadcrumbItem
                    to={
                      state?.modelVersionId && state.registeredModelId && state.modelRegistryName
                        ? modelVersionUrl(
                            state.modelVersionId,
                            state.registeredModelId,
                            state.modelRegistryName,
                          )
                        : undefined
                    }
                  >
                    {state?.modelVersionName}
                  </BreadcrumbItem>
                  <BreadcrumbItem>Start an InstructLab run</BreadcrumbItem>
                </Breadcrumb>
              }
              loaded={ilabPipelineLoaded}
              empty={false}
            >
              <EnsureAPIAvailability>
                <PageSection hasBodyWrapper={false} isFilled>
                  <GenericSidebar
                    sections={Object.values(filteredFineTunePageSections)}
                    titles={fineTunePageSectionTitles}
                    maxWidth={200}
                  >
                    <FineTunePage
                      canSubmit={!!ilabPipelineLoadError}
                      onSuccess={() =>
                        navigate(
                          `/pipelines/${encodeURIComponent(
                            project.metadata.name,
                          )}/${encodeURIComponent(
                            ilabPipelineVersion?.pipeline_id ?? '',
                          )}/${encodeURIComponent(
                            ilabPipelineVersion?.pipeline_version_id ?? '',
                          )}/view`,
                        )
                      }
                      data={data}
                      setData={setData}
                      ilabPipeline={ilabPipeline}
                      ilabPipelineVersion={ilabPipelineVersion}
                      ilabPipelineLoaded={ilabPipelineLoaded}
                      handleOpenDrawer={handleOpenDrawer}
                    />
                  </GenericSidebar>
                </PageSection>
              </EnsureAPIAvailability>
            </ApplicationsPage>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </ValidationContext.Provider>
  );
};

export default ModelCustomizationForm;
