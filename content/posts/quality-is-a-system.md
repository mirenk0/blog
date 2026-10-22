---
title: "Quality Is a System"
date: 2019-07-20
tags:
  - writing
  - technology
  - programming
---

Code quality isn't a virtue that good developers carry around in their heads. It's a system. A codebase stays healthy over years only when three things hold it up: systems like testing infrastructure, static analysis, and build tooling; processes like code review, design documents, and blueprints; and patterns like a clear architecture, sane state management, and the right abstractions. Talent without these decays. Average developers with them ship reliable software.

Testing is the most concrete of the three, and the easiest to get wrong.

## A spectrum, not a pyramid

Tests sit on a spectrum. At one end are unit tests: small, fast, isolated checks of a single function. At the other are end-to-end tests that drive a real browser through the app the way a user would. They're slow and occasionally flaky, but they're the closest thing to proof that the product works. In between sit integration tests, which check that pieces work together, and component tests, which render a single piece of UI and poke at it.

Each step toward the real world buys confidence and costs speed. The craft is choosing the cheapest test that would catch the bug you're worried about.

## Units

A unit test is a list of assertions: things you'd like to be true, each of which should throw loudly if it isn't. A file full of them is a test suite, and the convention is to put it right next to the code it covers, so `cart.ts` gets `cart.test.ts`.

```ts
import { describe, it, expect } from 'vitest';
import { add } from './math';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(2, 2)).toBe(4);
  });
});
```

How you watch them run matters more than it sounds. `npx vitest --run --reporter=verbose` lists every test by name, `--reporter=dot` stays quiet until something breaks, and `npx vitest --ui` gives you a browser dashboard. A suite nobody reads might as well not exist.

## Let the machine run them

Tests only protect you if they run on every change, not just when someone remembers. That's what continuous integration is for, and a GitHub Actions workflow takes a dozen lines:

```yml
name: Unit Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
```

Workflows live in `.github/workflows`. An event, here a push or pull request against `main`, kicks off one or more jobs, which run in parallel. Each job is a list of steps that run in order, and every step either `uses` a packaged action or `run`s a command. The checkout step is the one everyone forgets: without it the container is empty and there's nothing to test.

Use `npm ci`, not `npm install`. It insists on an existing `package-lock.json`, errors out instead of quietly updating it, deletes `node_modules` and installs everything from scratch, and never writes to `package.json`. That's exactly what you want from a build server: the same dependencies every time, or a loud failure.

Then make it fast, because a slow pipeline gets ignored. Cache the npm store, keyed on the lockfile, so dependencies only download when they actually change:

```yml
- uses: actions/cache@v3
  id: npm-cache
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
```

## Components and the fake browser

UI code expects a browser, and tests run in Node. The fix is to fake the browser. jsdom emulates the DOM and the other APIs a browser provides, happy-dom does the same and claims to be faster, and edge-runtime simulates serverless edge environments. A single comment at the top of a file picks one:

```js
// @vitest-environment jsdom
```

Component tests earn their keep during migrations. When you move from one framework or library to the next, they're what tells you the app still does what it did before. Coverage reports tell you which code ran during the suite and which never did. They don't prove correctness, but they show you where you're flying blind.

## Fail only on what you control

A test should fail because your code is wrong, not because a third-party API had a bad afternoon or because hitting a paid service on every run is running up a bill. So swap what you don't control for something you do. A mock is a fake function that records how it was used:

```ts
const getNumber = vi.fn(() => 5000);

const number = getNumber();

expect(number).toBe(5000);
expect(getNumber).toHaveBeenCalled();
expect(getNumber).toHaveReturnedWith(5000);
```

Without an implementation, `vi.fn()` just returns `undefined`. A spy is the same idea aimed more narrowly: it watches a single method on an existing object and leaves the rest alone. Mocks also let you reach error branches that the real world rarely produces.

For network calls, go one level lower. Service workers sit between the page and the network and can intercept any request, the same mechanism that lets apps work offline. A tool like Mock Service Worker uses this to answer requests with fixtures, so the app under test can't tell it isn't talking to the real server.

## Where this leads

At the top of the spectrum, Playwright drives real browsers through real flows, and it's the most reliable way to know the whole thing works end to end.

But the deepest lesson is architectural. Translate data from an API in exactly one place, and hand the clean shape to the rest of the app. When the API changes, and it will, the fix is one file and one set of tests, not a hunt through every component that ever touched the raw response.

Good tests and good structure are the same discipline: make the right thing easy and the wrong thing loud, and change it in one place.
