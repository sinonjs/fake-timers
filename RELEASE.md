# Rolling Lolex releases

You'll need a working installation of [git-extras](https://github.com/tj/git-extras) for this.

## Update Changelog.txt

Compile interesting highlights from [`git changelog`](https://github.com/tj/git-extras/blob/master/Commands.md#git-changelog) into Changelog.md

    git changelog --no-merges

## Update AUTHORS

    git authors --list > AUTHORS

## Create a new version

Update package.json and create a new tag.

```
$ npm version x.y.z
```

## Push new commits and tags
```
git push && git push --tags
```

## Publish to NPM

```
$ npm publish
```

