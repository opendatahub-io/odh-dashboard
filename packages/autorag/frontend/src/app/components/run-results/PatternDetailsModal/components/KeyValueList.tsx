import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { formatDisplayValue, humanize } from '~/app/utilities/utils';

const LABEL_OVERRIDES: Record<string, string> = {
  // eslint-disable-next-line camelcase
  duration_seconds: 'Duration (seconds)',
};

const flattenEntries = (obj: Record<string, unknown>): [string, string][] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const label = LABEL_OVERRIDES[key] ?? humanize(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested: Record<string, unknown> = Object.fromEntries(Object.entries(value));
      return flattenEntries(nested);
    }
    return [[label, formatDisplayValue(value)]];
  });

export { flattenEntries };

const KeyValueList: React.FC<{
  entries: Record<string, unknown>;
  'data-testid'?: string;
  children?: React.ReactNode;
}> = ({ entries, 'data-testid': testId, children }) => {
  const rows = React.useMemo(() => flattenEntries(entries), [entries]);
  return (
    <DescriptionList isHorizontal className="autorag-pattern-info-list" data-testid={testId}>
      {rows.map(([label, value], idx) => (
        <DescriptionListGroup key={`${label}-${idx}`}>
          <DescriptionListTerm>{label}</DescriptionListTerm>
          <DescriptionListDescription>{value}</DescriptionListDescription>
        </DescriptionListGroup>
      ))}
      {children}
    </DescriptionList>
  );
};

export default KeyValueList;
