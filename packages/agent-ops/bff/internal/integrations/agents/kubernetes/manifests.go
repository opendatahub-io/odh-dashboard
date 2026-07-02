package kubernetes

import (
	"fmt"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/intstr"
)

const (
	labelInject    = "kagenti.io/inject"
	labelFramework = "kagenti.io/framework"
	labelManagedBy = "app.kubernetes.io/managed-by"
	labelAppName   = "app.kubernetes.io/name"
	labelComponent = "app.kubernetes.io/component"

	annotationDescription = "kagenti.io/description"

	managedByValue = "odh-dashboard"
	componentValue = "agent"
	containerName  = "agent"
	injectEnabled  = "enabled"
	injectDisabled = "disabled"

	defaultPort    int32 = 8000
	defaultSvcPort int32 = 8080
)

func buildServiceAccount(name, namespace string) *corev1.ServiceAccount {
	return &corev1.ServiceAccount{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ServiceAccount",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				labelManagedBy: managedByValue,
				labelAppName:   name,
			},
		},
	}
}

func buildDeployment(params *agents.DeployAgentParams, ownerRef metav1.OwnerReference) *appsv1.Deployment {
	labels := buildDeploymentLabels(params)

	image := params.ContainerImage
	if params.ImageTag != "" {
		image = fmt.Sprintf("%s:%s", image, params.ImageTag)
	}

	containerPort := defaultPort
	if len(params.ServicePorts) > 0 && params.ServicePorts[0].TargetPort > 0 {
		containerPort = params.ServicePorts[0].TargetPort
	}

	envVars := buildEnvVars(params)

	container := corev1.Container{
		Name:            containerName,
		Image:           image,
		ImagePullPolicy: corev1.PullAlways,
		Ports: []corev1.ContainerPort{
			{
				Name:          "http",
				ContainerPort: containerPort,
				Protocol:      corev1.ProtocolTCP,
			},
		},
		Env: envVars,
		Resources: corev1.ResourceRequirements{
			Limits: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("500m"),
				corev1.ResourceMemory: resource.MustParse("1Gi"),
			},
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("100m"),
				corev1.ResourceMemory: resource.MustParse("256Mi"),
			},
		},
		VolumeMounts: []corev1.VolumeMount{
			{Name: "cache", MountPath: "/app/.cache"},
			{Name: "shared-data", MountPath: "/shared"},
			{Name: "marvin", MountPath: "/.marvin"},
		},
		SecurityContext: &corev1.SecurityContext{
			AllowPrivilegeEscalation: boolPtr(false),
			Capabilities: &corev1.Capabilities{
				Drop: []corev1.Capability{"ALL"},
			},
			SeccompProfile: &corev1.SeccompProfile{
				Type: corev1.SeccompProfileTypeRuntimeDefault,
			},
		},
	}

	var imagePullSecrets []corev1.LocalObjectReference
	if params.ImagePullSecret != "" {
		imagePullSecrets = []corev1.LocalObjectReference{
			{Name: params.ImagePullSecret},
		}
	}

	replicas := int32(1)

	annotations := map[string]string{
		annotationDescription: fmt.Sprintf("Agent '%s' deployed from dashboard.", params.Name),
	}

	return &appsv1.Deployment{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "apps/v1",
			Kind:       "Deployment",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:            params.Name,
			Namespace:       params.Namespace,
			Labels:          labels,
			Annotations:     annotations,
			OwnerReferences: []metav1.OwnerReference{ownerRef},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: selectorLabels(params.Name),
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: labels,
				},
				Spec: corev1.PodSpec{
					ServiceAccountName: params.Name,
					Containers:         []corev1.Container{container},
					ImagePullSecrets:   imagePullSecrets,
					SecurityContext: &corev1.PodSecurityContext{
						RunAsNonRoot: boolPtr(true),
					},
					Volumes: []corev1.Volume{
						{Name: "cache", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
						{Name: "shared-data", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
						{Name: "marvin", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
					},
				},
			},
		},
	}
}

func buildService(params *agents.DeployAgentParams, ownerRef metav1.OwnerReference) *corev1.Service {
	ports := buildServicePorts(params)
	return &corev1.Service{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Service",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:            params.Name,
			Namespace:       params.Namespace,
			Labels:          buildServiceLabels(params),
			OwnerReferences: []metav1.OwnerReference{ownerRef},
		},
		Spec: corev1.ServiceSpec{
			Type:     corev1.ServiceTypeClusterIP,
			Selector: selectorLabels(params.Name),
			Ports:    ports,
		},
	}
}

func buildAgentRuntimeCR(params *agents.DeployAgentParams) *unstructured.Unstructured {
	spec := map[string]any{
		"type": "agent",
		"targetRef": map[string]any{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"name":       params.Name,
		},
	}

	if params.AuthBridgeMode != "" {
		spec["authBridgeMode"] = params.AuthBridgeMode
	}
	if params.MTLSMode != "" {
		spec["mtlsMode"] = params.MTLSMode
	}

	labels := map[string]any{
		labelManagedBy: managedByValue,
		labelAppName:   params.Name,
	}

	obj := &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": agentRuntimeGVR.Group + "/" + agentRuntimeGVR.Version,
			"kind":       "AgentRuntime",
			"metadata": map[string]any{
				"name":      params.Name,
				"namespace": params.Namespace,
				"labels":    labels,
			},
			"spec": spec,
		},
	}
	return obj
}

