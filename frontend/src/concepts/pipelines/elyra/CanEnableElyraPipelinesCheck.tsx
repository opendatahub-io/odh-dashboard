import * as React from 'react';
import useElyraSecret from '#~/concepts/pipelines/elyra/useElyraSecret';

type CanEnableElyraPipelinesCheckProps = {
  children: (canEnablePipelines: boolean) => React.ReactNode;
  namespace: string;
};

const CanEnableElyraPipelinesCheck: React.FC<CanEnableElyraPipelinesCheckProps> = ({
  children,
  namespace,
}) => {
  // Assume the DSPA is there and try to fetch the secret's existence
  const [elyraSecret, loaded, error] = useElyraSecret(namespace, true);

  const canEnable = loaded && !error ? !!elyraSecret : false;

  return <>{children(canEnable)}</>;
};

export default CanEnableElyraPipelinesCheck;
