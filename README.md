<div align="center">
  <h1>create-kompo</h1>
  <p><strong>Scaffold a new Kompo project in seconds.</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/create-kompo"><img src="https://img.shields.io/npm/v/create-kompo?style=flat-square&color=blue" alt="Version" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  </p>
</div>

---

## Usage

Create a new Kompo project with your preferred package manager:

```bash
# pnpm (recommended)
pnpm create kompo@latest my-app

# npm
npm create kompo@latest my-app

# yarn
yarn create kompo my-app

# bun
bun create kompo my-app
```

### With a template

```bash
pnpm create kompo@latest my-app --template nextjs.tailwind.blank
```

### Non-interactive

```bash
pnpm create kompo@latest my-app --pm pnpm --template nextjs.shadcn.blank
```

## What it does

1. Creates a monorepo project structure (apps/, libs/, packages/)
2. Configures your workspace (pnpm-workspace.yaml or package.json#workspaces)
3. Installs `@kompojs/core`, `@kompojs/blueprints`, and Turbo
4. Runs `kompo add app` to scaffold your first application
5. Initializes a git repository

## Packages

| Package | Description |
|:--|:--|
| `@kompojs/create-kompo` | Core scaffolding logic |
| `create-kompo` | npm wrapper (`npm create kompo`) |
| `create-kompojs` | npm wrapper (`npm create kompojs`) |

## Development

```bash
git clone https://github.com/kompojs/create-kompo.git
cd create-kompo
pnpm install
pnpm build

# Test locally
node packages/create/dist/index.js my-test-app
```

## Related Repositories

| Repository | Description |
|:--|:--|
| [kompojs/kompo](https://github.com/kompojs/kompo) | CLI, kit, config, core runtime |
| [kompojs/blueprints](https://github.com/kompojs/blueprints) | Blueprint packages |
| [kompojs/workbench](https://github.com/kompojs/workbench) | Visual architecture explorer |

## License

**MIT © 2026 SmarttDev and Kompo contributors**
