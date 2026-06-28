// Package id generates short, sortable-ish, URL-safe identifiers with a type
// prefix (e.g. "run_3f9k2..."). No external dependency.
package id

import (
	"crypto/rand"
	"encoding/base32"
	"strings"
)

var enc = base32.NewEncoding("abcdefghijklmnopqrstuvwxyz234567").WithPadding(base32.NoPadding)

// New returns a prefixed random id, e.g. New("run") -> "run_xxxxxxxxxxxxxxxx".
func New(prefix string) string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand failing is catastrophic; fall back to a fixed marker so we
		// never emit an empty id.
		return prefix + "_0000000000000000"
	}
	return prefix + "_" + enc.EncodeToString(b)
}

// Slug lowercases and hyphenates text for filenames/titles.
func Slug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			prevDash = false
		default:
			if !prevDash && b.Len() > 0 {
				b.WriteByte('-')
				prevDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if len(out) > 60 {
		out = strings.Trim(out[:60], "-")
	}
	if out == "" {
		out = "untitled"
	}
	return out
}
