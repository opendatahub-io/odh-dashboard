import {
  handleUpdateLogic,
  INFERENCE_SERVICE_NAME_REGEX,
  isK8sNameDescriptionDataValid,
  isRouteNameTooLong,
  LimitNameResourceType,
  resourceTypeLimits,
  setupDefaults,
} from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import { K8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
import { mockProjectK8sResource } from '#~/__mocks__';
import { mockK8sNameDescriptionFieldData } from '#~/__mocks__/mockK8sNameDescriptionFieldData';

describe('setupDefaults', () => {
  it('should return a sane default', () => {
    expect(setupDefaults({})).toEqual(mockK8sNameDescriptionFieldData());
  });

  it('should get resource name and description from initial resource', () => {
    expect(
      setupDefaults({
        initialData: mockProjectK8sResource({
          displayName: 'Display Name',
          k8sName: 'k8s-name',
          description: 'my description',
        }),
      }),
    ).toEqual(
      mockK8sNameDescriptionFieldData({
        name: 'Display Name',
        description: 'my description',
        k8sName: {
          value: 'k8s-name',
          state: {
            immutable: true,
          },
        },
      }),
    );
  });

  it('should limit project length if identified', () => {
    expect(
      setupDefaults({
        limitNameResourceType: LimitNameResourceType.PROJECT,
      }),
    ).toEqual(
      mockK8sNameDescriptionFieldData({
        k8sName: {
          state: {
            maxLength: 30,
          },
        },
      }),
    );
  });

  it('should allow prefilling of displayName and description', () => {
    expect(
      setupDefaults({
        initialData: mockProjectK8sResource({
          displayName: 'Display Name',
          k8sName: '',
          description: 'my description',
        }),
      }),
    ).toEqual(
      mockK8sNameDescriptionFieldData({
        name: 'Display Name',
        description: 'my description',
        k8sName: {
          value: 'display-name',
          state: {
            immutable: false,
          },
        },
      }),
    );
  });

  it('should limit PVC resource name', () => {
    expect(
      setupDefaults({
        initialData: mockProjectK8sResource({
          displayName:
            'this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test ',
          k8sName: '',
          description: 'my description',
        }),
        limitNameResourceType: LimitNameResourceType.PVC,
      }),
    ).toEqual(
      mockK8sNameDescriptionFieldData({
        name: 'this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test ',
        description: 'my description',
        k8sName: {
          value: 'this-is-a-test-this-is-a-test-this-is-a-test-this-is-a-test-thi',
          state: {
            immutable: false,
            maxLength: resourceTypeLimits[LimitNameResourceType.PVC],
          },
        },
      }),
    );
  });

  it('should limit project/workbench resource name', () => {
    expect(
      setupDefaults({
        initialData: mockProjectK8sResource({
          displayName:
            'this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test ',
          k8sName: '',
          description: 'my description',
        }),
        limitNameResourceType: LimitNameResourceType.PROJECT,
      }),
    ).toEqual(
      mockK8sNameDescriptionFieldData({
        name: 'this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test ',
        description: 'my description',
        k8sName: {
          value: 'this-is-a-test-this-is-a-test',
          state: {
            immutable: false,
            maxLength: resourceTypeLimits[LimitNameResourceType.PROJECT],
          },
        },
      }),
    );
    expect(
      setupDefaults({
        initialData: mockProjectK8sResource({
          displayName:
            'this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test ',
          k8sName: '',
          description: 'my description',
        }),
        limitNameResourceType: LimitNameResourceType.WORKBENCH,
      }),
    ).toEqual(
      mockK8sNameDescriptionFieldData({
        name: 'this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test ',
        description: 'my description',
        k8sName: {
          value: 'this-is-a-test-this-is-a-test',
          state: {
            immutable: false,
            maxLength: resourceTypeLimits[LimitNameResourceType.WORKBENCH],
          },
        },
      }),
    );
  });
});

describe('handleUpdateLogic', () => {
  it('should handle description update simply', () => {
    expect(
      handleUpdateLogic(mockK8sNameDescriptionFieldData())('description', 'new value'),
    ).toEqual(mockK8sNameDescriptionFieldData({ description: 'new value' }));
  });

  it('should update k8s name when name updates', () => {
    expect(handleUpdateLogic(mockK8sNameDescriptionFieldData())('name', 'new value')).toEqual(
      mockK8sNameDescriptionFieldData({ name: 'new value', k8sName: { value: 'new-value' } }),
    );
  });

  it('should make k8s name touched when directly edited', () => {
    expect(handleUpdateLogic(mockK8sNameDescriptionFieldData())('k8sName', 'new-value')).toEqual(
      mockK8sNameDescriptionFieldData({
        k8sName: { value: 'new-value', state: { touched: true } },
      }),
    );
  });

  it('should auto trim the k8s value if the display name is too long', () => {
    const configuredDefaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.PROJECT,
    });
    const { maxLength } = configuredDefaults.k8sName.state;

    const overMaxLength = 'This is a long string of text that exceeds the max number of characters';
    expect(overMaxLength.length).toBeGreaterThan(maxLength);

    expect(handleUpdateLogic(configuredDefaults)('name', overMaxLength)).toEqual(
      mockK8sNameDescriptionFieldData({
        name: overMaxLength,
        k8sName: {
          value: 'this-is-a-long-string-of-text',
          state: { maxLength },
        },
      }),
    );
  });

  it('should have invalid length if directly modifying k8s value', () => {
    const configuredDefaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.PROJECT,
    });
    const { maxLength } = configuredDefaults.k8sName.state;

    const overMaxLength = 'this-is-a-long-string-of-text-for-k8s';
    expect(overMaxLength.length).toBeGreaterThan(maxLength);

    expect(handleUpdateLogic(configuredDefaults)('k8sName', overMaxLength)).toEqual(
      mockK8sNameDescriptionFieldData({
        k8sName: {
          value: overMaxLength,
          state: { maxLength, invalidLength: true, touched: true },
        },
      }),
    );
  });

  it('should have invalid state with invalid characters', () => {
    expect(
      handleUpdateLogic(mockK8sNameDescriptionFieldData())('k8sName', 'you want what!?'),
    ).toEqual(
      mockK8sNameDescriptionFieldData({
        k8sName: { value: 'you want what!?', state: { invalidCharacters: true, touched: true } },
      }),
    );
  });

  it('should ignore invalid k8s characters when they are in display names', () => {
    expect(
      handleUpdateLogic(mockK8sNameDescriptionFieldData())('name', 'you are okay with this!?'),
    ).toEqual(
      mockK8sNameDescriptionFieldData({
        name: 'you are okay with this!?',
        k8sName: { value: 'you-are-okay-with-this' },
      }),
    );
  });

  it('should not allow update k8s name when immutable', () => {
    const startingImmutableData = setupDefaults({
      initialData: mockProjectK8sResource({
        displayName: 'Display Name',
        k8sName: 'k8s-name',
        description: 'my description',
      }),
    });

    expect(startingImmutableData.k8sName.state.immutable).toBe(true);

    expect(handleUpdateLogic(startingImmutableData)('name', 'Display Name 2')).toEqual(
      mockK8sNameDescriptionFieldData({
        name: 'Display Name 2',
        description: 'my description',
        k8sName: {
          value: 'k8s-name',
          state: {
            immutable: true,
          },
        },
      }),
    );
  });

  it('should handle a safe prefix', () => {
    const safePrefixData = setupDefaults({
      safePrefix: 'wb-',
    });

    expect(handleUpdateLogic(safePrefixData)('name', '1234')).toEqual(
      mockK8sNameDescriptionFieldData({
        name: '1234',
        k8sName: {
          value: 'wb-1234',
          state: {
            safePrefix: 'wb-',
          },
        },
      }),
    );
  });
});

