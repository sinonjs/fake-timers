# Rolling Lolex releases

You'll need a working installation of [git-extras](https://github.com/tj/git-extras) for this.

## Create a new version

```
$ npm version x.y.z # or npm version [patch|minor|major]
```

Runs the tests, builds a changelog and the authors file, updates package.json, creates a new tag and pushes the tag and its commits to the sinon repo.

## Publish to NPM

```
$ npm publish
```

## Create a GitHub release

Create a GitHub release where you highlight
interesting additions from the changelog.
Just add a release notes to [the existing tag](https://github.com/sinonjs/lolex/tags).

