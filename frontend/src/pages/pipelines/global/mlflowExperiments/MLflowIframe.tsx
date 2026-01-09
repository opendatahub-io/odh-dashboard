import * as React from 'react';
import { useMlflowPathSync } from './useMlflowPathSync';

const MlflowIframe = React.forwardRef<HTMLIFrameElement>((_, ref) => {
  const { iframeRef, initIframeSrc } = useMlflowPathSync(ref);

  return (
    <iframe
      ref={iframeRef}
      title="MLflow Experiments Interface"
      src={initIframeSrc}
      data-testid="mlflow-iframe"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
});

export default MlflowIframe;
