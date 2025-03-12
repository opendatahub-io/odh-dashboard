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
  TeacherEndpointInput,
  TeacherModelNameInput,
  TeacherTokenInput,
} from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherJudgeInputComponents';
import { TeacherJudgeFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { ModelCustomizationDrawerContentArgs } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import MarkdownView from '~/components/MarkdownView';
import { ValidationContext } from '~/utilities/useValidation';
import { ZodErrorHelperText } from '~/components/ZodErrorFormHelperText';

type TeacherModelSectionProps = {
  data: TeacherJudgeFormData;
  setData: (data: TeacherJudgeFormData) => void;
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

const TeacherModelSection: React.FC<TeacherModelSectionProps> = ({
  data,
  setData,
  handleOpenDrawer,
}) => {
  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const endpointValidationIssues = data.endpoint
    ? getAllValidationIssues(['teacher', 'endpoint'])
    : [];
  const modelNameValidationIssues = data.modelName
    ? getAllValidationIssues(['teacher', 'modelName'])
    : [];
  const apiTokenValidationIssues = data.apiToken
    ? getAllValidationIssues(['teacher', 'apiToken'])
    : [];

  return (
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
              title: teacherJudgeMarkdownTitle,
              content: <MarkdownView markdown={teacherJudgeMarkdownContent} />,
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
                  validated={endpointValidationIssues.length > 0 ? 'error' : 'default'}
                />
                <ZodErrorHelperText zodIssue={endpointValidationIssues} />
                <TeacherModelNameInput
                  value={data.modelName}
                  setValue={(value) => setData({ ...data, modelName: value })}
                  validated={modelNameValidationIssues.length > 0 ? 'error' : 'default'}
                />
                <ZodErrorHelperText zodIssue={modelNameValidationIssues} />
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
              apiToken: data.apiToken ?? '',
            });
          }}
          body={
            data.endpointType === ModelCustomizationEndpointType.PRIVATE && (
              <>
                <TeacherEndpointInput
                  value={data.endpoint}
                  setValue={(value) => setData({ ...data, endpoint: value })}
                  validated={endpointValidationIssues.length > 0 ? 'error' : 'default'}
                />
                <ZodErrorHelperText zodIssue={endpointValidationIssues} />
                <TeacherTokenInput
                  value={data.apiToken}
                  setValue={(value) => setData({ ...data, apiToken: value })}
                  validated={apiTokenValidationIssues.length > 0 ? 'error' : 'default'}
                />
                <ZodErrorHelperText zodIssue={apiTokenValidationIssues} />
                <TeacherModelNameInput
                  value={data.modelName}
                  setValue={(value) => setData({ ...data, modelName: value })}
                  validated={modelNameValidationIssues.length > 0 ? 'error' : 'default'}
                />
                <ZodErrorHelperText zodIssue={modelNameValidationIssues} />
              </>
            )
          }
        />
      </FormGroup>
    </FormSection>
  );
};

export default TeacherModelSection;
