import { InferenceServiceKind } from "~/k8sTypes";

export const mockInferenceServiceK8sResource = (name: string, namespace: string, displayName: string): InferenceServiceKind => (
    {
        "apiVersion": "serving.kserve.io/v1beta1",
        "kind": "InferenceService",
        "metadata": {
            "annotations": {
                "openshift.io/display-name": displayName,
                "serving.kserve.io/deploymentMode": "ModelMesh"
            },
            "creationTimestamp": "2023-03-17T16:12:41Z",
            "generation": 1,
            "labels": {
                "name": name,
                "opendatahub.io/dashboard": "true"
            },
            "name": name,
            "namespace": namespace,
            "resourceVersion": "1309350",
            "uid": "c275044f-85f7-44dc-9539-b9fdf6fcf334"
        },
        "spec": {
            "predictor": {
                "model": {
                    "modelFormat": {
                        "name": "onnx",
                        "version": "1"
                    },
                    "runtime": "model-server-project",
                    "storage": {
                        "key": "aws-connection-test",
                        "path": ""
                    }
                }
            }
        },
        "status": {
            "components": {},
            "url": "",
            "conditions": [
                {
                    "lastTransitionTime": "2023-03-17T16:12:41Z",
                    "status": "False",
                    "type": "PredictorReady"
                },
                {
                    "lastTransitionTime": "2023-03-17T16:12:41Z",
                    "status": "False",
                    "type": "Ready"
                }
            ],
            "modelStatus": {
                "copies": {
                    "failedCopies": 0,
                    "totalCopies": 0
                },
                "lastFailureInfo": {
                    "message": "Waiting for runtime Pod to become available",
                    "modelRevisionName": "model-size__isvc-59ce37c85b",
                    "reason": "RuntimeUnhealthy",
                    "location": "",
                    "time": ""
                },
                "states": {
                    "activeModelState": "Pending",
                    "targetModelState": ""
                },
                "transitionStatus": ""
            }
        }
    }
)