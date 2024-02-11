import * as React from 'react';
import { FormGroup, FormSection, Radio, Stack, StackItem } from '@patternfly/react-core';
import {
  CreateRunPageSections,
  DEFAULT_PERIODIC_DATA,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { RunType, RunTypeOption } from '~/concepts/pipelines/content/createRun/types';
import RunTypeSectionScheduled from '~/concepts/pipelines/content/createRun/contentSections/RunTypeSectionScheduled';

type RunTypeSectionProps = {
  value: RunType;
  onChange: (runType: RunType) => void;
};

const RunTypeSection: React.FC<RunTypeSectionProps> = ({ value, onChange }) => (
  <FormSection
    id={CreateRunPageSections.RUN_TYPE}
    title={runPageSectionTitles[CreateRunPageSections.RUN_TYPE]}
  >
    <FormGroup role="radiogroup" fieldId="run-type">
      <Stack hasGutter>
        <StackItem>
          <Radio
            name="run-type-option"
            label="Run once immediately after creation"
            isChecked={value.type === RunTypeOption.ONE_TRIGGER}
            id={RunTypeOption.ONE_TRIGGER}
            onChange={() => onChange({ type: RunTypeOption.ONE_TRIGGER })}
          />
        </StackItem>
        <StackItem>
          <Radio
            name="run-type-option"
            label="Schedule recurring run"
            id={RunTypeOption.SCHEDULED}
            isChecked={value.type === RunTypeOption.SCHEDULED}
            onChange={() =>
              onChange({
                type: RunTypeOption.SCHEDULED,
                data: DEFAULT_PERIODIC_DATA,
              })
            }
            body={
              value.type === RunTypeOption.SCHEDULED && (
                <RunTypeSectionScheduled
                  data={value.data}
                  onChange={(data) => onChange({ type: RunTypeOption.SCHEDULED, data })}
                />
              )
            }
          />
        </StackItem>
      </Stack>
    </FormGroup>
  </FormSection>
);

export default RunTypeSection;
