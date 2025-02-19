import React from 'react';
import { Button, FormGroup, FormSection, Radio } from '@patternfly/react-core';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationEndpointType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  TeacherEndpointInput,
  TeacherModelNameInput,
  TeacherTokenInput,
} from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherJudgeInputComponents';
import { TeacherJudgeFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';

type TeacherModelSectionProps = {
  data: TeacherJudgeFormData;
  setData: (data: TeacherJudgeFormData) => void;
};

const TeacherModelSection: React.FC<TeacherModelSectionProps> = ({ data, setData }) => (
  <FormSection
    id={FineTunePageSections.TEACHER_MODEL}
    title={fineTunePageSectionTitles[FineTunePageSections.TEACHER_MODEL]}
  >
    {/* TODO: add link to teacher model */}
    <div>
      Select or create a connection to specify the teacher model to deploy for use in synthetic data
      generation (SDG).{' '}
      <Button isInline variant="link">
        Learn more about how to deploy a teacher model
      </Button>
    </div>
    <FormGroup label="Teacher" fieldId="model-customization-teacher" isRequired>
      <Radio
        name="teacher-section-public-endpoint-radio"
        id="teacher-section-public-endpoint-radio"
        label="Public endpoint"
        className="pf-v6-u-mb-md"
        isChecked={data.endpointType === ModelCustomizationEndpointType.PUBLIC}
        onChange={() => {
          setData({
            ...data,
            endpointType: ModelCustomizationEndpointType.PUBLIC,
          });
        }}
        body={
          data.endpointType === ModelCustomizationEndpointType.PUBLIC && (
            <>
              <TeacherEndpointInput
                value={data.endpoint}
                setValue={(value) => setData({ ...data, endpoint: value })}
              />
              <TeacherModelNameInput
                value={data.modelName}
                setValue={(value) => setData({ ...data, modelName: value })}
              />
            </>
          )
        }
      />
      <Radio
        name="teacher-section-private-endpoint-radio"
        id="teacher-section-private-endpoint-radio"
        label="Private endpoint"
        isChecked={data.endpointType === ModelCustomizationEndpointType.PRIVATE}
        onChange={() => {
          setData({
            ...data,
            endpointType: ModelCustomizationEndpointType.PRIVATE,
          });
        }}
        body={
          data.endpointType === ModelCustomizationEndpointType.PRIVATE && (
            <>
              <TeacherEndpointInput
                value={data.endpoint}
                setValue={(value) => setData({ ...data, endpoint: value })}
              />
              <TeacherTokenInput
                value={data.apiToken}
                setValue={(value) => setData({ ...data, apiToken: value })}
              />
              <TeacherModelNameInput
                value={data.modelName}
                setValue={(value) => setData({ ...data, modelName: value })}
              />
            </>
          )
        }
      />
    </FormGroup>
  </FormSection>
);

export default TeacherModelSection;
