# =====================================================
# symbiosis-angular-app — orquestador de tareas
# Uso: make <target>
# =====================================================

.PHONY: help install lint test build clean

help: ## Lista los targets disponibles
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependencias con pnpm
	CI=true pnpm install --frozen-lockfile || CI=true pnpm install

lint: ## eslint
	CI=true pnpm lint

test: ## vitest
	CI=true pnpm test

build: ## ng build producción
	CI=true pnpm build

verify: install lint test build ## Pipeline completo

clean: ## Limpia artefactos de build
	rm -rf dist .angular node_modules/.cache coverage
