import React from 'react';
type TruncatedTextProps = {
    maxLines: number;
    content: React.ReactNode;
} & Omit<React.HTMLProps<HTMLSpanElement>, 'content'>;
declare const TruncatedText: React.FC<TruncatedTextProps>;
export default TruncatedText;
