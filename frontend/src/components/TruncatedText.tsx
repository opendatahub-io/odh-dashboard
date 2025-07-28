import React from 'react';
import { Tooltip } from '@patternfly/react-core';

type TruncatedTextProps = {
  maxLines: number;
  content: React.ReactNode;
  tooltipMaxLines?: number;
} & Omit<React.HTMLProps<HTMLSpanElement>, 'content'>;

const TruncatedText: React.FC<TruncatedTextProps> = ({
  maxLines,
  content,
  tooltipMaxLines,
  ...props
}) => {
  const outerElementRef = React.useRef<HTMLElement>(null);
  const textElementRef = React.useRef<HTMLElement>(null);
  const [isTruncated, setIsTruncated] = React.useState<boolean>(false);

  const updateTruncation = React.useCallback(() => {
    if (textElementRef.current && outerElementRef.current) {
      setIsTruncated(textElementRef.current.offsetHeight > outerElementRef.current.offsetHeight);
    }
  }, []);

  const truncateBody = (
    <span
      {...props}
      style={{
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        overflowWrap: 'anywhere',
        overflow: 'hidden',
        WebkitLineClamp: maxLines,
        ...(props.style || {}),
      }}
      ref={outerElementRef}
      onMouseEnter={(e) => {
        props.onMouseEnter?.(e);
        updateTruncation();
      }}
      onFocus={(e) => {
        props.onFocus?.(e);
        updateTruncation();
      }}
    >
      <span ref={textElementRef}>{content}</span>
    </span>
  );

  const tooltipContent = (() => {
    if (!tooltipMaxLines) {
      return content;
    }

    return (
      <div
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          overflowWrap: 'anywhere',
          overflow: 'hidden',
          WebkitLineClamp: tooltipMaxLines,
          pointerEvents: 'none',
        }}
      >
        {content}
      </div>
    );
  })();

  return (
    <Tooltip hidden={!isTruncated ? true : undefined} content={tooltipContent}>
      {truncateBody}
    </Tooltip>
  );
};

export default TruncatedText;
