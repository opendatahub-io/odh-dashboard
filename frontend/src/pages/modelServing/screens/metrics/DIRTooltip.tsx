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
            outcome. Typically, the further away the DIR is from 1, the more unfair the model. A DIR
            equal to 1 indicates a perfectly fair model for the groups and outcomes in question.
          </StackItem>

          {/*<StackItem>*/}
          {/*  <DescriptionList isCompact isHorizontal>*/}
          {/*    <DescriptionListGroup>*/}
          {/*      <DescriptionListTerm>Resource name</DescriptionListTerm>*/}
          {/*      <DescriptionListDescription>*/}
          {/*        {resource.metadata.name}*/}
          {/*      </DescriptionListDescription>*/}
          {/*    </DescriptionListGroup>*/}
          {/*    <DescriptionListGroup>*/}
          {/*      <DescriptionListTerm>Resource type</DescriptionListTerm>*/}
          {/*      <DescriptionListDescription>{resource.kind}</DescriptionListDescription>*/}
          {/*    </DescriptionListGroup>*/}
          {/*  </DescriptionList>*/}
          {/*</StackItem>*/}
        </Stack>
      }
    >
      <OutlinedQuestionCircleIcon />
    </Tooltip>
  </div>
);

export default DIRTooltip;
