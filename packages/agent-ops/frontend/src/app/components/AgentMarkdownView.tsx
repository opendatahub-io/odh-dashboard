import * as React from 'react';
import classNames from 'classnames';
import { Content } from '@patternfly/react-core';
import { markdownConverter } from '~/app/utilities/markdown';

type AgentMarkdownViewProps = {
  markdown?: string;
  className?: string;
  dataTestId?: string;
  maxHeading?: number;
};

// Keep markdown section headings body-sized inside the description card.
const compactHeadingStyles = {
  '--pf-v6-c-content--h2--FontSize': 'var(--pf-t--global--font--size--body--default)',
  '--pf-v6-c-content--h2--LineHeight': 'var(--pf-t--global--font--line-height--body)',
  '--pf-v6-c-content--h2--MarginBlockStart': 'var(--pf-t--global--spacer--md)',
  '--pf-v6-c-content--h2--MarginBlockEnd': 'var(--pf-t--global--spacer--xs)',
  '--pf-v6-c-content--h2--FontWeight': 'var(--pf-t--global--font--weight--body--bold)',
  '--pf-v6-c-content--h3--FontSize': 'var(--pf-t--global--font--size--body--default)',
  '--pf-v6-c-content--h3--LineHeight': 'var(--pf-t--global--font--line-height--body)',
  '--pf-v6-c-content--h3--MarginBlockStart': 'var(--pf-t--global--spacer--md)',
  '--pf-v6-c-content--h3--MarginBlockEnd': 'var(--pf-t--global--spacer--xs)',
  '--pf-v6-c-content--h3--FontWeight': 'var(--pf-t--global--font--weight--body--bold)',
  '--pf-v6-c-content--h4--FontSize': 'var(--pf-t--global--font--size--body--default)',
  '--pf-v6-c-content--h4--LineHeight': 'var(--pf-t--global--font--line-height--body)',
  '--pf-v6-c-content--h4--MarginBlockStart': 'var(--pf-t--global--spacer--md)',
  '--pf-v6-c-content--h4--MarginBlockEnd': 'var(--pf-t--global--spacer--xs)',
  '--pf-v6-c-content--h4--FontWeight': 'var(--pf-t--global--font--weight--body--bold)',
} as React.CSSProperties;

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
      className={classNames(className)}
      style={compactHeadingStyles}
      data-testid={dataTestId}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default AgentMarkdownView;
