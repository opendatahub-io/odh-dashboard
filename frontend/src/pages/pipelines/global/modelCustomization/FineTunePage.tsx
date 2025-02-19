import * as React from 'react';
import { Form, FormGroup, FormSection } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import TeacherModelSection from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherModelSection';
import JudgeModelSection from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/JudgeModelSection';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { FineTunePageSections, fineTunePageSectionTitles } from './const';
import FineTunePageFooter from './FineTunePageFooter';

type FineTunePageProps = {
  isInvalid: boolean;
  onSuccess: () => void;
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
};

const FineTunePage: React.FC<FineTunePageProps> = ({ isInvalid, onSuccess, data, setData }) => {
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
      <TeacherModelSection
        data={data.teacher}
        setData={(teacherData) => setData('teacher', teacherData)}
      />
      <JudgeModelSection data={data.judge} setData={(judgeData) => setData('judge', judgeData)} />
      <FormSection>
        <FineTunePageFooter data={data} isInvalid={isInvalid} onSuccess={onSuccess} />
      </FormSection>
    </Form>
  );
};

export default FineTunePage;
