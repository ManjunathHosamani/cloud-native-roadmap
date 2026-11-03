BINARY    := roadmap-server
VERSION   ?= $(shell tr -d '[:space:]' < VERSION)
IMAGE     ?= cloud-native-roadmap
LDFLAGS   := -s -w -X main.version=$(VERSION)
PLATFORMS := linux/amd64 linux/arm64 darwin/amd64 darwin/arm64 windows/amd64
CONTEXT    = $(shell kubectl config current-context 2>/dev/null)

.PHONY: help run dev build check vet test validate dist docker up down deploy undeploy clean         install upgrade rollback start stop status backup bump version

help:
	@echo "Usage: make <task>      (version $(VERSION))"
	@echo ""
	@echo "  Develop"
	@echo "    run        check, build and start the app in this terminal (opens the browser)"
	@echo "    dev        start from source without checks (go run)"
	@echo "    check      go vet + go test + content and version validation"
	@echo "    build      check + build bin/$(BINARY)"
	@echo "  Install on this machine"
	@echo "    install    build and install to ~/.local/share/cloud-native-roadmap (+ ~/.local/bin link)"
	@echo "    upgrade    build, stop, back up data, replace, restart, verify (auto-rollback)"
	@echo "    rollback   restore the previous binary (RESTORE_DATA=1 also restores the pre-upgrade database)"
	@echo "    start / stop / status   control the installed app"
	@echo "    backup     snapshot the database now (safe while running)"
	@echo "  Release"
	@echo "    bump       new version: make bump PART=minor NOTE=\"what changed\"   (patch | minor | major | X.Y.Z)"
	@echo "    version    print the version"
	@echo "    dist       binaries for every platform in dist/ with SHA256SUMS"
	@echo "  Containers"
	@echo "    docker     build the image          up/down   Docker Compose on http://localhost:8080"
	@echo "    deploy     roll out to the current kubectl context  [IMAGE=registry/name]   undeploy   delete it"
	@echo "    clean      remove bin/ and dist/"

run: build
	./bin/$(BINARY) -open

dev:
	go run ./cmd/server -open

build: check
	CGO_ENABLED=0 go build -trimpath -ldflags "$(LDFLAGS)" -o bin/$(BINARY) ./cmd/server

check: vet test validate

vet:
	go vet ./...

test:
	go test -race ./...

validate:
	node scripts/version.js check
	node scripts/validate-content.js

dist: check
	@rm -rf dist && mkdir -p dist
	@for p in $(PLATFORMS); do \
		os=$${p%/*}; arch=$${p#*/}; ext=; [ $$os = windows ] && ext=.exe; \
		echo "==> build $$os/$$arch"; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch go build -trimpath -ldflags "$(LDFLAGS)" \
			-o dist/$(BINARY)-$$os-$$arch$$ext ./cmd/server || exit 1; \
	done
	@cd dist && (sha256sum * 2>/dev/null || shasum -a 256 *) > SHA256SUMS
	@echo "Binaries ($(VERSION)) are in dist/ - each one is the complete app."

docker:
	docker build --build-arg VERSION=$(VERSION) -t $(IMAGE):$(VERSION) -t $(IMAGE):latest .

up:
	VERSION=$(VERSION) docker compose up -d --build
	@echo "App running on http://localhost:8080  (stop with: make down)"

down:
	docker compose down

deploy: docker
	@echo "==> target context: $(CONTEXT)"
	@case "$(IMAGE)" in */*) docker push $(IMAGE):$(VERSION);; \
	  *) case "$(CONTEXT)" in kind-*) kind load docker-image $(IMAGE):$(VERSION) --name $${CONTEXT#kind-};; \
	     minikube) minikube image load $(IMAGE):$(VERSION);; esac;; esac
	kubectl apply -f deploy/kubernetes.yaml
	kubectl -n roadmap set image deployment/roadmap server=$(IMAGE):$(VERSION)
	kubectl -n roadmap rollout status deployment/roadmap --timeout=180s
	@echo "Deployed. Open: kubectl -n roadmap port-forward svc/roadmap 8080:80  ->  http://localhost:8080"

undeploy:
	kubectl delete -f deploy/kubernetes.yaml --ignore-not-found

clean:
	rm -rf bin dist

install upgrade rollback start stop status backup:
	@VERSION=$(VERSION) bash scripts/local.sh $@

version:
	@echo $(VERSION)

PART ?= patch
bump:
	node scripts/version.js bump $(PART) $(if $(NOTE),"$(NOTE)")
	@echo "Next: make upgrade   (installs the new version)"
