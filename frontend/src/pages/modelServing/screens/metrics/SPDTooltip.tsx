import React from 'react';
import { Stack, StackItem, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

const SPDTooltip = () => (
  <div style={{ display: 'inline-block' }}>
    <Tooltip
      removeFindDomNode
      position="right"
      content={
        <Stack hasGutter>
          <StackItem>
            <p>
              Statistical Parity Difference (SPD) measures imbalances in classifications by
              calculating the difference between the proportion of the majority and protected
              classes getting a particular outcome.
            </p>
            <p>
              Typically, -0.1 &lt; SPD &lt; 0.1 indicates a fair model, while a value outside those
              bounds indicates an unfair model for the groups and outcomes in question.
            </p>
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

export default SPDTooltip;
