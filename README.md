# Overseer Studio SDK

Build your own extensions for Overseer Studio using your favorite web framework
and technologies.

## About this SDK

This SDK is a very simple wrapper for some common events that Overseer Studio
provides to your extension. You are free to implement this SDK into any web
framework or technology that you prefer. Use React, Vue, Angular, jQuery, or
even just plain ol' JavaScript.

## Installation

Before we get started, you'll need to install Node and Yarn or npm, and create a directory for your project. Then, install the Overseer Studio SDK using npm:

```shell
npm install @overseer-studio/sdk
```

## Usage

Listen for events from Overseer Studio using the SDK:

```typescript
import { onReady, onConfigChanged, sendEvent, subscribe, unsubscribe } from '@overseer-studio/sdk';

// Listen for events from Overseer Studio
const destroy = onReady(({ detail: { config, extensionId, language } }) => {
  // Your extension is now ready to send and receive events
  sendEvent('EVENT_NAME', { data: 'value' });

  // Subscribe to events from other extensions
  const subscriptionCallback = (payload) => {
    console.log('Received event with data', payload);
  }
  subscribe('ANOTHER_EVENT_NAME', subscriptionCallback);

  // Unsubscribe from events when your extension no longer needs them
  unsubscribe('ANOTHER_EVENT_NAME', subscriptionCallback);
})

// Later, if needed, destroy the Overseer event listeners
destroy();
```

### Toast messages

Trigger toast messages within Overseer:

```typescript
import { toast } from '@overseer-studio/sdk';
toast.success('Hooray!', 'This is something to celebrate!')
toast.error('Oops', 'Something went wrong.')
toast.notify('Did a thing', 'Thought you should know.')
toast.warning('Warning', 'Maybe you should check it out.')
toast.info('Here you go', 'I am presenting you with the thing you wanted.')
```

### TypeScript

This library provides full TypeScript definitions. To leverage TypeScript in
your extension, import necessary types from the SDK and use them in your code:

```typescript
type MyExtensionConfig = {
  url: string;
  roomId: string;
  funkyTown: true;
}

const destroy = onReady<MyExtensionConfig>(({ detail: { config } }) => {
  console.log(
    'Extension ready with config',
    config.url, // Type supported
    config.roomId, // Type supported
    config.funkyTown, // Type supported
  )
})
```

# License

ISC

# Copyright

2025-2026 © Infinite Turtles, LLC.
