import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router';
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
import { FineTuneTaxonomyType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import FineTunePage from './FineTunePage';
import { FineTunePageSections, fineTunePageSectionTitles } from './const';
import { getPipelineInputParameter } from './utils';

const ModelCustomizationForm: React.FC = () => {
  const { project } = usePipelinesAPI();
  const [ilabPipeline, ilabPipelineLoaded, ilabPipelineLoadError] = useIlabPipeline();
  const [data, setData] = useGenericObjectState<ModelCustomizationFormData>({
    projectName: { value: project.metadata.name },
    taxonomy: {
      url: '',

      secret: {
        type: FineTuneTaxonomyType.SSH_KEY,
        sshKey: '',
      },
    },
  });
  React.useEffect(() => {
    const taxonomyUrl = getPipelineInputParameter(ilabPipeline, 'sdg_repo_url');

    setData('taxonomy', {
      ...data.taxonomy,
      url: taxonomyUrl?.defaultValue ? String(taxonomyUrl.defaultValue) : '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ilabPipeline]);

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
                ilabPipelineLoaded={ilabPipelineLoaded}
                isInvalid={!canSubmit || !!ilabPipelineLoadError}
                data={data}
                setData={setData}
                onSuccess={() =>
                  navigate(
                    `/pipelines/${encodeURIComponent(project.metadata.name)}/${encodeURIComponent(
                      ilabPipeline?.pipeline_id ?? '',
                    )}/${encodeURIComponent(ilabPipeline?.pipeline_version_id ?? '')}/view`,
                  )
                }
              />
            </GenericSidebar>
          </PageSection>
        </EnsureAPIAvailability>
      </ApplicationsPage>
    </ValidationContext.Provider>
  );
};

export default ModelCustomizationForm;
