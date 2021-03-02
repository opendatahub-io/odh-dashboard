import React from 'react';
import classNames from 'classnames';
import { markdownConverter } from '../utilities/markdown';

import './MarkdownView.scss';

type MarkdownViewProps = {
  markdown?: string;
  className?: string;
};

const MarkdownView: React.FC<MarkdownViewProps & React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  markdown = '',
  ...props
}) => (
  <div
    className={classNames('odh-markdown-view', className)}
    {...props}
    dangerouslySetInnerHTML={{ __html: markdownConverter.makeHtml(markdown) }}
  />
);

export default MarkdownView;
