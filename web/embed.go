// Package web embeds the single-page frontend so the server ships as one binary.
package web

import "embed"

// Assets holds index.html, css/ and js/.
//
//go:embed index.html css js
var Assets embed.FS
