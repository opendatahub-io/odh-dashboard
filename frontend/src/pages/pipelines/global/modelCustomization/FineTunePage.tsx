import * as React from 'react';
import { Form, FormGroup, FormSection } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  FineTuneTaxonomyFormData,
  ModelCustomizationFormData,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { FineTunePageSections, fineTunePageSectionTitles } from './const';
import FineTunePageFooter from './FineTunePageFooter';
import { FineTuneTaxonomySection } from './FineTuneTaxonomySection';

type FineTunePageProps = {
  isInvalid: boolean;
  onSuccess: () => void;
  ilabPipelineLoaded: boolean;
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
};

const FineTunePage: React.FC<FineTunePageProps> = ({
  isInvalid,
  onSuccess,
  ilabPipelineLoaded,
  data,
  setData,
}) => {
  const projectDetailsDescription = 'This project is used for running your pipeline';
  const { project } = usePipelinesAPI();
  return (
    <Form data-testid="fineTunePageForm">
      <FormSection
        id={FineTunePageSections.PROJECT_DETAILS}
        title={fineTunePageSectionTitles[FineTunePageSections.PROJECT_DETAILS]}
      >
        {projectDetailsDescription}
        <FormGroup
          label="Data Science Project"
          fieldId="model-customization-projectName"
          isRequired
        >
          <div>{getDisplayNameFromK8sResource(project)}</div>
        </FormGroup>
      </FormSection>
      <FineTuneTaxonomySection
        ilabPipelineLoaded={ilabPipelineLoaded}
        data={data.taxonomy}
        setData={(dataTaxonomy: FineTuneTaxonomyFormData) => {
          setData('taxonomy', dataTaxonomy);
        }}
      />
      <FormSection>
        <FineTunePageFooter isInvalid={isInvalid} onSuccess={onSuccess} data={data} />
      </FormSection>
    </Form>
  );
};

export default FineTunePage;
