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

// PF's default term width may not fit all labels; compute from the longest label so columns align consistently.
const computeTermWidth = (labels: string[]): string => {
  const maxLen = labels.reduce((max, label) => Math.max(max, label.length), 0);
  return `min(${maxLen}ch, 50%)`;
};

export { computeTermWidth };

const KeyValueList: React.FC<{
  entries: Record<string, unknown>;
  'data-testid'?: string;
}> = ({ entries, 'data-testid': testId }) => {
  const rows = React.useMemo(() => flattenEntries(entries), [entries]);

  const customStyle: Record<string, string> = React.useMemo(
    () => ({
      '--pf-v6-c-description-list__term--width': computeTermWidth(rows.map(([label]) => label)),
    }),
    [rows],
  );

  return (
    <DescriptionList
      isHorizontal
      className="autorag-pattern-info-list"
      data-testid={testId}
      style={customStyle}
    >
      {rows.map(([label, value], idx) => (
        <DescriptionListGroup key={`${label}-${idx}`}>
          <DescriptionListTerm>{label}</DescriptionListTerm>
          <DescriptionListDescription>{value}</DescriptionListDescription>
        </DescriptionListGroup>
      ))}
    </DescriptionList>
  );
};

export default KeyValueList;
