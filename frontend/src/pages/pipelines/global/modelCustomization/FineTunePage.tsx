import * as React from 'react';
import { Form, FormGroup, FormSection } from '@patternfly/react-core';
import useRunFormData from '~/concepts/pipelines/content/createRun/useRunFormData';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import FineTunePageFooter from '~/pages/pipelines/global/modelCustomization/FineTunePageFooter';
import BaseModelSection from '~/pages/pipelines/global/modelCustomization/baseModelSection/BaseModelSection';
import { globalPipelineRunsRoute } from '~/routes';

type FineTunePageProps = {
  isInvalid: boolean;
  onSuccess: () => void;
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
};

const FineTunePage: React.FC<FineTunePageProps> = ({ isInvalid, onSuccess, data, setData }) => {
  const projectDetailsDescription = 'This project is used for running your pipeline';
  const { namespace, project } = usePipelinesAPI();
  const contextPath = globalPipelineRunsRoute(namespace);

  // TODO: translate ilab form data to `RunFormData`
  const [formData] = useRunFormData(null, {});

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
      <BaseModelSection
        data={data.baseModel}
        setData={(baseModelData) => setData('baseModel', baseModelData)}
      />
      <FormSection>
        <FineTunePageFooter
          isInvalid={isInvalid}
          onSuccess={onSuccess}
          contextPath={contextPath}
          data={formData}
        />
      </FormSection>
    </Form>
  );
};

export default FineTunePage;
