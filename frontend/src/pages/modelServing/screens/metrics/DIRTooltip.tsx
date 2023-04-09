import React from 'react';
import { Stack, StackItem, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

const DIRTooltip = () => (
  <div style={{ display: 'inline-block' }}>
    <Tooltip
      removeFindDomNode
      position="right"
      content={
        <Stack hasGutter>
          <StackItem>
            Disparate Impact Ratio (DIR) measures imbalances in classifications by calculating the
            ratio between the proportion of the majority and protected classes getting a particular
            outcome.
          </StackItem>
          <StackItem>
            Typically, the further away the DIR is from 1, the more unfair the model. A DIR equal to
            1 indicates a perfectly fair model for the groups and outcomes in question.
          </StackItem>
        </Stack>
      }
    >
      <OutlinedQuestionCircleIcon />
    </Tooltip>
  </div>
);

export default DIRTooltip;
