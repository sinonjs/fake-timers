"use strict";

const { FakeTimers, assert } = require("./helpers/setup-tests");

describe("issue sinon#1852", function () {
    it("throws when creating a clock and global has no Date", function () {
        const clock = FakeTimers.withGlobal({
            setTimeout: function () {},
            clearTimeout: function () {},
        });
        assert.exception(function () {
            clock.createClock();
        });
        assert.exception(function () {
            clock.install();
        });
    });
});
