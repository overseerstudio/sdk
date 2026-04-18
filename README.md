# Overseer Studio SDK

Build, publish, and develop plugins for Overseer Studio.

## What's in this package

- **CLI** (`overseer`) — scaffold, build, and publish plugins to the marketplace
- **Library** — runtime API for extensions (events, toasts, shortcuts)

## Prerequisites

Node.js and npm.

## Setup

Install the SDK as a dev dependency in your plugin project:

```shell
npm install --save @overseer-studio/sdk
```

Add the `overseer` CLI to your `package.json` scripts:

```json
{
  "scripts": {
    "overseer": "overseer"
  }
}
```

Run CLI commands through npm:

```shell
npm run overseer -- login
npm run overseer -- init
npm run overseer -- build
npm run overseer -- publish
```

## Quick start

```shell
npm run overseer -- login
npm run overseer -- scope claim @your-name
npm run overseer -- init
# ... build your extension files ...
npm run overseer -- publish
```

See the [full developer documentation](https://overseer.studio/docs/developers/) for a step-by-step tutorial and command reference.

## Library

If you're building a bundled extension with a JavaScript build step, import the SDK directly:

```typescript
import { onReady, sendEvent, subscribe, unsubscribe } from '@overseer-studio/sdk';

const destroy = onReady(({ detail: { config, extensionId, language } }) => {
  sendEvent('my-event', { data: 'value' });

  subscribe('another-event', (payload) => {
    console.log(payload);
  });
});

// Call when your extension is torn down
destroy();
```

### Toasts

```typescript
import { toast } from '@overseer-studio/sdk';

toast.success('Done!', 'Your action was successful.');
toast.error('Oops', 'Something went wrong.');
toast.warning('Heads up', 'Check this out.');
toast.info('FYI', 'Here is some information.');
```

### Shortcuts

Define shortcuts in your extension manifest, then listen for them:

```typescript
import { onShortcut } from '@overseer-studio/sdk';

onShortcut('next-turn', () => {
  // advance to the next turn
});
```

### TypeScript

Full TypeScript definitions are included:

```typescript
type MyConfig = {
  url: string;
  label: string;
};

const destroy = onReady<MyConfig>(({ detail: { config } }) => {
  console.log(config.url);   // typed
  console.log(config.label); // typed
});
```

## License

ISC — 2025–2026 © Infinite Turtles, LLC.
