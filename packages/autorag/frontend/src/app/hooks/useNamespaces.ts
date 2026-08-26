import { createUseNamespaces } from '@odh-dashboard/autox-core/ui/hooks';
import { getNamespaces } from '~/app/api/k8s';

export const useNamespaces = createUseNamespaces(getNamespaces);
