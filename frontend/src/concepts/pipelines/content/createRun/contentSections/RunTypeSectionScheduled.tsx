import * as React from 'react';
import { ClipboardCopy, Radio, Stack, StackItem, Text } from '@patternfly/react-core';
import {
  PeriodicOptions,
  RunTypeScheduledData,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import RunTypeSectionDateTime from '~/concepts/pipelines/content/createRun/contentSections/RunTypeSectionDateTime';
import {
  DEFAULT_CRON_STRING,
  DEFAULT_PERIODIC_OPTION,
} from '~/concepts/pipelines/content/createRun/const';

type RunTypeSectionScheduledProps = {
  data: RunTypeScheduledData;
  onChange: (scheduledData: RunTypeScheduledData) => void;
};

const RunTypeSectionScheduled: React.FC<RunTypeSectionScheduledProps> = ({ data, onChange }) => (
  <Stack hasGutter>
    <StackItem>
      <Text>
        <b>Trigger type</b>
      </Text>
    </StackItem>
    <StackItem>
      <Radio
        name="run-type-option-trigger-type"
        label="Periodic"
        isChecked={data.triggerType === ScheduledType.PERIODIC}
        id={ScheduledType.PERIODIC}
        onChange={() =>
          onChange({ triggerType: ScheduledType.PERIODIC, value: DEFAULT_PERIODIC_OPTION })
        }
        body={
          data.triggerType === ScheduledType.PERIODIC && (
            <>
              <Text>
                <b>Run every</b>
              </Text>
              <SimpleDropdownSelect
                options={Object.keys(PeriodicOptions).map((key) => ({
                  key: PeriodicOptions[key],
                  label: PeriodicOptions[key],
                }))}
                value={data.value}
                onChange={(value) => onChange({ ...data, value })}
              />
            </>
          )
        }
      />
    </StackItem>
    <StackItem>
      <Radio
        name="run-type-option-trigger-type"
        label="Cron"
        id={ScheduledType.CRON}
        isChecked={data.triggerType === ScheduledType.CRON}
        onChange={() =>
          onChange({
            triggerType: ScheduledType.CRON,
            value: DEFAULT_CRON_STRING,
          })
        }
        body={
          data.triggerType === ScheduledType.CRON && (
            <ClipboardCopy hoverTip="Copy" clickTip="Copied">
              {data.value}
            </ClipboardCopy>
          )
        }
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
      />
    </StackItem>
  </Stack>
);

export default RunTypeSectionScheduled;
