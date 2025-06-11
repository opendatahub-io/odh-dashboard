import * as React from 'react';
import { Flex, FlexItem, Split, SplitItem, Switch, Content } from '@patternfly/react-core';
import DashboardSplitItemLabel from '#~/concepts/dashboard/split/DashboardSplitItemLabel';
import { RUN_OPTION_LABEL_SIZE } from '#~/concepts/pipelines/content/createRun/const';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';

type CatchUpProps = {
  enabled: boolean;
  onChange: (newState: boolean) => void;
};

const CatchUp: React.FC<CatchUpProps> = ({ enabled, onChange }) => (
  <Split hasGutter>
    <DashboardSplitItemLabel width={RUN_OPTION_LABEL_SIZE}>
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Content component="p">Catch up</Content>
        </FlexItem>
        <FlexItem>
          <DashboardHelpTooltip
            content={
              <>
                Whether the recurring run should catch up if behind schedule. Defaults to true.
                <br />
                <br />
                For example, if the recurring run is paused for a while and re-enabled afterwards.
                If catchup=true, the scheduler will catch up on (backfill) each missed interval.
                Otherwise, it only schedules the latest interval if more than one interval is ready
                to be scheduled.
                <br />
                <br />
                Usually, if your pipeline handles backfill internally, you should turn catchup off
                to avoid duplicate backfill.
              </>
            }
          />
        </FlexItem>
      </Flex>
    </DashboardSplitItemLabel>
    <SplitItem>
      <Switch
        id="run-catch-up"
        data-testid="run-catch-up-toggle"
        aria-label="Catch up is on"
        isChecked={enabled}
        onChange={(e, checked) => {
          onChange(checked);
        }}
      />
    </SplitItem>
  </Split>
);

export default CatchUp;
