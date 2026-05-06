import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

const humanize = (key: string): string =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '\u2014';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

const flattenEntries = (obj: Record<string, unknown>, prefix = ''): [string, string][] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const label = prefix ? `${prefix} ${humanize(key)}` : humanize(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested: Record<string, unknown> = Object.fromEntries(Object.entries(value));
      return flattenEntries(nested, label);
    }
    return [[label, formatValue(value)]];
  });

export { humanize, flattenEntries };

const KeyValueList: React.FC<{ entries: Record<string, unknown> }> = ({ entries }) => (
  <DescriptionList isHorizontal>
    {flattenEntries(entries).map(([label, value]) => (
      <DescriptionListGroup key={label}>
        <DescriptionListTerm>{label}</DescriptionListTerm>
        <DescriptionListDescription>{value}</DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);

export default KeyValueList;
