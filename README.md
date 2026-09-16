# Klipp

A terminal coding agent built with **TypeScript and Node.js 24 LTS**.

## Status

The foundation provides a runnable CLI with help and version output, strict type
checking, formatting, smoke tests, and CI. Model integration is the next step;
Klipp cannot converse with a model or modify repositories yet.

## Getting started

Install Node.js 24 (or run `nvm install` if you use nvm), then:

```sh
npm ci
npm run build
npm start -- --help
npm start -- --version
```

To rebuild and run during development:

```sh
npm run dev -- --help
```

To use the `klipp` command locally, run `npm link` after building. The npm package
is private to prevent accidental publication.

## Development checks

```sh
npm run check
```

This runs TypeScript checking, Prettier checking, a build, and CLI smoke tests.
Tests use Node's built-in test runner and launch the compiled CLI from outside
the repository to check normal command-line use.

Use `npm run format` to format files. Generated output lives in `dist/` and is
not committed. GitHub Actions runs checks on Linux, macOS, and Windows.

## Structure

```text
src/cli.ts                CLI entry point
test/cli.test.js          Compiled CLI smoke tests
.github/workflows/ci.yml  Cross-platform checks
```

As functionality grows, keep terminal rendering, the agent loop, model adapters,
and tool execution separate. Introduce those modules when they have real behavior
to implement. The model provider has not been selected yet.

## Build order

Tracked under [KLP-13: Build Klipp's first terminal coding agent](https://linear.app/tharaka/issue/KLP-13).

1. [Basic conversation](https://linear.app/tharaka/issue/KLP-14): accept a prompt and stream a model response.
2. [Read-only tools](https://linear.app/tharaka/issue/KLP-15): list files, read files, and search a repository.
3. [Agent loop](https://linear.app/tharaka/issue/KLP-16): make multiple tool calls to answer codebase questions.
4. [Editing](https://linear.app/tharaka/issue/KLP-17): apply patches and show diffs.
5. [Command execution](https://linear.app/tharaka/issue/KLP-18): run tests with permissions, timeouts, and cancellation.
6. [Persistence and evaluation](https://linear.app/tharaka/issue/KLP-19): resume sessions and evaluate small coding tasks.

## Credentials

When model integration is added, credentials will come from environment variables.
Never commit API keys; local `.env` files are ignored. No credentials are required
for the current scaffold.
