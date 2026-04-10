const sinonConfig = require("@sinonjs/eslint-config");
const sinonTestConfig = sinonConfig.find((config) => config.files);

module.exports = [
    {
        ignores: [
            "eslint.config.js",
            "fake-timers.js",
            ".worktrees/**",
            "**/.worktrees/**",
        ],
    },
    ...sinonConfig,
    {
        files: ["**/*-test.js", "test/**/*.js"],
        plugins: {
            mocha: sinonTestConfig.plugins.mocha,
        },
        rules: {
            "mocha/consistent-spacing-between-blocks": "off",
            "mocha/no-exclusive-tests": "error",
            "no-empty-function": "off",
            // This is because we need to do `return this.skip()` when feature detecting in tests
            "consistent-return": "off",
        },
    },
    {
        files: ["integration-test/**/*.js"],
        rules: {
            "compat/compat": "off",
        },
    },
];
