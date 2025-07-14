import React from 'react';
import classNames from 'classnames';
import { markdownConverter } from '#~/utilities/markdown';

import './MarkdownView.scss';

type MarkdownViewProps = {
  markdown?: string;
  className?: string;
  /** Strips some padding out so the content can fit as an inline-block effort */
  conciseDisplay?: boolean;
  component?: 'div' | 'span';
  maxHeading?: number;
};

/* TODO: RHOAIENG-25396 Deprecate this in favor of using the <MarkdownComponent /> */
const MarkdownView: React.FC<MarkdownViewProps & React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  markdown = '',
  conciseDisplay,
  component = 'div',
  maxHeading,
  ...props
}) => {
  const Component = component;
  return (
    <Component
      className={classNames('odh-markdown-view', className, {
        'odh-markdown-view--with-padding': !conciseDisplay,
      })}
      {...props}
      dangerouslySetInnerHTML={{ __html: markdownConverter.makeHtml(markdown, maxHeading) }}
    />
  );
};

export default MarkdownView;
