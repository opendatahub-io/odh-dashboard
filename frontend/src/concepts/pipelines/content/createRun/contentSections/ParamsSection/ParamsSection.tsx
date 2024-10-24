import * as React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import {
  InputDefinitionParameterType,
  PipelineVersionKF,
  RuntimeConfigParameters,
} from '~/concepts/pipelines/kfTypes';
import { getInputDefinitionParams } from '~/concepts/pipelines/content/createRun/utils';
import { RadioInputParam } from './RadioInputParam';
import { JsonInputParam } from './JsonInputParam';
import { NumberInputParam } from './NumberInputParam';

type ParamsSectionProps = {
  runParams: RuntimeConfigParameters | undefined;
  version: PipelineVersionKF | null;
  onChange: (params: RuntimeConfigParameters) => void;
};

export const ParamsSection: React.FC<ParamsSectionProps> = ({
  runParams = {},
  version,
  onChange,
}) => {
  const renderContent = (): React.ReactNode => {
    if (!version) {
      return (
        <Alert
          variant="info"
          isInline
          isPlain
          title="You must select a pipeline and version before you can set parameters."
        />
      );
    }

    if (!Object.keys(runParams).length) {
      return <Alert variant="info" isInline isPlain title="This pipeline has no parameters." />;
    }

    return Object.entries(runParams).map(([label, value]) => {
      const inputDefinitionParams = getInputDefinitionParams(version);
      const { parameterType, isOptional, description } = inputDefinitionParams?.[label] || {};
      const inputProps = {
        value,
        id: label,
        name: label,
        onChange: (
          _event: React.ChangeEvent<unknown> | null,
          newValue: string | number | boolean,
        ) => onChange({ ...runParams, [label]: newValue }),
      };
      let input: React.ReactNode;

      switch (parameterType) {
        case InputDefinitionParameterType.INTEGER:
          input = <NumberInputParam {...inputProps} />;
          break;
        case InputDefinitionParameterType.BOOLEAN:
          input = <RadioInputParam {...inputProps} />;
          break;
        case InputDefinitionParameterType.LIST:
        case InputDefinitionParameterType.STRUCT:
          input = <JsonInputParam {...inputProps} />;
          break;
        case InputDefinitionParameterType.DOUBLE:
          input = <NumberInputParam isFloat {...inputProps} />;
          break;
        case InputDefinitionParameterType.STRING:
          input = <TextInput data-testid={inputProps.id} {...inputProps} value={String(value)} />;
      }

      return (
        <FormGroup
          key={label}
          label={label}
          fieldId={label}
          isRequired={!isOptional}
          data-testid={`${label}-form-group`}
        >
          {input}
          {description && (
            <FormHelperText data-testid={`${label}-helper-text`}>
              <HelperText>
                <HelperTextItem>{description}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
      );
    });
  };

  return (
    <FormSection
      id={CreateRunPageSections.PARAMS}
      data-testid={CreateRunPageSections.PARAMS}
      title={runPageSectionTitles[CreateRunPageSections.PARAMS]}
    >
      Specify parameters required by pipelines.
      {renderContent()}
    </FormSection>
  );
};
