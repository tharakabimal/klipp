# Klipp

A terminal coding agent built with **TypeScript and Node.js 24 LTS**.

## Status

The foundation provides a runnable CLI with single-prompt input, help and version output, strict type
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

## Providing a prompt

Pass one prompt per invocation, wrapped in quotes:

```sh
npm run dev -- "Explain what this repository does"
# After building:
npm start -- "Explain what this repository does"
# If locally linked:
klipp "Explain what this repository does"
```

Klipp currently acknowledges the prompt locally without requiring an API key or
calling Gemini. Empty or whitespace-only prompts are rejected; multiple arguments
produce guidance to wrap the prompt in quotes. Valid prompt text is preserved.
Running without arguments shows help. Help, version, and configuration checks
take precedence over prompt input.

For a prompt beginning with a dash, use the `--` option terminator:

```sh
node dist/cli.js -- "--explain this flag"
```

Interactive follow-up messages and piped input are not implemented yet.

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
src/prompt.ts             Prompt validation
test/cli.test.js          Compiled CLI smoke tests
.github/workflows/ci.yml  Cross-platform checks
```

As functionality grows, keep terminal rendering, the agent loop, model adapters,
and tool execution separate. Introduce those modules when they have real behavior
to implement. Gemini is the initial model provider.

## Build order

Tracked under [KLP-13: Build Klipp's first terminal coding agent](https://linear.app/tharaka/issue/KLP-13).

1. [Basic conversation](https://linear.app/tharaka/issue/KLP-14): accept a prompt and stream a model response.
2. [Read-only tools](https://linear.app/tharaka/issue/KLP-15): list files, read files, and search a repository.
3. [Agent loop](https://linear.app/tharaka/issue/KLP-16): make multiple tool calls to answer codebase questions.
4. [Editing](https://linear.app/tharaka/issue/KLP-17): apply patches and show diffs.
5. [Command execution](https://linear.app/tharaka/issue/KLP-18): run tests with permissions, timeouts, and cancellation.
6. [Persistence and evaluation](https://linear.app/tharaka/issue/KLP-19): resume sessions and evaluate small coding tasks.

## Credentials

Klipp reads `GEMINI_API_KEY` from the process environment. Get a key through
[Google AI Studio](https://aistudio.google.com/apikey).

For local development, copy `.env.example` to `.env` and enter your key in that
file using your editor. Then run:

```sh
npm run build
node --env-file=.env dist/cli.js --check-config
```

Alternatively, if `GEMINI_API_KEY` is already exported in your shell, run:

```sh
npm start -- --check-config
```

The check confirms that a nonblank value is configured. It never prints the key
or sends an API request, so it cannot verify credentials or free-tier eligibility.
Help and version work without credentials.

`.env` files are ignored by Git and must be loaded explicitly; Klipp does not
automatically read environment files from repositories. Node's `--env-file` flag
resolves the file relative to your working directory, and existing environment
variables take precedence. Klipp currently uses only `GEMINI_API_KEY`.
Never commit your real key or paste it into chat.