func buildRoute(name, namespace string, port int32, ownerRef metav1.OwnerReference) *unstructured.Unstructured {
	return &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": openshiftRouteGVR.Group + "/" + openshiftRouteGVR.Version,
			"kind":       "Route",
			"metadata": map[string]any{
				"name":      name,
				"namespace": namespace,
				"labels": map[string]any{
					labelManagedBy: managedByValue,
					labelAppName:   name,
				},
				"ownerReferences": []any{
					map[string]any{
						"apiVersion": ownerRef.APIVersion,
						"kind":       ownerRef.Kind,
						"name":       ownerRef.Name,
						"uid":        string(ownerRef.UID),
						"controller": true,
					},
				},
			},
			"spec": map[string]any{
				"to": map[string]any{
					"kind": "Service",
					"name": name,
				},
				"port": map[string]any{
					"targetPort": fmt.Sprintf("%d", port),
				},
				"tls": map[string]any{
					"termination":                   "edge",
					"insecureEdgeTerminationPolicy": "Redirect",
				},
			},
		},
	}
}

func selectorLabels(name string) map[string]string {
	return map[string]string{
		agents.LabelAgentType: agents.AgentTypeAgent,
		labelAppName:          name,
	}
}

func buildDeploymentLabels(params *agents.DeployAgentParams) map[string]string {
	labels := map[string]string{
		agents.LabelAgentType:    agents.AgentTypeAgent,
		agents.LabelWorkloadType: agents.WorkloadTypeDeployment,
		labelAppName:             params.Name,
		labelManagedBy:           managedByValue,
		labelComponent:           componentValue,
	}

	if params.AuthBridgeEnabled {
		labels[labelInject] = injectEnabled
	} else {
		labels[labelInject] = injectDisabled
	}

	if params.Protocol != "" {
		labels[agents.LabelProtocolPrefix+params.Protocol] = ""
	}

	if params.Framework != "" {
		labels[labelFramework] = params.Framework
	}

	return labels
}

func buildServiceLabels(params *agents.DeployAgentParams) map[string]string {
	labels := map[string]string{
		agents.LabelAgentType:    agents.AgentTypeAgent,
		agents.LabelWorkloadType: agents.WorkloadTypeDeployment,
		labelAppName:             params.Name,
		labelManagedBy:           managedByValue,
		labelComponent:           componentValue,
	}

	if params.Protocol != "" {
		labels[agents.LabelProtocolPrefix+params.Protocol] = ""
	}

	if params.Framework != "" {
		labels[labelFramework] = params.Framework
	}

	return labels
}

func agentEndpointURL(name, namespace string, port int32) string {
	return fmt.Sprintf("http://%s.%s.svc.cluster.local:%d/", name, namespace, port)
}

func buildEnvVars(params *agents.DeployAgentParams) []corev1.EnvVar {
	svcPort := defaultSvcPort
	if len(params.ServicePorts) > 0 && params.ServicePorts[0].Port > 0 {
		svcPort = params.ServicePorts[0].Port
	}
	containerPort := defaultPort
	if len(params.ServicePorts) > 0 && params.ServicePorts[0].TargetPort > 0 {
		containerPort = params.ServicePorts[0].TargetPort
	}

	defaultKeys := []string{"AGENT_ENDPOINT", "HOST", "PORT", "UV_CACHE_DIR"}
	defaultValues := map[string]string{
		"AGENT_ENDPOINT": agentEndpointURL(params.Name, params.Namespace, svcPort),
		"PORT":           fmt.Sprintf("%d", containerPort),
		"HOST":           "0.0.0.0",
		"UV_CACHE_DIR":   "/app/.cache/uv",
	}

	seen := make(map[string]bool)
	for _, ev := range params.EnvVars {
		seen[strings.TrimSpace(ev.Name)] = true
	}

	var result []corev1.EnvVar
	for _, name := range defaultKeys {
		if !seen[name] {
			result = append(result, corev1.EnvVar{Name: name, Value: defaultValues[name]})
		}
	}

	for _, ev := range params.EnvVars {
		result = append(result, corev1.EnvVar{
			Name:  ev.Name,
			Value: ev.Value,
		})
	}
	return result
}

func buildServicePorts(params *agents.DeployAgentParams) []corev1.ServicePort {
	if len(params.ServicePorts) > 0 {
		ports := make([]corev1.ServicePort, 0, len(params.ServicePorts))
		for _, sp := range params.ServicePorts {
			protocol := corev1.ProtocolTCP
			if sp.Protocol != "" {
				protocol = corev1.Protocol(sp.Protocol)
			}
			ports = append(ports, corev1.ServicePort{
				Name:       sp.Name,
				Port:       sp.Port,
				TargetPort: intstr.FromInt32(sp.TargetPort),
				Protocol:   protocol,
			})
		}
		return ports
	}

	return []corev1.ServicePort{
		{
			Name:       "http",
			Port:       defaultSvcPort,
			TargetPort: intstr.FromInt32(defaultPort),
			Protocol:   corev1.ProtocolTCP,
		},
	}
}

func boolPtr(b bool) *bool {
	return &b
}