describe('handleUpdateLogic with custom regexp (model deployment)', () => {
  it('should detect invalid characters when k8s name starts with a digit', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      regexp: INFERENCE_SERVICE_NAME_REGEX,
    });

    const result = handleUpdateLogic(defaults)('k8sName', '1test');
    expect(result.k8sName.state.invalidCharacters).toBe(true);
    expect(result.k8sName.state.touched).toBe(true);
  });

  it('should accept k8s name starting with a lowercase letter', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      regexp: INFERENCE_SERVICE_NAME_REGEX,
    });

    const result = handleUpdateLogic(defaults)('k8sName', 'my-model');
    expect(result.k8sName.state.invalidCharacters).toBe(false);
    expect(result.k8sName.state.touched).toBe(true);
  });

  it('should reject k8s name starting with a hyphen', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      regexp: INFERENCE_SERVICE_NAME_REGEX,
    });

    const result = handleUpdateLogic(defaults)('k8sName', '-model');
    expect(result.k8sName.state.invalidCharacters).toBe(true);
  });

  it('should reject k8s name ending with a hyphen', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      regexp: INFERENCE_SERVICE_NAME_REGEX,
    });

    const result = handleUpdateLogic(defaults)('k8sName', 'model-');
    expect(result.k8sName.state.invalidCharacters).toBe(true);
  });

  it('should accept single lowercase letter', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      regexp: INFERENCE_SERVICE_NAME_REGEX,
    });

    const result = handleUpdateLogic(defaults)('k8sName', 'a');
    expect(result.k8sName.state.invalidCharacters).toBe(false);
  });

  it('should reject uppercase letters', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      regexp: INFERENCE_SERVICE_NAME_REGEX,
    });

    const result = handleUpdateLogic(defaults)('k8sName', 'MyModel');
    expect(result.k8sName.state.invalidCharacters).toBe(true);
  });

  it('should store custom regexp and invalidCharsMessage in state', () => {
    const customMessage = 'Must start with a lowercase letter.';
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      regexp: INFERENCE_SERVICE_NAME_REGEX,
      invalidCharsMessage: customMessage,
    });

    expect(defaults.k8sName.state.regexp).toEqual(INFERENCE_SERVICE_NAME_REGEX);
    expect(defaults.k8sName.state.invalidCharsMessage).toBe(customMessage);
  });
});

