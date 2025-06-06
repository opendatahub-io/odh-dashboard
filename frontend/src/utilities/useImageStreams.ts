import { ImageStreamKind } from '#~/k8sTypes';
import { groupVersionKind, ImageStreamModel } from '#~/api';
import { CustomWatchK8sResult, ImageStreamLabel, ImageType } from '#~/types';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

type UseImageStreamsOptions = {
  enabled?: boolean;
  type?: ImageType;
};

export const useImageStreams = (
  namespace: string,
  opts: UseImageStreamsOptions = {},
): CustomWatchK8sResult<ImageStreamKind[]> => {
  const labelSelectorEntries: Record<string, string> = {};
  if (opts.enabled === true) {
    labelSelectorEntries[ImageStreamLabel.NOTEBOOK] = 'true';
  } else if (opts.enabled === false) {
    labelSelectorEntries[ImageStreamLabel.NOTEBOOK] = 'false';
  }
  if (opts.type === 'byon') {
    labelSelectorEntries['app.kubernetes.io/created-by'] = 'byon';
  }
  return useK8sWatchResourceList<ImageStreamKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(ImageStreamModel),
      namespace,
      ...(Object.keys(labelSelectorEntries).length > 0 && {
        selector: {
          matchLabels: labelSelectorEntries,
        },
      }),
    },
    ImageStreamModel,
  );
};
