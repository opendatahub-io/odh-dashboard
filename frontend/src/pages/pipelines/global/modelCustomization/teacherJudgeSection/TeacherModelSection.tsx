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
  teacherJudgeMarkdown,
} from '~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationEndpointType } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  TeacherEndpointInput,
  TeacherModelNameInput,
  TeacherTokenInput,
} from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherJudgeInputComponents';
import { TeacherJudgeFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { ModelCustomizationDrawerContentArgs } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import MarkdownView from '~/components/MarkdownView';

type TeacherModelSectionProps = {
  data: TeacherJudgeFormData;
  setData: (data: TeacherJudgeFormData) => void;
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

const TeacherModelSection: React.FC<TeacherModelSectionProps> = ({
  data,
  setData,
  handleOpenDrawer,
}) => (
  <FormSection
    id={FineTunePageSections.TEACHER_MODEL}
    title={fineTunePageSectionTitles[FineTunePageSections.TEACHER_MODEL]}
  >
    <Content component={ContentVariants.small}>
      Enter the URL endpoint of the teacher model to deploy for use in synthetic data generation
      (SDG).{' '}
      <Button
        isInline
        variant="link"
        onClick={() =>
          handleOpenDrawer({
            body: <MarkdownView markdown={teacherJudgeMarkdown} />,
          })
        }
      >
        Learn more about how to deploy a teacher model
      </Button>
    </Content>
    <FormGroup label="Teacher" fieldId="model-customization-teacher" isRequired>
      <Radio
        name="teacher-section-unauthenticated-endpoint-radio"
        id="teacher-section-unauthenticated-endpoint-radio"
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
        name="teacher-section-authenticated-endpoint-radio"
        id="teacher-section-authenticated-endpoint-radio"
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
