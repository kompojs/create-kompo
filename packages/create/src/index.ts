#!/usr/bin/env node

import fs from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { cancel, intro, isCancel, log, note, outro, select, spinner, text } from '@clack/prompts'
import { Command } from 'commander'
import color from 'picocolors'

const VERSION = '0.1.1'

// ---------------------------------------------------------------------------
// Package manager detection (for the host system)
// ---------------------------------------------------------------------------

type PM = 'pnpm' | 'npm' | 'yarn' | 'bun'

function detectPM(): PM {
  const ua = process.env.npm_config_user_agent ?? ''
  if (ua.startsWith('pnpm')) return 'pnpm'
  if (ua.startsWith('yarn')) return 'yarn'
  if (ua.startsWith('bun')) return 'bun'
  // Fallback: check which binary is available
  for (const pm of ['pnpm', 'yarn', 'bun'] as PM[]) {
    try {
      execSync(`${pm} --version`, { stdio: 'ignore' })
      return pm
    } catch {}
  }
  return 'npm'
}

function pmExec(pm: PM): string {
  switch (pm) {
    case 'pnpm': return 'pnpm exec'
    case 'yarn': return 'yarn'
    case 'bun': return 'bunx'
    default: return 'npx'
  }
}

// ---------------------------------------------------------------------------
// Scaffold helpers
// ---------------------------------------------------------------------------

function createRootPackageJson(
  dir: string,
  projectName: string,
  pm: PM,
): void {
  const pkg: Record<string, unknown> = {
    name: projectName,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'turbo run dev --parallel',
      build: 'turbo run build',
      kompo: `${pmExec(pm)} kompo`,
    },
  }

  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
}

function createWorkspaceConfig(dir: string, pm: PM): void {
  if (pm === 'pnpm') {
    fs.writeFileSync(
      path.join(dir, 'pnpm-workspace.yaml'),
      'packages:\n  - apps/*\n  - libs/**\n  - packages/*\n',
    )
  } else {
    // npm / yarn / bun use package.json#workspaces
    const pkgPath = path.join(dir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    pkg.workspaces = ['apps/*', 'libs/**', 'packages/*']
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  }
}

function createTurboJson(dir: string): void {
  const turbo = {
    $schema: 'https://turbo.build/schema.json',
    tasks: {
      build: {
        dependsOn: ['^build'],
        outputs: ['dist/**', '.next/**', 'build/**'],
      },
      dev: {
        cache: false,
        persistent: true,
      },
      clean: {},
    },
  }
  fs.writeFileSync(path.join(dir, 'turbo.json'), JSON.stringify(turbo, null, 2) + '\n')
}

function createTsConfigBase(dir: string): void {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
  }
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n')
}

function createGitignore(dir: string): void {
  fs.writeFileSync(
    path.join(dir, '.gitignore'),
    [
      'node_modules',
      'dist',
      '.next',
      'build',
      '.turbo',
      '*.tsbuildinfo',
      '.env',
      '.env.local',
      '',
    ].join('\n'),
  )
}

