import {
  compareTagVersions,
  isImageBuildInProgress,
  isImageTagBuildValid,
  checkOrder,
  getVersion,
  getNameVersionString,
  getDefaultTag,
  getTagForImage,
  getImageTagVersion,
  getDescriptionForTag,
  getImageTagByContainer,
} from '#~/utilities/imageUtils';
import {
  ImageTagInfo,
  ImageInfo,
  BuildStatus,
  BuildPhase,
  NameVersionPair,
  ImageSoftwareType,
  ImageTag,
  PodContainer,
} from '#~/types';

describe('compareTagVersions', () => {
  it('should sort recommended tags first', () => {
    const recemendedTagVersion = {
      tag: [
        { name: 'v1', recommended: false },
        { name: 'v2', recommended: true },
        { name: 'v3', recommended: false },
      ] as ImageTagInfo[],
    };
    expect(recemendedTagVersion.tag.toSorted(compareTagVersions)).toEqual([
      { name: 'v2', recommended: true },
      { name: 'v3', recommended: false },
      { name: 'v1', recommended: false },
    ]);
  });
});
describe('isImageBuildInProgress', () => {
  it('should return true if image build is in progress', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'image:tag1',
        status: BuildPhase.new,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      name: 'image',
      tags: [{ name: 'tag1' }] as ImageTagInfo[],
    } as ImageInfo;
    expect(isImageBuildInProgress(buildStatuses, image)).toBe(true);
  });
  it('should return false if image build is not in progress', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'imageName:tag1',
        status: BuildPhase.complete,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      name: 'imageName',
      tags: [{ name: 'tag1' }, { name: 'tag2' }] as ImageTagInfo[],
    } as ImageInfo;

    expect(isImageBuildInProgress(buildStatuses, image)).toBe(false);
  });
});
describe('isImageTagBuildValid', () => {
  it('should return true if image tag build is valid', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'image:tag1',
        status: BuildPhase.complete,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      name: 'image',
      tags: [{ name: 'tag1' }] as ImageTagInfo[],
    } as ImageInfo;
    const tag = { name: 'tag1' } as ImageTagInfo;
    expect(isImageTagBuildValid(buildStatuses, image, tag)).toBe(true);
  });
  it('should return false if image tag build is invalid', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'image:tag1',
        status: BuildPhase.failed,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      name: 'image',
      tags: [{ name: 'tag1' }] as ImageTagInfo[],
    } as ImageInfo;
    const tag = { name: 'tag1' } as ImageTagInfo;
    expect(isImageTagBuildValid(buildStatuses, image, tag)).toBe(false);
  });
});
describe('checkOrder', () => {
  it('should return 1 if a.order is greater than b.order', () => {
    const a = { order: 2 } as ImageInfo;
    const b = { order: 1 } as ImageInfo;
    expect(checkOrder(a, b)).toBe(1);
  });
  it('should return -1 if a.order is less than b.order', () => {
    const a = { order: 1 } as ImageInfo;
    const b = { order: 2 } as ImageInfo;
    expect(checkOrder(a, b)).toBe(-1);
  });
  it('should return 0 if a.order is equal to b.order', () => {
    const a = { order: 1 } as ImageInfo;
    const b = { order: 1 } as ImageInfo;
    expect(checkOrder(a, b)).toBe(0);
  });
});
describe('getVersion', () => {
  it('should return version if version is defined', () => {
    expect(getVersion('version1', 'v')).toBe('version1');
  });
  it('should return empty if version is undefined', () => {
    expect(getVersion(undefined, '')).toBe('');
  });
});
describe('getNameVersionString', () => {
  it('should return name and version string', () => {
    const software = { name: 'name', version: 'v1' };
    expect(getNameVersionString(software)).toBe('name v1');
  });
});
describe('getDefaultTag', () => {
  it('should return first tag if image has only one tag', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'image:tag1',
        status: BuildPhase.complete,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      name: 'image',
      tags: [{ name: 'tag1' }] as ImageTagInfo[],
    } as ImageInfo;
    expect(getDefaultTag(buildStatuses, image)).toEqual({ name: 'tag1' });
  });
});
describe('getTagForImage', () => {
  it('should return the selected tag if image has multiple tags and a selected tag is provided', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'imageName:tag1',
        status: BuildPhase.complete,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      name: 'imageName',
      tags: [{ name: 'tag1' }, { name: 'tag2' }] as ImageTagInfo[],
    } as ImageInfo;

    const selectedImage = 'imageName';
    const selectedTag = 'tag2';

    const result = getTagForImage(buildStatuses, image, selectedImage, selectedTag);

    expect(result).toEqual({ name: 'tag2' });
  });
  it('should return the default tag if image has multiple tags and no selected tag is provided', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'imageName:tag1',
        status: BuildPhase.complete,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      default: true,
      name: 'imageName',
      tags: [
        { name: 'tag1', default: true },
        { name: 'tag2', default: false },
      ] as ImageTagInfo[],
    } as ImageInfo;

    const result = getTagForImage(buildStatuses, image);

    expect(result).toEqual({ name: 'tag1', default: true });
  });
});
describe('getImageTagVersion', () => {
  it('should return the selected tag version if image has multiple tags and a selected tag is provided', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'imageName:tag1',
        status: BuildPhase.complete,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      name: 'imageName',
      tags: [{ name: 'tag1' }, { name: 'tag2' }] as ImageTagInfo[],
    } as ImageInfo;

    const selectedImage = 'imageName';
    const selectedTag = 'tag2';

    const result = getImageTagVersion(buildStatuses, image, selectedImage, selectedTag);

    expect(result).toBe('tag2');
  });
  it('should return the default tag version if image has multiple tags and no selected tag is provided', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'imageName:tag1',
        status: BuildPhase.complete,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      default: true,
      name: 'imageName',
      tags: [
        { name: 'tag1', default: true },
        { name: 'tag2', default: false },
      ] as ImageTagInfo[],
    } as ImageInfo;

    const result = getImageTagVersion(buildStatuses, image);

    expect(result).toBe('tag1');
  });

  it('should return empty string if image has no tags', () => {
    const buildStatuses: BuildStatus[] = [
      {
        name: 'Build1',
        imageTag: 'imageName:tag1',
        status: BuildPhase.complete,
        timestamp: '2022-01-01',
      },
    ];

    const image = {
      name: 'imageName',
      tags: {},
    } as ImageInfo;

    const result = getImageTagVersion(buildStatuses, image);

    expect(result).toBe('');
  });
});
describe('getDescriptionForTag', () => {
  const createSoftware = (name: string, version: string): ImageSoftwareType => ({
    name,
    version,
  });

  it('should return software descriptions joined by commas if imageTag is provided', () => {
    const imageTag: ImageTagInfo = {
      name: 'tag1',
      content: {
        software: [createSoftware('Software1', 'v1'), createSoftware('Software2', 'v2')],
      } as ImageTagInfo['content'],
    } as ImageTagInfo;

    // Mock the implementation of getNameVersionString
    jest.mock('#~/utilities/imageUtils', () => ({
      ...jest.requireActual('#~/utilities/imageUtils'),
      getNameVersionString: jest.fn((software) => `${software.name} ${software.version}`),
    }));

    const result = getDescriptionForTag(imageTag);

    expect(result).toBe('Software1 v1, Software2 v2');
  });

  it('should return an empty string if imageTag is not provided', () => {
    const result = getDescriptionForTag(undefined);
    expect(result).toBe('');
  });

  it('should return an empty string if software array is empty', () => {
    const imageTag = {
      name: 'tag1',
      content: {
        software: [] as NameVersionPair[],
      } as ImageTagInfo['content'],
    } as ImageTagInfo;

    const result = getDescriptionForTag(imageTag);

    expect(result).toBe('');
  });
});
describe('getImageTagByContainer', () => {
  const createImage = (name: string, tags: string[]) =>
    ({
      name,
      tags: tags.map((tagName) => ({ name: tagName })),
    } as ImageInfo);

  it('should return ImageTag with image and tag when container has a valid image', () => {
    const images = [
      createImage('image1', ['tag1', 'tag2']),
      createImage('image2', ['tag3', 'tag4']),
    ] as ImageInfo[];

    const container = {
      name: 'container1',
      image: 'registry.com/image1:tag2',
      env: [],
    } as PodContainer;

    const result = getImageTagByContainer(images, container) as ImageTag;
    expect(result).toEqual({ image: images[0], tag: images[0]?.tags[1] });
  });

  it('should return ImageTag with undefined image and tag when container has an invalid image format', () => {
    const images = [
      createImage('image1', ['tag1', 'tag2']),
      createImage('image2', ['tag3', 'tag4']),
    ] as ImageInfo[];

    const container = {
      name: 'container2',
      image: 'registry.com/invalidImageFormat',
      env: [],
    } as PodContainer;

    const result: ImageTag = getImageTagByContainer(images, container);

    expect(result).toEqual({ image: undefined, tag: undefined });
  });

  it('should return ImageTag with undefined image and tag when container has an unknown image name', () => {
    const images: ImageInfo[] = [
      createImage('image1', ['tag1', 'tag2']),
      createImage('image2', ['tag3', 'tag4']),
    ];

    const container = {
      name: 'container3',
      image: 'registry.com/unknownImage:tag3',
      env: [],
    };

    const result: ImageTag = getImageTagByContainer(images, container);

    expect(result).toEqual({ image: undefined, tag: undefined });
  });

  it('should return ImageTag with undefined image and tag when container has no image', () => {
    const images: ImageInfo[] = [
      createImage('image1', ['tag1', 'tag2']),
      createImage('image2', ['tag3', 'tag4']),
    ];

    const container: PodContainer = {
      name: 'container5',
      image: '',
      env: [],
    };

    const result = getImageTagByContainer(images, container) as ImageTag;
    expect(result).toEqual({ image: undefined, tag: undefined });
  });
});
