import React from 'react';
import { Button, FormGroup, FormSection, Radio } from '@patternfly/react-core';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationEndpointType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  JudgeEndpointInput,
  JudgeModelNameInput,
  JudgeTokenInput,
} from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherJudgeInputComponents';
import { TeacherJudgeFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';

type JudgeModelSectionProps = {
  data: TeacherJudgeFormData;
  setData: (data: TeacherJudgeFormData) => void;
};

const JudgeModelSection: React.FC<JudgeModelSectionProps> = ({ data, setData }) => (
  <FormSection
    id={FineTunePageSections.JUDGE_MODEL}
    title={fineTunePageSectionTitles[FineTunePageSections.JUDGE_MODEL]}
  >
    {/* TODO: add link to judge model */}
    <div>
      Select or create a connection to specify the judge model to deploy for use in model
      evaluation.{' '}
      <Button isInline variant="link">
        Learn more about how to deploy a judge model
      </Button>
    </div>
    <FormGroup label="Judge" fieldId="model-customization-judge" isRequired>
      <Radio
        name="judge-section-public-endpoint-radio"
        id="judge-section-public-endpoint-radio"
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
              <JudgeEndpointInput
                value={data.endpoint}
                setValue={(value) => setData({ ...data, endpoint: value })}
              />
              <JudgeModelNameInput
                value={data.modelName}
                setValue={(value) => setData({ ...data, modelName: value })}
              />
            </>
          )
        }
      />
      <Radio
        name="judge-section-private-endpoint-radio"
        id="judge-section-private-endpoint-radio"
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
              <JudgeEndpointInput
                value={data.endpoint}
                setValue={(value) => setData({ ...data, endpoint: value })}
              />
              <JudgeTokenInput
                value={data.apiToken}
                setValue={(value) => setData({ ...data, apiToken: value })}
              />
              <JudgeModelNameInput
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

export default JudgeModelSection;
