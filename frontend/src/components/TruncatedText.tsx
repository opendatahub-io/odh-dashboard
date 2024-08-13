import React from 'react';
import { Tooltip } from '@patternfly/react-core';

type TruncatedTextProps = {
  maxLines: number;
  content: string;
} & React.HTMLProps<HTMLSpanElement>;

const TruncatedText: React.FC<TruncatedTextProps> = ({ maxLines, content, ...rest }) => (
  <Tooltip content={content}>
    <span
      style={{
        display: '-webkit-box',
        overflow: 'hidden',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: maxLines,
      }}
      {...rest}
    >
      {content}
    </span>
  </Tooltip>
);

export default TruncatedText;