describe('isK8sNameDescriptionDataValid', () => {
  it('should be false when invalidCharacters', () => {
    expect(
      isK8sNameDescriptionDataValid(
        mockK8sNameDescriptionFieldData({
          k8sName: { value: 'invalid!', state: { invalidCharacters: true } },
        }),
      ),
    ).toBe(false);
  });

  it('should be false when invalidLength', () => {
    expect(
      isK8sNameDescriptionDataValid(
        mockK8sNameDescriptionFieldData({
          k8sName: {
            value: 'this-is-a-long-string-of-text-for-k8s',
            state: { invalidLength: true },
          },
        }),
      ),
    ).toBe(false);
  });

  it('should be false with no errors and no name', () => {
    expect(
      isK8sNameDescriptionDataValid(
        mockK8sNameDescriptionFieldData({
          name: '',
          description: 'does not matter',
          k8sName: {
            value: '',
          },
        }),
      ),
    ).toBe(false);
  });

  it('should be true when no invalid states are present', () => {
    expect(
      isK8sNameDescriptionDataValid(
        // Keep direct mapping / no utility to cause devs to vet if the new flag needs a test
        {
          name: 'test',
          description: 'test',
          k8sName: {
            value: 'k8s-test',
            state: {
              immutable: true,
              invalidLength: false,
              invalidCharacters: false,
              maxLength: 123,
              routeNameTooLong: false,
              touched: true,
            },
          },
        } satisfies K8sNameDescriptionFieldData,
      ),
    ).toBe(true);
  });

  it('should be false when k8s name starts with a digit and custom regexp requires a letter', () => {
    expect(
      isK8sNameDescriptionDataValid(
        mockK8sNameDescriptionFieldData({
          name: '1test',
          k8sName: {
            value: '1test',
            state: {
              regexp: /^[a-z]([-a-z0-9]*[a-z0-9])?$/,
            },
          },
        }),
      ),
    ).toBe(false);
  });

  it('should be true when k8s name starts with a letter and custom regexp requires a letter', () => {
    expect(
      isK8sNameDescriptionDataValid(
        mockK8sNameDescriptionFieldData({
          name: 'my-model',
          k8sName: {
            value: 'my-model',
            state: {
              regexp: /^[a-z]([-a-z0-9]*[a-z0-9])?$/,
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it('should be false when routeNameTooLong', () => {
    expect(
      isK8sNameDescriptionDataValid(
        mockK8sNameDescriptionFieldData({
          name: 'test',
          k8sName: {
            value: 'my-long-resource-name',
            state: { routeNameTooLong: true },
          },
        }),
      ),
    ).toBe(false);
  });
});

describe('isRouteNameTooLong', () => {
  it('should return false when no namespace is provided', () => {
    expect(isRouteNameTooLong('my-resource')).toBe(false);
    expect(isRouteNameTooLong('my-resource', undefined)).toBe(false);
  });

  it('should return false when k8sName is empty', () => {
    expect(isRouteNameTooLong('', 'my-namespace')).toBe(false);
  });

  it('should return false when combined length is within 63 characters', () => {
    // "short-name" (10) + "-" (1) + "my-namespace" (12) = 23
    expect(isRouteNameTooLong('short-name', 'my-namespace')).toBe(false);
  });

  it('should return false when combined length is exactly 63 characters', () => {
    // Create names that total exactly 63 characters: name + 1 (hyphen) + namespace = 63
    const name = 'a'.repeat(30);
    const namespace = 'b'.repeat(32);
    expect(name.length + 1 + namespace.length).toBe(63);
    expect(isRouteNameTooLong(name, namespace)).toBe(false);
  });

  it('should return true when combined length exceeds 63 characters', () => {
    const name = 'a'.repeat(30);
    const namespace = 'b'.repeat(33);
    expect(name.length + 1 + namespace.length).toBe(64);
    expect(isRouteNameTooLong(name, namespace)).toBe(true);
  });

  it('should return true with long name and long namespace', () => {
    // 30-char name + "-" + 40-char namespace = 71 > 63
    expect(
      isRouteNameTooLong(
        'this-is-a-long-resource-name-x',
        'a-very-long-project-namespace-for-opensh',
      ),
    ).toBe(true);
  });
});

describe('setupDefaults with namespace', () => {
  it('should store namespace in state for route-based resource types', () => {
    const result = setupDefaults({
      limitNameResourceType: LimitNameResourceType.WORKBENCH,
      namespace: 'my-project',
    });
    expect(result.k8sName.state.namespace).toBe('my-project');
  });

  it('should not store namespace for non-route-based resource types', () => {
    const result = setupDefaults({
      limitNameResourceType: LimitNameResourceType.PVC,
      namespace: 'my-project',
    });
    expect(result.k8sName.state.namespace).toBeUndefined();
  });

  it('should not store namespace when no limitNameResourceType is set', () => {
    const result = setupDefaults({
      namespace: 'my-project',
    });
    expect(result.k8sName.state.namespace).toBeUndefined();
  });

  it('should store namespace for MODEL_DEPLOYMENT type', () => {
    const result = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      namespace: 'my-project',
    });
    expect(result.k8sName.state.namespace).toBe('my-project');
  });

  it('should initialize routeNameTooLong to true when prefilled k8sName + namespace exceeds 63 chars', () => {
    // k8sName (30 chars) + '-' (1 char) + namespace (33 chars) = 64 > 63
    const longK8sName = 'a'.repeat(30);
    const longNamespace = 'b'.repeat(33);
    const result = setupDefaults({
      initialData: {
        name: 'Display Name',
        k8sName: longK8sName,
        description: 'test',
      },
      limitNameResourceType: LimitNameResourceType.WORKBENCH,
      namespace: longNamespace,
    });
    expect(result.k8sName.state.routeNameTooLong).toBe(true);
    expect(result.k8sName.state.namespace).toBe(longNamespace);
    expect(result.k8sName.value).toBe(longK8sName);
  });

  it('should initialize routeNameTooLong to false when prefilled k8sName + namespace is within 63 chars', () => {
    const shortK8sName = 'my-workbench';
    const shortNamespace = 'my-project';
    const result = setupDefaults({
      initialData: {
        name: 'Display Name',
        k8sName: shortK8sName,
        description: 'test',
      },
      limitNameResourceType: LimitNameResourceType.WORKBENCH,
      namespace: shortNamespace,
    });
    expect(result.k8sName.state.routeNameTooLong).toBe(false);
    expect(result.k8sName.state.namespace).toBe(shortNamespace);
  });
});

describe('handleUpdateLogic with namespace (route name validation)', () => {
  it('should set routeNameTooLong when name update produces k8s name that exceeds route limit', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.WORKBENCH,
      namespace: 'a-very-long-project-namespace-name',
      safePrefix: 'wb-',
    });

    // The namespace is 34 chars, so max k8s name is 63 - 34 - 1 = 28 chars
    // With wb- prefix, that leaves 25 chars for the name portion
    const result = handleUpdateLogic(defaults)('name', 'this is a workbench with a long name');
    // The k8s name will be auto-trimmed to maxLength (30) by translateDisplayNameForK8s
    // wb-this-is-a-workbench-with-a (30 chars) + - + namespace (34 chars) = 65 > 63
    expect(result.k8sName.state.routeNameTooLong).toBe(true);
  });

  it('should not set routeNameTooLong when k8s name is short enough', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.WORKBENCH,
      namespace: 'short-ns',
      safePrefix: 'wb-',
    });

    const result = handleUpdateLogic(defaults)('name', 'my workbench');
    // wb-my-workbench (15 chars) + - + short-ns (8 chars) = 24 < 63
    expect(result.k8sName.state.routeNameTooLong).toBe(false);
  });

  it('should set routeNameTooLong when k8sName is directly edited to exceed route limit', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
      namespace: 'a-very-long-project-namespace-name',
      regexp: INFERENCE_SERVICE_NAME_REGEX,
    });

    // namespace is 34 chars, so max k8s name is 63 - 34 - 1 = 28 chars
    const result = handleUpdateLogic(defaults)('k8sName', 'my-model-deployment-that-is-long');
    expect(result.k8sName.state.routeNameTooLong).toBe(true);
  });

  it('should not set routeNameTooLong when no namespace is configured', () => {
    const defaults = setupDefaults({
      limitNameResourceType: LimitNameResourceType.WORKBENCH,
    });

    const result = handleUpdateLogic(defaults)('name', 'this is a workbench with a long name');
    expect(result.k8sName.state.routeNameTooLong).toBe(false);
  });
});
