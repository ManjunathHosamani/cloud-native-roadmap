// Package store persists the learner's progress document.
//
// The state is an opaque JSON object owned by the frontend; the server only
// validates that it is a well-formed object of bounded size.
package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

// DefaultProfile is the profile used by the single-user desktop deployment.
const DefaultProfile = "default"

// ErrInvalidState is returned when a state document is not a JSON object.
var ErrInvalidState = errors.New("state must be a JSON object")

// State is a stored progress document.
type State struct {
	Data      json.RawMessage
	UpdatedAt time.Time
}

// Store is implemented by all persistence backends.
type Store interface {
	// Get returns the state for profile. A profile with no saved state
	// returns an empty object and a zero UpdatedAt.
	Get(ctx context.Context, profile string) (State, error)
	// Put replaces the state for profile.
	Put(ctx context.Context, profile string, data json.RawMessage) (State, error)
	// Delete removes the state for profile.
	Delete(ctx context.Context, profile string) error
	// Ping reports whether the backend is ready to serve requests.
	Ping(ctx context.Context) error
	Close() error
}

// Validate reports whether data is a JSON object.
func Validate(data json.RawMessage) error {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(data, &obj); err != nil || obj == nil {
		return ErrInvalidState
	}
	return nil
}

var emptyObject = json.RawMessage(`{}`)
