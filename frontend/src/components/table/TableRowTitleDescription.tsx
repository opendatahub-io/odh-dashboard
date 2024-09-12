import * as React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import MarkdownView from '~/components/MarkdownView';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import TruncatedText from '~/components/TruncatedText';

type TableRowTitleDescriptionProps = {
  title: React.ReactNode;
  resource?: K8sResourceCommon;
  subtitle?: React.ReactNode;
  description?: string;
  descriptionAsMarkdown?: boolean;
  truncateDescriptionLines?: number;
  label?: React.ReactNode;
};

const TableRowTitleDescription: React.FC<TableRowTitleDescriptionProps> = ({
  title,
  description,
  resource,
  subtitle,
  descriptionAsMarkdown,
  truncateDescriptionLines,
  label,
}) => {
  let descriptionNode: React.ReactNode;
  if (description) {
    descriptionNode = descriptionAsMarkdown ? (
      <MarkdownView conciseDisplay markdown={description} />
    ) : (
      <span
        data-testid="table-row-title-description"
        style={{ color: 'var(--pf-v5-global--Color--200)' }}
      >
        {truncateDescriptionLines !== undefined ? (
          <TruncatedText maxLines={truncateDescriptionLines} content={description} />
        ) : (
          description
        )}
      </span>
    );
  }

  return (
    <>
      <b data-testid="table-row-title">
        {resource ? <ResourceNameTooltip resource={resource}>{title}</ResourceNameTooltip> : title}
      </b>
      {subtitle}
      {descriptionNode}
      {label}
    </>
  );
};

export default TableRowTitleDescription;
