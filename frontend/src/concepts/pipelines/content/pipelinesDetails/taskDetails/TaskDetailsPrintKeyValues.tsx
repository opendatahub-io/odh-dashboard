import * as React from 'react';
import { Grid, GridItem } from '@patternfly/react-core';

type TaskDetailsPrintKeyValuesProps = {
  items: { name: string; value: string }[];
};

const TaskDetailsPrintKeyValues: React.FC<TaskDetailsPrintKeyValuesProps> = ({ items }) => (
  <Grid hasGutter>
    {items.map((result, i) => (
      <React.Fragment key={`item-${i}`}>
        <GridItem span={4}>{result.name}</GridItem>
        <GridItem span={8}>{result.value}</GridItem>
      </React.Fragment>
    ))}
  </Grid>
);

export default TaskDetailsPrintKeyValues;
