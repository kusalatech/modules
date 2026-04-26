.PHONY: dev-up dev-down dev-ps test

dev-up:
	podman compose up -d

dev-down:
	podman compose down

dev-ps:
	podman compose ps

test:
	cd packages/node-email-verification && npm run build && npm test
	cd packages/python-email-verification && \
		python -m venv .venv >/dev/null 2>&1 || true && \
		. .venv/bin/activate && \
		pip install -q -e ".[dev]" && \
		pytest -q

