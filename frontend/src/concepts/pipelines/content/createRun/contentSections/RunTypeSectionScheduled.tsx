import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { RunTypeScheduledData } from '#~/concepts/pipelines/content/createRun/types';
import RunTypeSectionDateTime from '#~/concepts/pipelines/content/createRun/contentSections/RunTypeSectionDateTime';
import EndDateBeforeStartDateError from '#~/concepts/pipelines/content/createRun/contentSections/EndDateBeforeStartDateError';
import CatchUp from '#~/concepts/pipelines/content/createRun/contentSections/CatchUp';
import MaxConcurrencyField from '#~/concepts/pipelines/content/createRun/contentSections/MaxConcurrencyField';
import TriggerTypeField from '#~/concepts/pipelines/content/createRun/contentSections/TriggerTypeField';
import { convertToDate } from '#~/utilities/time';

type RunTypeSectionScheduledProps = {
  data: RunTypeScheduledData;
  onChange: (scheduledData: RunTypeScheduledData) => void;
};

const RunTypeSectionScheduled: React.FC<RunTypeSectionScheduledProps> = ({ data, onChange }) => (
  <Stack hasGutter>
    <StackItem>
      <TriggerTypeField data={data} onChange={onChange} />
    </StackItem>
    <StackItem>
      <MaxConcurrencyField
        onChange={(maxConcurrency) => onChange({ ...data, maxConcurrency })}
        value={data.maxConcurrency}
      />
    </StackItem>
    <StackItem>
      <RunTypeSectionDateTime
        id="start-date"
        label="Start date"
        value={data.start}
        onChange={(start) => onChange({ ...data, start })}
      />
    </StackItem>
    <StackItem>
      <RunTypeSectionDateTime
        id="end-date"
        label="End date"
        value={data.end}
        onChange={(end) => onChange({ ...data, end })}
        adjustNow={(now) => {
          if (data.start) {
            const start = convertToDate(data.start);
            start.setDate(start.getDate() + 7);
            return start;
          }
          return now;
        }}
      />
      <EndDateBeforeStartDateError start={data.start} end={data.end} />
    </StackItem>
    <StackItem>
      <CatchUp enabled={data.catchUp} onChange={(catchUp) => onChange({ ...data, catchUp })} />
    </StackItem>
  </Stack>
);

export default RunTypeSectionScheduled;
