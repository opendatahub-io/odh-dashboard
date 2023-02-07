import * as React from 'react';

const ScrollViewOnMount: React.FC = () => {
  return (
    <div
      ref={(elm) => {
        if (elm) {
          elm.scrollIntoView();
        }
      }}
    />
  );
};

export default ScrollViewOnMount;
