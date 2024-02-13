import * as React from 'react';
import { Alert, FormGroup, FormSection, TextInput } from '@patternfly/react-core';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { RunParam } from '~/concepts/pipelines/content/createRun/types';

type ParamsSectionProps = {
  value?: RunParam[];
  onChange: (params: RunParam[]) => void;
};

const ParamsSection: React.FC<ParamsSectionProps> = ({ value, onChange }) => {
  const renderContent = (): React.ReactNode => {
    if (!value) {
      return (
        <Alert
          variant="info"
          isInline
          isPlain
          title="You must select a pipeline before you can set parameters."
        />
      );
    }

    if (value.length === 0) {
      return (
        <Alert
          component="h2"
          variant="info"
          isInline
          isPlain
          title="The selected pipeline has no input parameters."
        />
      );
    }

    const handleChange = (index: number, newValue: RunParam) => {
      const newParams = [...value];
      newParams[index] = newValue;
      onChange(newParams);
    };
    return (
      <>
        {value.map(({ label, value: currentValue }, i) => (
          <FormGroup key={label} label={label} fieldId={`${label}-param-field`}>
            <TextInput
              type="text"
              id={`${label}-param-field`}
              name={`${label}-param-field`}
              value={currentValue ?? ''}
              onChange={(e, newValue) => handleChange(i, { label, value: newValue })}
            />
          </FormGroup>
        ))}
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

export default ParamsSection;
