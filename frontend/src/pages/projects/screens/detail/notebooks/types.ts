import { ImageVersionDependencyType } from '~/pages/projects/screens/spawner/types';
import { ImageStreamKind, ImageStreamSpecTagType } from '~/k8sTypes';
import { NotebookImageAvailability } from './const';

export type NotebookImage =
  | {
      imageAvailability: Exclude<NotebookImageAvailability, NotebookImageAvailability.DELETED>;
      imageDisplayName: string;
      tagSoftware: string;
      dependencies: ImageVersionDependencyType[];
    }
  | {
      imageAvailability: NotebookImageAvailability.DELETED;
      imageDisplayName?: string;
    };

export type NotebookImageData =
  | [data: null, loaded: false, loadError: undefined]
  | [data: null, loaded: false, loadError: Error]
  | [
      data: {
        imageAvailability: NotebookImageAvailability.DELETED;
        imageDisplayName?: string;
      },
      loaded: true,
      loadError: undefined,
    ]
  | [
      data: {
        imageAvailability: Exclude<NotebookImageAvailability, NotebookImageAvailability.DELETED>;
        imageDisplayName: string;
        imageStream: ImageStreamKind;
        imageVersion: ImageStreamSpecTagType;
      },
      loaded: true,
      loadError: undefined,
    ];
