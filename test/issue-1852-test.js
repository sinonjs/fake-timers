"use strict";

const { FakeTimers, assert } = require("./helpers/setup-tests");

describe("issue sinon#1852", function () {
    it("throws when creating a clock and global has no Date", function () {
        assert.exception(() => {
            FakeTimers.withGlobal({
                setTimeout() {},
                clearTimeout() {},
            });
        });
    });
});
