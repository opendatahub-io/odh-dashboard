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
import {
  ModelCustomizationEndpointType,
  FineTuneTaxonomyType,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import FineTunePage from './FineTunePage';
import {
  BASE_MODEL_INPUT_STORAGE_LOCATION_URI_KEY,
  FineTunePageSections,
  fineTunePageSectionTitles,
} from './const';

const ModelCustomizationForm: React.FC = () => {
  const { project } = usePipelinesAPI();
  const {
    ilabPipeline,
    ilabPipelineVersion,
    loaded: ilabPipelineLoaded,
    loadError: ilabPipelineLoadError,
  } = useIlabPipeline();

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
  });

  const validation = useValidation(data, modelCustomizationFormSchema);
  const isValid = validation.validationResult.success;
  const canSubmit = ilabPipelineLoaded && isValid;
  const navigate = useNavigate();

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
        loaded
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
                isInvalid={!canSubmit || !!ilabPipelineLoadError}
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
              />
            </GenericSidebar>
          </PageSection>
        </EnsureAPIAvailability>
      </ApplicationsPage>
    </ValidationContext.Provider>
  );
};

export default ModelCustomizationForm;
