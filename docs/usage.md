---
layout: default
title: lolex Usage
---

# Usage

## Introduction

> **lolex** can be used in both _Node.js_ and _Browser_ environments.

It is great to simulate passing time in automated tests and other
situations where you want the scheduling semantics, but don't want to actually
wait.

<div class="note"></div>
From version 2.0, however **lolex** supports those of you who would like to wait too.

### Browser
**lolex** provides a [`performance`](#performancenow) implementation that gets its time from the clock.

### Node.js
**lolex** provides a [`nextTick`](#nexttick) implementation that is synchronized with the clock - and a [`process.hrtime`](#hrtimeprevtime) shim that works with the clock.

## Getting Started

### Browser

You can use [the pre-built version](https://github.com/sinonjs/lolex/blob/master/lolex.js)
available in the repo and the [npm package](https://www.npmjs.com/package/lolex).

You only need to reference **lolex** in your `<script>` tags.

```html
<script type="text/javascript" src="https://unpkg.com/lolex@1.4.0/src/lolex.js">
...
</script>
```

### Node.js

```js
var lolex = require('lolex');
```

> You are always free to [build it yourself](https://github.com/sinonjs/lolex/blob/master/package.json#L22), of course.

## First Steps

To use **lolex**, create a new clock, schedule events on it using the timer
functions and pass time using the [`tick`](#tick) method.

```js
var clock = lolex.createClock();

clock.setTimeout(function () {
    console.log("The poblano is a mild chili pepper originating in the state of Puebla, Mexico.");
}, 15);

// ...

clock.tick(15);
```

Upon executing the last line, an interesting fact about the
[Poblano](http://en.wikipedia.org/wiki/Poblano) will be printed synchronously to
the screen. If you want to simulate asynchronous behavior, you have to use your
imagination when calling the various functions.

The [`next`](#next), [`runAll`](#runall), [`runToFrame`](#runtoframe), and [`runToLast`](#runtolast) methods are available to advance the clock.
See the [clock API Reference](#clock-api) for more details.

## Faking native timers

When using **lolex** to test timers, you will most likely want to replace the native
timers such that calling `setTimeout` actually schedules a callback with your
clock instance, not the browser's internals.

Calling [`install`](#installconfig) with no arguments achieves this. You can call `uninstall`
later to restore things as they were again.

```js
var clock = lolex.install();
// Equivalent to
// var clock = lolex.install(typeof global !== "undefined" ? global : window);

setTimeout(fn, 15); // Schedules with clock.setTimeout

clock.tick(15); // fn is called

clock.uninstall(); // setTimeout is restored to the native implementation
```

To hijack timers in another context pass it to the `install` method.

```js
var context = {
    setTimeout: setTimeout // By default context.setTimeout uses the global setTimeout
}
var clock = lolex.install({target: context});

context.setTimeout(fn, 15); // Schedules with clock.setTimeout

clock.uninstall(); // context.setTimeout is restored to the original implementation
```

Usually you want to install the timers onto the global object, so call [`install`](#installconfig)
without arguments.

### Automatically incrementing mocked time

Since version 2.0 **lolex** supports the possibility to attach fake timers
to any change in the real system time. This basically means you no longer need
to `tick()` the clock in a situation where you won't know **when** to call `tick()`.

Please note that this is achieved using the original `setImmediate()` API at a certain
configurable interval `config.advanceTimeDelta` (default: 20ms). Meaning time would
be incremented every 20ms, not in real time.

An example would be:

```js
var clock = lolex.install({shouldAdvanceTime: true, advanceTimeDelta: 40});

setTimeout(() => {
    console.log('this just timed out'); //executed after 40ms
}, 30);

setImmediate(() => {
    console.log('not so immediate'); //executed after 40ms
});

setTimeout(() => {
    console.log('this timed out after'); //executed after 80ms
    clock.uninstall();
}, 50);
```
