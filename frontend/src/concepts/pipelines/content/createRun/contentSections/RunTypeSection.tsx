import * as React from 'react';
import { FormGroup, FormSection, Radio } from '@patternfly/react-core';
import {
  CreateRunPageSections,
  DEFAULT_PERIODIC_OPTION,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import {
  RunType,
  RunTypeOption,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
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
      <Radio
        name="run-type-option"
        label="Run once immediately after creation"
        isChecked={value.type === RunTypeOption.ONE_TRIGGER}
        id={RunTypeOption.ONE_TRIGGER}
        onChange={() => onChange({ type: RunTypeOption.ONE_TRIGGER })}
      />
      <Radio
        name="run-type-option"
        label="Schedule recurring run"
        id={RunTypeOption.SCHEDULED}
        isChecked={value.type === RunTypeOption.SCHEDULED}
        onChange={() =>
          onChange({
            type: RunTypeOption.SCHEDULED,
            data: { triggerType: ScheduledType.PERIODIC, value: DEFAULT_PERIODIC_OPTION },
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
    </FormGroup>
  </FormSection>
);

export default RunTypeSection;
