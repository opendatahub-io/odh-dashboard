import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { formatDisplayValue, humanize } from '~/app/utilities/utils';

const flattenEntries = (obj: Record<string, unknown>): [string, string][] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const label = humanize(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested: Record<string, unknown> = Object.fromEntries(Object.entries(value));
      return flattenEntries(nested);
    }
    return [[label, formatDisplayValue(value)]];
  });

export { flattenEntries };

const KeyValueList: React.FC<{ entries: Record<string, unknown>; 'data-testid'?: string }> = ({
  entries,
  'data-testid': testId,
}) => (
  <DescriptionList isHorizontal data-testid={testId}>
    {flattenEntries(entries).map(([label, value]) => (
      <DescriptionListGroup key={label}>
        <DescriptionListTerm>{label}</DescriptionListTerm>
        <DescriptionListDescription>{value}</DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);

export default KeyValueList;
