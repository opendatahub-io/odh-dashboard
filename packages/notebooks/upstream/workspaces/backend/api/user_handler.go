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

package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// UserResponse represents the user settings response
type UserResponse struct {
	UserId       string `json:"userId"`
	ClusterAdmin bool   `json:"clusterAdmin"`
}

// UserEnvelope wraps the UserResponse in the standard envelope format
type UserEnvelope = Envelope[*UserResponse]

// GetUserHandler returns the current user settings
//
//	@Summary		Get user settings
//	@Description	Returns the current user's settings including user ID and admin status
//	@Tags			user
//	@Produce		json
//	@Success		200	{object}	UserEnvelope
//	@Failure		500	{object}	ErrorEnvelope
//	@Router			/user [get]
func (a *App) GetUserHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	// Get user ID from the configured header (set by authentication proxy)
	userId := r.Header.Get(a.Config.UserIdHeader)

	// Remove prefix if configured (e.g., "system:serviceaccount:" prefix)
	if a.Config.UserIdPrefix != "" && len(userId) > len(a.Config.UserIdPrefix) {
		userId = userId[len(a.Config.UserIdPrefix):]
	}

	// Fallback headers for different deployment scenarios
	if userId == "" {
		userId = r.Header.Get("X-Auth-Request-User")
	}
	if userId == "" {
		userId = r.Header.Get("kubeflow-userid")
	}
	if userId == "" {
		userId = "anonymous"
	}

	// For now, assume cluster admin status - this can be enhanced later
	// to check actual RBAC permissions
	response := UserEnvelope{
		Data: &UserResponse{
			UserId:       userId,
			ClusterAdmin: true,
		},
	}

	a.WriteJSON(w, http.StatusOK, response, nil)
}
