import { ImageVersionDependencyType } from '#~/pages/projects/screens/spawner/types';
import { ImageStreamKind, ImageStreamSpecTagType } from '#~/k8sTypes';
import { NotebookImageAvailability, NotebookImageStatus } from './const';

export type NotebookImage =
  | {
      imageAvailability: NotebookImageAvailability;
      imageDisplayName: string;
      tagSoftware: string;
      dependencies: ImageVersionDependencyType[];
      imageStream: ImageStreamKind;
      imageVersion: ImageStreamSpecTagType;
      imageStatus?: Exclude<NotebookImageStatus, NotebookImageStatus.DELETED>;
      latestImageVersion?: ImageStreamSpecTagType;
    }
  | {
      imageStatus: NotebookImageStatus.DELETED;
      imageDisplayName?: string;
    };

export type NotebookImageData =
  | [data: null, loaded: false, loadError: undefined]
  | [data: null, loaded: false, loadError: Error]
  | [
      data: {
        imageStatus: NotebookImageStatus.DELETED;
        imageDisplayName?: string;
      },
      loaded: true,
      loadError: undefined,
    ]
  | [
      data: {
        imageAvailability: NotebookImageAvailability;
        imageDisplayName: string;
        imageStream: ImageStreamKind;
        imageVersion: ImageStreamSpecTagType;
        latestImageVersion?: ImageStreamSpecTagType;
        imageStatus?: Exclude<NotebookImageStatus, NotebookImageStatus.DELETED>;
      },
      loaded: true,
      loadError: undefined,
    ];
