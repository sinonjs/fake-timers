# Contributing to lolex

## Contributing to the code base

### Running tests

Lolex has a comprehensive test suite.
When contributing bug fixes it is important to make sure no tests were broken.
New features also require tests to be added so we can make sure they do not break between versions.

#### On Node.js:

```sh
npm test
```

Or, if you prefer more verbose output:

```
npx mocha ./test/lolex-test.js
```

#### In the browser

[Mochify](https://github.com/mantoni/mochify.js) is used to run the tests in Headless Chrome.

```sh
npm test-headless
```
