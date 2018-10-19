# Contributing to lolex

## Contributing to the code base

### Running tests

Lolex has a comprehensive test suite. If you're thinking of contributing bug
fixes or suggesting new features, you need to make sure you have not broken any
tests. You are also expected to add tests for any new behavior.

#### On node:

```sh
npm test
```

Or, if you prefer more verbose output:

```
$(npm bin)/mocha ./test/lolex-test.js
```

#### In the browser

[Mochify](https://github.com/mantoni/mochify.js) is used to run the tests in
PhantomJS. Make sure you have `phantomjs` installed. Then:

```sh
npm test-headless
```
