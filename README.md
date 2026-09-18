# Klipp

A terminal coding agent built with **TypeScript and Node.js 24**.

Klipp is in early development. It currently sends one prompt to Gemini (or OpenAI) and prints
response chunks as they arrive. It does not yet read or modify repository files, run
commands or retain conversation history.

## Getting started

Install Node.js 24 (or run `nvm install` if you use nvm), then:

```sh
npm ci
npm run build
npm start -- --help
```

## Configuration

Get a Gemini API key through [Google AI Studio](https://aistudio.google.com/apikey).
Use a Free Tier project for free API access; selecting a model in Klipp does not change your billing tier.
For a new setup, copy `.env.example` to `.env` and add your key using your editor:

```sh
cp .env.example .env
```

If `.env` already exists, preserve its contents and add or update:

```dotenv
KLIPP_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
```

Check your configuration:

```sh
node --env-file=.env dist/cli.js --check-config
```

The check confirms that a nonblank key is configured without printing it or making
an API request. It does not verify key validity, model access, or quota.

| Variable         | Purpose                        |
| ---------------- | ------------------------------ |
| `KLIPP_PROVIDER` | `gemini` (default) or `openai` |
| `OPENAI_API_KEY` | Required when using OpenAI     |
| `OPENAI_MODEL`   | Defaults to `gpt-4.1-mini`     |
| `GEMINI_API_KEY` | Required when using Gemini     |
| `GEMINI_MODEL`   | Defaults to `gemini-3.8-flash` |

To compare OpenAI, set `KLIPP_PROVIDER=openai`. Each provider uses only its own
key and model settings. There is no automatic fallback between providers.

You can also export these variables in your shell. `.env` files are ignored by
Git and must be loaded explicitly with `--env-file`; existing shell variables
take precedence. Never commit your API key.

## Usage

Pass one prompt per invocation, wrapped in quotes:

```sh
node --env-file=.env dist/cli.js "Explain TypeScript's unknown type"
```

If `GEMINI_API_KEY` is already exported in your shell:

```sh
npm start -- "Explain TypeScript's unknown type"
```

Only the supplied prompt is sent to the selected provider. Each invocation starts a new request,
and text appears as it is generated. If streaming fails, partial text stays visible
and Klipp reports an error without restarting the answer. Requests time out
after 60 seconds and are not retried automatically. Your provider account's model
access, quota, and billing settings apply. OpenAI uses the Responses API with
`store: false`.

For a prompt beginning with a dash, use the option terminator:

```sh
node --env-file=.env dist/cli.js -- "--explain this flag"
```

Run `npm start -- --help` for options or `npm start -- --version` for the version.
These commands do not require credentials. Interactive follow-ups and piped input
are not supported yet.

To use the `klipp` command locally, run `npm link` after building. The package is
not currently published to npm.

## Development

Rebuild and run during development:

```sh
npm run dev -- --help
```

Run all checks:

```sh
npm run check
```

This runs TypeScript checking, formatting checks, a build, and tests. Tests use
fake credentials and mocked responses; they do not call providers or consume quota.
GitHub Actions runs checks on Linux, macOS, and Windows.

Use `npm run format` to format files. Generated output lives in `dist/` and is not
committed.
