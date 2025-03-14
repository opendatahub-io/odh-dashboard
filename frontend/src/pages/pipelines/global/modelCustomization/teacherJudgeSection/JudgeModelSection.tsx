import React from 'react';
import {
  Button,
  Content,
  ContentVariants,
  FormGroup,
  FormSection,
  Radio,
} from '@patternfly/react-core';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
  teacherJudgeMarkdownContent,
  teacherJudgeMarkdownTitle,
} from '~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationEndpointType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  JudgeEndpointInput,
  JudgeModelNameInput,
  JudgeTokenInput,
} from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherJudgeInputComponents';
import { TeacherJudgeFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { ModelCustomizationDrawerContentArgs } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import MarkdownView from '~/components/MarkdownView';

type JudgeModelSectionProps = {
  data: TeacherJudgeFormData;
  setData: (data: TeacherJudgeFormData) => void;
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

const JudgeModelSection: React.FC<JudgeModelSectionProps> = ({
  data,
  setData,
  handleOpenDrawer,
}) => (
  <FormSection
    id={FineTunePageSections.JUDGE_MODEL}
    title={fineTunePageSectionTitles[FineTunePageSections.JUDGE_MODEL]}
  >
    <Content component={ContentVariants.small}>
      Enter the URL endpoint of the judge model to deploy for use in synthetic data generation
      (SDG).{' '}
      <Button
        isInline
        variant="link"
        onClick={() =>
          handleOpenDrawer({
            title: teacherJudgeMarkdownTitle,
            content: <MarkdownView markdown={teacherJudgeMarkdownContent} />,
          })
        }
      >
        Learn more about how to deploy a judge model
      </Button>
    </Content>
    <FormGroup label="Judge" fieldId="model-customization-judge" isRequired>
      <Radio
        name="judge-section-unauthenticated-endpoint-radio"
        id="judge-section-unauthenticated-endpoint-radio"
        label="Unauthenticated endpoint"
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
        name="judge-section-authenticated-endpoint-radio"
        id="judge-section-authenticated-endpoint-radio"
        label="Authenticated endpoint"
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
