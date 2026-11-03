package store

import (
	"context"
	"encoding/json"
	"sync"
	"time"
)

// Memory is an in-process Store, used for tests and ephemeral deployments.
type Memory struct {
	mu    sync.RWMutex
	items map[string]State
	now   func() time.Time
}

// NewMemory returns an empty in-memory store.
func NewMemory() *Memory {
	return &Memory{items: make(map[string]State), now: time.Now}
}

func (m *Memory) Get(_ context.Context, profile string) (State, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if s, ok := m.items[profile]; ok {
		return s, nil
	}
	return State{Data: emptyObject}, nil
}

func (m *Memory) Put(_ context.Context, profile string, data json.RawMessage) (State, error) {
	if err := Validate(data); err != nil {
		return State{}, err
	}
	s := State{Data: append(json.RawMessage(nil), data...), UpdatedAt: m.now().UTC()}
	m.mu.Lock()
	m.items[profile] = s
	m.mu.Unlock()
	return s, nil
}

func (m *Memory) Delete(_ context.Context, profile string) error {
	m.mu.Lock()
	delete(m.items, profile)
	m.mu.Unlock()
	return nil
}

func (m *Memory) Ping(context.Context) error { return nil }
func (m *Memory) Close() error               { return nil }
