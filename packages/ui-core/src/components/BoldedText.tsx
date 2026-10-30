import * as React from 'react';
import { escapeRegExp } from 'lodash-es';

type BoldedTextProps = {
  text: string;
  boldText?: string;
};

const BoldedText: React.FC<BoldedTextProps> = ({ text, boldText }) => {
  if (!boldText) {
    return <>{text}</>;
  }
  const parts = text.split(new RegExp(`(?<=^|\\s)(${escapeRegExp(boldText)})(?=$|[\\s.,:;)])`));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i}>{part}</strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

export default BoldedText;
