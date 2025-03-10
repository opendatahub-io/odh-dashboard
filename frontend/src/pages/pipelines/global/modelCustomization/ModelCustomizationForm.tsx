import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import {
  modelCustomizationFormPageDescription,
  modelCustomizationFormPageTitle,
} from '~/routes/pipelines/modelCustomizationForm';
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
import { ModelCustomizationRouterState } from '~/routes';
import { createHyperParametersSchema } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/hyperparameterValidationUtils';
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
      outputModelName: state?.registeredModelName ?? '',
      outputModelRegistryApiUrl: state?.outputModelRegistryApiUrl ?? '',
    },
    baseModel: {
      sdgBaseModel: state?.inputModelLocationUri ?? '',
    },
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

  return (
    <ValidationContext.Provider value={formValidation}>
      <ApplicationsPage
        title={modelCustomizationFormPageTitle}
        description={modelCustomizationFormPageDescription}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem
              to={state?.modelRegistryName ? modelRegistryUrl(state.modelRegistryName) : undefined}
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
              sections={Object.values(FineTunePageSections)}
              titles={fineTunePageSectionTitles}
              maxWidth={175}
            >
              <FineTunePage
                canSubmit={!!ilabPipelineLoadError}
                onSuccess={() =>
                  navigate(
                    `/pipelines/${encodeURIComponent(project.metadata.name)}/${encodeURIComponent(
                      ilabPipelineVersion?.pipeline_id ?? '',
                    )}/${encodeURIComponent(ilabPipelineVersion?.pipeline_version_id ?? '')}/view`,
                  )
                }
                data={data}
                setData={setData}
                ilabPipeline={ilabPipeline}
                ilabPipelineVersion={ilabPipelineVersion}
                ilabPipelineLoaded={ilabPipelineLoaded}
              />
            </GenericSidebar>
          </PageSection>
        </EnsureAPIAvailability>
      </ApplicationsPage>
    </ValidationContext.Provider>
  );
};

export default ModelCustomizationForm;