function createKompoDirectories(dir: string): void {
  fs.mkdirSync(path.join(dir, 'apps'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'libs'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'packages'), { recursive: true })
  fs.mkdirSync(path.join(dir, '.kompo'), { recursive: true })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const program = new Command('create-kompo')

program
  .version(VERSION)
  .argument('[directory]', 'Project directory')
  .option('-t, --template <name>', 'Starter template to use (e.g. nextjs.shadcn.blank)')
  .option('--pm <manager>', 'Package manager to use (pnpm|npm|yarn|bun)')
  .action(async (directory: string | undefined, options: { template?: string; pm?: PM }) => {
    console.clear()
    intro(color.bgBlue(color.white(' create-kompo ')))

    // 1. Directory
    if (!directory) {
      const dir = await text({
        message: 'Where should we create your project?',
        placeholder: './my-kompo-app',
        initialValue: './my-kompo-app',
      })
      if (isCancel(dir)) { cancel('Operation cancelled.'); process.exit(0) }
      directory = dir as string
    }

    const targetDir = path.resolve(process.cwd(), directory)
    const relativeDir = path.relative(process.cwd(), targetDir)
    const projectName = path.basename(targetDir)

    if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
      cancel(`Directory ${relativeDir} is not empty. Please choose another one.`)
      process.exit(1)
    }

    // 2. Package manager
    let pm: PM = options.pm ?? detectPM()

    if (!options.pm) {
      const pmChoice = await select({
        message: 'Which package manager?',
        options: [
          { value: 'pnpm', label: 'pnpm', hint: 'recommended' },
          { value: 'npm', label: 'npm' },
          { value: 'yarn', label: 'yarn' },
          { value: 'bun', label: 'bun' },
        ],
        initialValue: pm,
      })
      if (isCancel(pmChoice)) { cancel('Operation cancelled.'); process.exit(0) }
      pm = pmChoice as PM
    }

    // 3. Scaffold project structure
    const s = spinner()
    s.start('Scaffolding project...')

    fs.mkdirSync(targetDir, { recursive: true })
    createRootPackageJson(targetDir, projectName, pm)
    createWorkspaceConfig(targetDir, pm)
    createTurboJson(targetDir)
    createTsConfigBase(targetDir)
    createGitignore(targetDir)
    createKompoDirectories(targetDir)

    s.stop('Project structure created!')

    // 4. Install core dependencies
    s.start(`Installing dependencies with ${pm}...`)
    try {
      const deps = [
        '@kompojs/cli',
        '@kompojs/blueprints',
        '@kompojs/config',
        '@kompojs/kit',
        'turbo',
        'typescript',
      ]

      let installCmd: string
      switch (pm) {
        case 'pnpm':
          installCmd = `pnpm add -Dw ${deps.join(' ')}`
          break
        case 'yarn':
          installCmd = `yarn add -DW ${deps.join(' ')}`
          break
        case 'bun':
          installCmd = `bun add -d ${deps.join(' ')}`
          break
        default:
          installCmd = `npm install -D ${deps.join(' ')}`
      }

      execSync(installCmd, { cwd: targetDir, stdio: 'pipe' })
      s.stop('Dependencies installed!')
    } catch (e) {
      s.stop('Failed to install dependencies.')
      log.error(`Make sure ${pm} is installed and accessible.`)
      log.error(String(e))
      process.exit(1)
    }

    // 5. Install blueprint package for the target framework (if template specified)
    const frameworkFromTemplate = options.template?.split('.')[0]
    if (frameworkFromTemplate) {
      const bpPkg = `@kompojs/blueprints-${frameworkFromTemplate}`
      s.start(`Installing ${bpPkg}...`)
      try {
        const addCmd = pm === 'pnpm' ? `pnpm add -Dw ${bpPkg}`
          : pm === 'yarn' ? `yarn add -DW ${bpPkg}`
          : pm === 'bun' ? `bun add -d ${bpPkg}`
          : `npm install -D ${bpPkg}`
        execSync(addCmd, { cwd: targetDir, stdio: 'pipe' })
        s.stop(`Installed ${bpPkg}!`)
      } catch {
        s.stop(`Could not install ${bpPkg} — the core fallback will be used.`)
      }
    }

    // 6. Run kompo add app
    console.log('')
    intro(color.bgGreen(color.black(' INITIALIZING PROJECT ')))

    try {
      const kompoExec = pmExec(pm)
      const args = ['kompo', 'add', 'app']
      if (options.template) {
        args.push('--template', options.template)
        log.info(color.dim(`Applying template: ${options.template}...`))
      } else {
        log.info(color.dim('Running interactive setup...'))
      }

      execSync(`${kompoExec} ${args.join(' ')}`, {
        cwd: targetDir,
        stdio: 'inherit',
      })
    } catch (e) {
      log.error('Failed to initialize project.')
      log.error(String(e))
      process.exit(1)
    }

    // 7. Init git
    try {
      execSync('git init', { cwd: targetDir, stdio: 'pipe' })
      execSync('git add -A', { cwd: targetDir, stdio: 'pipe' })
      execSync('git commit -m "Initial commit from create-kompo"', { cwd: targetDir, stdio: 'pipe' })
    } catch {
      // Git init is best-effort
    }

    // 8. Done!
    const runCmd = pm === 'npm' ? 'npm run' : pm
    const nextSteps = [`cd ${relativeDir}`, `${runCmd} dev`]
    note(nextSteps.join('\n'), 'Next steps')
    outro(color.green('You are all set!'))
  })

program.parse()
