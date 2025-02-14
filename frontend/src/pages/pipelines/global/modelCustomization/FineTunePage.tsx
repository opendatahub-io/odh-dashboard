import * as React from 'react';
import { Form, FormGroup, FormSection } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { FineTunePageSections, fineTunePageSectionTitles } from './const';
import FineTunePageFooter from './FineTunePageFooter';

type FineTunePageProps = {
  isInvalid: boolean;
  onSuccess: () => void;
};

const FineTunePage: React.FC<FineTunePageProps> = ({ isInvalid, onSuccess }) => {
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
      <FormSection>
        <FineTunePageFooter isInvalid={isInvalid} onSuccess={onSuccess} />
      </FormSection>
    </Form>
  );
};

export default FineTunePage;
