import * as React from 'react';
import {
  ClipboardCopy,
  FormGroup,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import SimpleSelect from '~/components/SimpleSelect';
import {
  PeriodicOptions,
  RunTypeScheduledData,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { replaceNonNumericPartWithString, replaceNumericPartWithString } from '~/utilities/string';
import {
  DEFAULT_CRON_STRING,
  DEFAULT_PERIODIC_OPTION,
} from '~/concepts/pipelines/content/createRun/const';

type TriggerTypeFieldProps = {
  data: RunTypeScheduledData;
  onChange: (scheduledData: RunTypeScheduledData) => void;
};

const TriggerTypeField: React.FC<TriggerTypeFieldProps> = ({ data, onChange }) => {
  let content: React.ReactNode | null;
  switch (data.triggerType) {
    case ScheduledType.CRON:
      content = (
        <FormGroup label="Cron string" data-testid="cron-string-group">
          <ClipboardCopy
            hoverTip="Copy"
            clickTip="Copied"
            onChange={(e, value) => {
              if (typeof value === 'string') {
                onChange({ ...data, value: value.trim() });
              }
            }}
          >
            {data.value}
          </ClipboardCopy>
        </FormGroup>
      );
      break;
    case ScheduledType.PERIODIC:
      content = (
        <FormGroup label="Run every" data-testid="run-every-group">
          <Split hasGutter>
            <SplitItem>
              <NumberInputWrapper
                min={1}
                value={parseInt(data.value) || 1}
                onChange={(value) =>
                  onChange({
                    ...data,
                    value: replaceNumericPartWithString(data.value, value ?? 0),
                  })
                }
              />
            </SplitItem>
            <SplitItem>
              <SimpleSelect
                popperProps={{ maxWidth: undefined }}
                isFullWidth
                options={Object.values(PeriodicOptions).map((v) => ({
                  key: v,
                  label: v,
                }))}
                value={data.value.replace(/\d+/, '')}
                onChange={(value) =>
                  onChange({
                    ...data,
                    value: replaceNonNumericPartWithString(data.value, value),
                  })
                }
              />
            </SplitItem>
          </Split>
        </FormGroup>
      );
      break;
    default:
      content = null;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Trigger type">
          <SimpleSelect
            dataTestId="triggerTypeSelector"
            isFullWidth
            options={[
              { key: ScheduledType.PERIODIC, label: 'Periodic' },
              { key: ScheduledType.CRON, label: 'Cron' },
            ]}
            value={data.triggerType}
            onChange={(triggerTypeString) => {
              let triggerType: ScheduledType;
              let value: string;

              switch (triggerTypeString) {
                case ScheduledType.CRON:
                  triggerType = ScheduledType.CRON;
                  value = DEFAULT_CRON_STRING;
                  break;
                case ScheduledType.PERIODIC:
                  triggerType = ScheduledType.PERIODIC;
                  value = DEFAULT_PERIODIC_OPTION;
                  break;
                default:
                  return;
              }

              onChange({ ...data, triggerType, value });
            }}
            popperProps={{ appendTo: 'inline' }}
          />
        </FormGroup>
      </StackItem>
      {content && <StackItem>{content}</StackItem>}
    </Stack>
  );
};

export default TriggerTypeField;
