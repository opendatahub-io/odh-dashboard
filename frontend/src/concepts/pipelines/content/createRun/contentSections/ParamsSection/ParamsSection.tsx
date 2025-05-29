import * as React from 'react';
import { Alert, FormSection } from '@patternfly/react-core';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '#~/concepts/pipelines/content/createRun/const';
import { PipelineVersionKF, RuntimeConfigParameters } from '#~/concepts/pipelines/kfTypes';
import { getInputDefinitionParams } from '#~/concepts/pipelines/content/createRun/utils';
import ParamsDefaultFields from '#~/components/ParamsDefaultFields';

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

      return (
        <ParamsDefaultFields
          key={label}
          parameterType={parameterType}
          inputProps={inputProps}
          label={label}
          description={description}
          isOptional={isOptional}
        />
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
