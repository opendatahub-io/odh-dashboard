import React from 'react';
import classNames from 'classnames';
import { markdownConverter } from '~/utilities/markdown';

import './MarkdownView.scss';

type MarkdownViewProps = {
  markdown?: string;
  className?: string;
  /** Strips some padding out so the content can fit as an inline-block effort */
  conciseDisplay?: boolean;
};

const MarkdownView: React.FC<MarkdownViewProps & React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  markdown = '',
  conciseDisplay,
  ...props
}) => (
  <div
    className={classNames('odh-markdown-view', className, {
      'odh-markdown-view--with-padding': !conciseDisplay,
    })}
    {...props}
    dangerouslySetInnerHTML={{ __html: markdownConverter.makeHtml(markdown) }}
  />
);

export default MarkdownView;
