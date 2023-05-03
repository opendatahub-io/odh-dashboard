import * as React from 'react';
import {
  Checkbox,
  DatePicker,
  Level,
  LevelItem,
  Split,
  SplitItem,
  TimePicker,
} from '@patternfly/react-core';
import { convertDateToSimpleDateString, convertDateToTimeString } from '~/utilities/time';
import { RunDateTime } from '~/concepts/pipelines/content/createRun/types';
import { DATE_FORMAT, DEFAULT_TIME } from '~/concepts/pipelines/content/createRun/const';

type RunTypeSectionDateTimeProps = {
  id: string;
  label: string;
  value?: RunDateTime;
  onChange: (dateTime?: RunDateTime) => void;
  adjustNow?: (now: Date) => Date;
};

const RunTypeSectionDateTime: React.FC<RunTypeSectionDateTimeProps> = ({
  id,
  label,
  value,
  onChange,
  adjustNow,
}) => {
  const handleChange = ({ date, time }: { date?: string; time?: string }) => {
    onChange({
      date: date ?? value?.date ?? DATE_FORMAT,
      time: time ?? value?.time ?? DEFAULT_TIME,
    });
  };

  return (
    <Level hasGutter>
      <LevelItem style={{ width: 100 }}>
        <Checkbox
          id={id}
          label={label}
          isChecked={value !== undefined}
          onChange={(checked) => {
            if (checked) {
              let now = new Date();
              if (adjustNow) {
                now = adjustNow(now);
              }
              handleChange({
                date: convertDateToSimpleDateString(now) ?? undefined,
                time: convertDateToTimeString(now) ?? undefined,
              });
            } else {
              onChange(undefined);
            }
          }}
        />
      </LevelItem>
      <LevelItem>
        <Split hasGutter>
          <SplitItem>
            <DatePicker value={value?.date} onChange={(e, date) => handleChange({ date })} />
          </SplitItem>
          <SplitItem>
            <TimePicker
              time={value?.time ?? DEFAULT_TIME}
              onChange={(e, time) => handleChange({ time })}
            />
          </SplitItem>
        </Split>
      </LevelItem>
    </Level>
  );
};

export default RunTypeSectionDateTime;
