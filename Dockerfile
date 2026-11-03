# syntax=docker/dockerfile:1

# ---- build: static, CGO-free binary (the SQLite driver is pure Go) ----
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
ARG VERSION=dev
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=${VERSION}" -o /out/roadmap-server ./cmd/server \
 && mkdir -p /out/data

# ---- runtime: distroless, non-root, no shell ----
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/roadmap-server /roadmap-server
COPY --from=build --chown=nonroot:nonroot /out/data /data
ENV ADDR=:8080 DATA_DIR=/data LOG_FORMAT=json
EXPOSE 8080
VOLUME ["/data"]
USER nonroot:nonroot
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["/roadmap-server", "-healthcheck"]
ENTRYPOINT ["/roadmap-server"]
