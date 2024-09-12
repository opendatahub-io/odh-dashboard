import * as React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import MarkdownView from '~/components/MarkdownView';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import TruncatedText from '~/components/TruncatedText';

type TableRowTitleDescriptionProps = {
  title: React.ReactNode;
  boldTitle?: boolean;
  resource?: K8sResourceCommon;
  subtitle?: React.ReactNode;
  description?: string;
  descriptionAsMarkdown?: boolean;
  truncateDescriptionLines?: number;
  label?: React.ReactNode;
};

const TableRowTitleDescription: React.FC<TableRowTitleDescriptionProps> = ({
  title,
  boldTitle = true,
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
      <div data-testid="table-row-title" className={boldTitle ? 'pf-v5-u-font-weight-bold' : ''}>
        {resource ? <ResourceNameTooltip resource={resource}>{title}</ResourceNameTooltip> : title}
      </div>
      {subtitle}
      {descriptionNode}
      {label}
    </>
  );
};

export default TableRowTitleDescription;
