<<<<<<< HEAD
import { ImageVersionDependencyType } from '#~/pages/projects/screens/spawner/types';
import { ImageStreamKind, ImageStreamSpecTagType } from '#~/k8sTypes';
=======
import { ImageVersionDependencyType } from '~/pages/projects/screens/spawner/types';
import { ImageStreamKind, ImageStreamSpecTagType } from '~/k8sTypes';
import { Notebook } from '~/types';
import { ServerStatus } from '~/pages/notebookController/screens/admin/types';
>>>>>>> bea129c4f (minimized use of hooks)
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

export type StopAdminWorkbenchModalProps = {
  notebooksToStop: Notebook[];
  isDeleting: boolean;
  showModal: boolean;
  link: string;
  handleStopWorkbenches: (serverStatusesArr: ServerStatus[]) => void;
  onNotebooksStop: (didStop: boolean) => void;
  onStop: (activeServers: ServerStatus[]) => void;
};
