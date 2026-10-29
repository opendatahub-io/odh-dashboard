/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package tls

import (
	"context"
	"reflect"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// ProfileWatcher watches the APIServer CR and triggers a callback when the
// TLS security profile changes. Uses unstructured client to avoid importing
// openshift/api.
type ProfileWatcher struct {
	client.Client
	InitialProfile map[string]any
	// InitialAdherence seeds the last-seen spec.tlsAdherence so the first reconcile
	// does not fire a spurious change when the value already matches.
	InitialAdherence string
	// OnProfileChange is invoked when the profile OR the adherence policy changes.
	// Returning an error leaves the last-seen values unchanged and requeues the
	// request so the change is retried (e.g. when an in-process re-resolution
	// failed transiently).
	OnProfileChange func(ctx context.Context) error
	lastProfile     map[string]any
	lastAdherence   string
}

func (w *ProfileWatcher) Reconcile(
	ctx context.Context, req reconcile.Request,
) (reconcile.Result, error) {
	if req.Name != apiServerName {
		return reconcile.Result{}, nil
	}

	apiServer := &unstructured.Unstructured{}
	apiServer.SetGroupVersionKind(apiServerGVK)
	if err := w.Get(ctx, req.NamespacedName, apiServer); err != nil {
		return reconcile.Result{}, client.IgnoreNotFound(err)
	}

	current, _, _ := unstructured.NestedMap(
		apiServer.Object, fieldSpec, fieldTLSSecurityProfile,
	)
	current = normalizeProfileMap(current)
	currentAdherence, _, adhErr := unstructured.NestedString(
		apiServer.Object, fieldSpec, fieldTLSAdherence,
	)
	// A malformed adherence field coerces to "" and would compare equal to a previous
	// unset value, silently hiding the change. Treat a decode error as a change so the
	// callback re-resolves (which flags it PolicyUnreadable and retains/retries).
	if w.OnProfileChange != nil &&
		(adhErr != nil || !reflect.DeepEqual(w.lastProfile, current) || w.lastAdherence != currentAdherence) {
		if err := w.OnProfileChange(ctx); err != nil {
			// Leave the last-seen values unchanged so the change is retried on requeue.
			return reconcile.Result{}, err
		}
		w.lastProfile = current
		w.lastAdherence = currentAdherence
	}

	return reconcile.Result{}, nil
}

func (w *ProfileWatcher) SetupWithManager(mgr ctrl.Manager) error {
	w.lastProfile = w.InitialProfile
	w.lastAdherence = w.InitialAdherence

	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(apiServerGVK)

	return ctrl.NewControllerManagedBy(mgr).
		Named("tls-profile-watcher").
		WithOptions(controller.Options{
			NeedLeaderElection: new(false),
		}).
		For(obj, builder.WithPredicates(predicate.Funcs{
			CreateFunc: func(e event.CreateEvent) bool {
				return e.Object.GetName() == apiServerName
			},
			UpdateFunc: func(e event.UpdateEvent) bool {
				return e.ObjectNew.GetName() == apiServerName
			},
			DeleteFunc: func(e event.DeleteEvent) bool {
				return e.Object.GetName() == apiServerName
			},
			GenericFunc: func(e event.GenericEvent) bool {
				return e.Object.GetName() == apiServerName
			},
		})).
		Complete(w)
}

func normalizeProfileMap(m map[string]any) map[string]any {
	if m == nil {
		return intermediateProfileMap()
	}
	return m
}
