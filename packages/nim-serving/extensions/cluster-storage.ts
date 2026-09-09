import type { ClusterStorageContextExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';

const extensions: ClusterStorageContextExtension[] = [
  {
    type: 'app.cluster-storage/storage-context',
    properties: {
      title: 'NIM storage',
      description:
        'Appropriate for caching NIM models. Enables you to define a subpath for the NIM image.',
      isPVCUsingStorageContextType: () =>
        import('../src/pages/clusterStorage/clusterStorage').then((m) => m.isNIMPVC),
    },
    flags: {
      required: [SupportedArea.NIM_MODEL],
    },
  },
];

export default extensions;
