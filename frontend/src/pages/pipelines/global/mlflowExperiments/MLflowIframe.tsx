import * as React from 'react';
import { useMlflowPathSync } from './useMlflowPathSync';

const MlflowIframe = React.forwardRef<HTMLIFrameElement>((_, ref) => {
  const internalRef = React.useRef<HTMLIFrameElement>(null);
  const iframeRef = ref && 'current' in ref ? ref : internalRef;
  const { iframeSrc } = useMlflowPathSync(iframeRef);
  return (
    <iframe
      ref={iframeRef}
      title="MLflow Experiments Interface"
      src={iframeSrc}
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
