# Node Dev Environment Notes

## Purpose

This note captures the local frontend environment behavior for this repository so future AI collaborators can avoid repeating setup mistakes.

## Current Approved Setup

- OS: macOS
- Node version manager: `fnm`
- Package manager: `npm`
- Frontend stack: `Vite + TypeScript`

## Important PATH Behavior

In the user's interactive terminal, `node` and `npm` are available normally.

In the constrained execution environment used by AI tool calls, `node` and `npm` may not be present on `PATH` even though they are installed correctly via `fnm`.

This means commands like these can fail inside tool execution:

- `npm install`
- `npm run dev`
- `npm run build`
- `which node`
- `which npm`

## Known Working Node Location

For this machine, the installed Node binary path is:

```text
/Users/floretli/.fnm/node-versions/v24.14.1/installation/bin/node
```

The npm CLI entry is:

```text
/Users/floretli/.fnm/node-versions/v24.14.1/installation/lib/node_modules/npm/bin/npm-cli.js
```

## Correct Execution Pattern

When AI tools cannot find `npm`, use the explicit Node + npm CLI path.

Base pattern:

```bash
/Users/floretli/.fnm/node-versions/v24.14.1/installation/bin/node \
  /Users/floretli/.fnm/node-versions/v24.14.1/installation/lib/node_modules/npm/bin/npm-cli.js <command>
```

Examples:

```bash
/Users/floretli/.fnm/node-versions/v24.14.1/installation/bin/node \
  /Users/floretli/.fnm/node-versions/v24.14.1/installation/lib/node_modules/npm/bin/npm-cli.js install
```

```bash
/Users/floretli/.fnm/node-versions/v24.14.1/installation/bin/node \
  /Users/floretli/.fnm/node-versions/v24.14.1/installation/lib/node_modules/npm/bin/npm-cli.js run build
```

## Important Install Caveat

Some npm dependencies run postinstall scripts that invoke `node` from `PATH`.

During `npm install`, this caused `esbuild` installation to fail with:

```text
sh: node: command not found
```

To fix this, export the `fnm` Node bin directory into `PATH` before running npm commands:

```bash
export PATH="/Users/floretli/.fnm/node-versions/v24.14.1/installation/bin:$PATH"
```

Recommended safe command pattern for AI tool execution:

```bash
export PATH="/Users/floretli/.fnm/node-versions/v24.14.1/installation/bin:$PATH" && \
/Users/floretli/.fnm/node-versions/v24.14.1/installation/bin/node \
/Users/floretli/.fnm/node-versions/v24.14.1/installation/lib/node_modules/npm/bin/npm-cli.js install
```

Use the same `export PATH=...` prefix for:

- `install`
- `run dev`
- `run build`
- other npm script execution

## Working Principles

- Do not assume missing `npm` means Node is not installed.
- First suspect missing `PATH` propagation from `fnm`.
- Prefer explicit Node and npm CLI paths in AI tool calls.
- When npm scripts may spawn child processes, export the `fnm` bin directory into `PATH`.
- In normal user terminal sessions, plain `npm run dev` should still work.
