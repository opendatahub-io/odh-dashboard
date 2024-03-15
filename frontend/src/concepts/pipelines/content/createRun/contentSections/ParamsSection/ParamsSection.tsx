import * as React from 'react';
import { Alert, FormGroup, FormSection, HelperText, TextInput } from '@patternfly/react-core';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import {
  InputDefinitionParameterType,
  PipelineVersionKFv2,
  RuntimeConfigParameters,
} from '~/concepts/pipelines/kfTypes';
import { getInputDefinitionParams } from '~/concepts/pipelines/content/createRun/utils';
import { RadioInputParam } from './RadioInputParam';
import { JsonInputParam } from './JsonInputParam';
import { NumberInputParam } from './NumberInputParam';

type ParamsSectionProps = {
  runParams: RuntimeConfigParameters | undefined;
  version: PipelineVersionKFv2 | null;
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

    const formGroups = Object.entries(runParams).map(([label, value]) => {
      const inputDefinitionParams = getInputDefinitionParams(version);
      const parameterType = inputDefinitionParams?.[label]?.parameterType;
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
          input = <TextInput {...inputProps} value={String(value)} />;
      }

      return (
        <FormGroup key={label} label={label} fieldId={label} isRequired>
          {input}
        </FormGroup>
      );
    });

    return (
      <>
        <HelperText>Specify parameters required by the pipeline.</HelperText>
        {formGroups}
      </>
    );
  };

  return (
    <FormSection
      id={CreateRunPageSections.PARAMS}
      title={runPageSectionTitles[CreateRunPageSections.PARAMS]}
    >
      {renderContent()}
    </FormSection>
  );
};
