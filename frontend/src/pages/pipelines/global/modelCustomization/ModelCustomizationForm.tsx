import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
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
import { modelCustomizationRootPath } from '~/routes';
import { useIlabPipeline } from '~/concepts/pipelines/content/modelCustomizationForm/useIlabPipeline';
import { FormTypes } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import { getInputDefinitionParams } from '~/concepts/pipelines/content/createRun/utils';
import { useLatestPipelineVersion } from '~/concepts/pipelines/apiHooks/useLatestPipelineVersion';
import { ParametersKF } from '~/concepts/pipelines/kfTypes';
import { isEnumMember } from '~/utilities/utils';
import FineTunePage from './FineTunePage';
import {
  BASE_MODEL_INPUT_STORAGE_LOCATION_URI_KEY,
  FineTunePageSections,
  fineTunePageSectionTitles,
  HyperparameterFields,
  RunTypeFormat,
} from './const';

const extractHyperparameters = (ilabPipelineParameters: ParametersKF): ParametersKF => {
  let hyperparameters = {};
  for (const key of Object.keys(ilabPipelineParameters)) {
    if (isEnumMember(key, HyperparameterFields)) {
      hyperparameters = {
        ...hyperparameters,
        [key]: ilabPipelineParameters[key],
      };
    }
  }
  return hyperparameters;
};

const ModelCustomizationForm: React.FC = () => {
  const { project } = usePipelinesAPI();
  const [ilabPipeline, ilabPipelineLoaded, ilabPipelineLoadError] = useIlabPipeline();
  const [pipelineVersion] = useLatestPipelineVersion(ilabPipeline?.pipeline_id);
  const ilabPipelineParams = getInputDefinitionParams(pipelineVersion);
  const [searchParams] = useSearchParams();

  const [data, setData] = useGenericObjectState<ModelCustomizationFormData>({
    projectName: { value: project.metadata.name },
    baseModel: {
      // TODO: Replace values with actual data
      registryName: 'Registry1',
      name: 'my-granite-model',
      version: 'myModel-v0.0.2',
      inputStorageLocationUri: searchParams.get(BASE_MODEL_INPUT_STORAGE_LOCATION_URI_KEY) ?? '',
    },
    runType: { value: RunTypeFormat.FULL },
    hyperparameters: extractHyperparameters(ilabPipelineParams ?? {}),
  });

  const validation = useValidation(data, modelCustomizationFormSchema);
  const isValid = validation.validationResult.success;
  const canSubmit = ilabPipelineLoaded && isValid;
  const navigate = useNavigate();

  const updateForm = (field: keyof typeof data, value: FormTypes) => {
    setData(field, value);
  };

  React.useEffect(() => {
    setData('hyperparameters', extractHyperparameters(ilabPipelineParams ?? {}));
  }, [ilabPipelineParams, setData]);

  return (
    <ValidationContext.Provider value={validation}>
      <ApplicationsPage
        title={modelCustomizationFormPageTitle}
        description={modelCustomizationFormPageDescription}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem to={modelCustomizationRootPath}>Model customization</BreadcrumbItem>
            <BreadcrumbItem>Start an InstructLab run</BreadcrumbItem>
          </Breadcrumb>
        }
        loaded={ilabPipelineLoaded}
        empty={false}
      >
        {ilabPipelineLoaded && (
          <EnsureAPIAvailability>
            <PageSection hasBodyWrapper={false} isFilled>
              <GenericSidebar
                sections={Object.values(FineTunePageSections)}
                titles={fineTunePageSectionTitles}
                maxWidth={175}
              >
                <FineTunePage
                  isInvalid={!canSubmit || !!ilabPipelineLoadError}
                  data={data}
                  updateForm={updateForm}
                  onSuccess={() =>
                    navigate(
                      `/pipelines/${encodeURIComponent(project.metadata.name)}/${encodeURIComponent(
                        ilabPipeline?.pipeline_id ?? '',
                      )}/${encodeURIComponent(ilabPipeline?.pipeline_version_id ?? '')}/view`,
                    )
                  }
                  setData={setData}
                />
              </GenericSidebar>
            </PageSection>
          </EnsureAPIAvailability>
        )}
      </ApplicationsPage>
    </ValidationContext.Provider>
  );
};

export default ModelCustomizationForm;
