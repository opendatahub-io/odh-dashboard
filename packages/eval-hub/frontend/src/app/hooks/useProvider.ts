import { useParams } from 'react-router-dom';
import { Provider } from '~/app/types';
import { useProviders } from '~/app/hooks/useProviders';

type UseProviderResult = {
  provider: Provider | undefined;
  loaded: boolean;
};

export const useProvider = (providerId?: string): UseProviderResult => {
  const { namespace } = useParams<{ namespace: string }>();
  const { providers, loaded } = useProviders(namespace ?? '');

  const provider = providerId ? providers.find((p) => p.resource.id === providerId) : undefined;

  return { provider, loaded };
};
