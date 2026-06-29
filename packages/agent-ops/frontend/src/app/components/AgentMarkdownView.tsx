import * as React from 'react';
import classNames from 'classnames';
import { Content } from '@patternfly/react-core';
import { markdownConverter } from '~/app/utilities/markdown';
import './AgentMarkdownView.scss';

type AgentMarkdownViewProps = {
  markdown?: string;
  className?: string;
  dataTestId?: string;
  maxHeading?: number;
};

const AgentMarkdownView: React.FC<AgentMarkdownViewProps> = ({
  markdown = '',
  className,
  dataTestId,
  maxHeading = 3,
}) => {
  const html = React.useMemo(
    () => markdownConverter.makeHtml(markdown, maxHeading),
    [markdown, maxHeading],
  );

  return (
    <Content
      className={classNames('agent-ops-markdown-view', className)}
      data-testid={dataTestId}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default AgentMarkdownView;
