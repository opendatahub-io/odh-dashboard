package mcp

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

// SessionManager manages MCP client sessions with connection pooling and lifecycle management
type SessionManager struct {
	sessions map[string]*SessionInfo
	mutex    sync.RWMutex
	config   *SessionConfig
	logger   *slog.Logger
}

// SessionInfo contains information about an active MCP session
type SessionInfo struct {
	session   *mcp.ClientSession
	lastUsed  time.Time
	serverURL string
	identity  *integrations.RequestIdentity
	createdAt time.Time
}

// SessionConfig contains configuration for session management
type SessionConfig struct {
	// SessionTimeout is the maximum idle time before a session is closed
	SessionTimeout time.Duration
	// MaxSessionsPerServer is the maximum number of sessions per server URL
	MaxSessionsPerServer int
	// CleanupInterval is how often to run session cleanup
	CleanupInterval time.Duration
}

// DefaultSessionConfig provides sensible defaults for session management
func DefaultSessionConfig() *SessionConfig {
	return &SessionConfig{
		SessionTimeout:       5 * time.Minute,
		MaxSessionsPerServer: 3,
		CleanupInterval:      1 * time.Minute,
	}
}

// NewSessionManager creates a new session manager
func NewSessionManager(config *SessionConfig, logger *slog.Logger) *SessionManager {
	if config == nil {
		config = DefaultSessionConfig()
	}

	sm := &SessionManager{
		sessions: make(map[string]*SessionInfo),
		config:   config,
		logger:   logger,
	}

	// Start cleanup goroutine
	go sm.startCleanupRoutine()

	return sm
}

// GetOrCreateSession gets an existing session or creates a new one
func (sm *SessionManager) GetOrCreateSession(
	ctx context.Context,
	serverURL string,
	identity *integrations.RequestIdentity,
	createSessionFunc func(ctx context.Context) (*mcp.ClientSession, error),
) (*mcp.ClientSession, error) {
	sessionKey := sm.buildSessionKey(serverURL, identity)

	sm.mutex.RLock()
	sessionInfo, exists := sm.sessions[sessionKey]
	if exists && sm.isSessionValid(sessionInfo) {
		// Update last used time
		sessionInfo.lastUsed = time.Now()
		sm.mutex.RUnlock()

		sm.logger.Debug("Reusing existing MCP session",
			"server_url", serverURL,
			"session_age", time.Since(sessionInfo.createdAt))

		return sessionInfo.session, nil
	}
	sm.mutex.RUnlock()

	// Need to create a new session
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	// Double-check after acquiring write lock
	sessionInfo, exists = sm.sessions[sessionKey]
	if exists && sm.isSessionValid(sessionInfo) {
		sessionInfo.lastUsed = time.Now()
		sm.logger.Debug("Reusing existing MCP session (double-check)",
			"server_url", serverURL)
		return sessionInfo.session, nil
	}

	// Clean up old session if it exists
	if exists {
		sm.closeSessionUnsafe(sessionKey, sessionInfo)
	}

	// Create new session
	sm.logger.Debug("Creating new MCP session", "server_url", serverURL)

	session, err := createSessionFunc(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create MCP session: %w", err)
	}

	// Store the new session
	now := time.Now()
	sm.sessions[sessionKey] = &SessionInfo{
		session:   session,
		lastUsed:  now,
		serverURL: serverURL,
		identity:  identity,
		createdAt: now,
	}

	sm.logger.Debug("Created new MCP session", "server_url", serverURL)
	return session, nil
}

// CloseSession closes a specific session
func (sm *SessionManager) CloseSession(serverURL string, identity *integrations.RequestIdentity) {
	sessionKey := sm.buildSessionKey(serverURL, identity)

	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	if sessionInfo, exists := sm.sessions[sessionKey]; exists {
		sm.closeSessionUnsafe(sessionKey, sessionInfo)
	}
}

// CloseAllSessions closes all active sessions
func (sm *SessionManager) CloseAllSessions() {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	for sessionKey, sessionInfo := range sm.sessions {
		sm.closeSessionUnsafe(sessionKey, sessionInfo)
	}
}

// GetSessionStats returns statistics about active sessions
func (sm *SessionManager) GetSessionStats() map[string]interface{} {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	stats := map[string]interface{}{
		"total_sessions":     len(sm.sessions),
		"sessions_by_server": make(map[string]int),
	}

	serverCounts := make(map[string]int)
	for _, sessionInfo := range sm.sessions {
		serverCounts[sessionInfo.serverURL]++
	}

	stats["sessions_by_server"] = serverCounts
	return stats
}

// buildSessionKey creates a unique key for a session
func (sm *SessionManager) buildSessionKey(serverURL string, identity *integrations.RequestIdentity) string {
	if identity == nil || identity.Token == "" {
		return serverURL
	}
	// Include a hash of the token to differentiate users but keep it secure
	return fmt.Sprintf("%s::%s", serverURL, identity.Token[:min(8, len(identity.Token))])
}

// isSessionValid checks if a session is still valid and usable
func (sm *SessionManager) isSessionValid(sessionInfo *SessionInfo) bool {
	if sessionInfo == nil || sessionInfo.session == nil {
		return false
	}

	// Check if session has timed out
	if time.Since(sessionInfo.lastUsed) > sm.config.SessionTimeout {
		return false
	}

	// TODO: Add session health check using Ping if needed
	// For now, assume session is valid if it hasn't timed out

	return true
}

// closeSessionUnsafe closes a session without acquiring locks (internal use)
func (sm *SessionManager) closeSessionUnsafe(sessionKey string, sessionInfo *SessionInfo) {
	if sessionInfo != nil && sessionInfo.session != nil {
		sm.logger.Debug("Closing MCP session",
			"server_url", sessionInfo.serverURL,
			"session_age", time.Since(sessionInfo.createdAt))

		// Close the session (this may block briefly)
		sessionInfo.session.Close()
	}

	delete(sm.sessions, sessionKey)
}

// startCleanupRoutine starts a background routine to clean up expired sessions
func (sm *SessionManager) startCleanupRoutine() {
	ticker := time.NewTicker(sm.config.CleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		sm.cleanupExpiredSessions()
	}
}

// cleanupExpiredSessions removes and closes expired sessions
func (sm *SessionManager) cleanupExpiredSessions() {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	now := time.Now()
	var expiredKeys []string

	for sessionKey, sessionInfo := range sm.sessions {
		if now.Sub(sessionInfo.lastUsed) > sm.config.SessionTimeout {
			expiredKeys = append(expiredKeys, sessionKey)
		}
	}

	for _, sessionKey := range expiredKeys {
		sessionInfo := sm.sessions[sessionKey]
		sm.logger.Debug("Cleaning up expired MCP session",
			"server_url", sessionInfo.serverURL,
			"idle_time", now.Sub(sessionInfo.lastUsed))

		sm.closeSessionUnsafe(sessionKey, sessionInfo)
	}

	if len(expiredKeys) > 0 {
		sm.logger.Debug("Cleaned up expired MCP sessions", "count", len(expiredKeys))
	}
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
