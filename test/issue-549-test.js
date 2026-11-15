"use strict";

const { FakeTimers, assert } = require("./helpers/setup-tests");

describe("issue #549 - hijacked methods retain inherited hasOwnProperty", function () {
    let clock;

    afterEach(function () {
        if (clock) {
            clock.uninstall();
            clock = undefined;
        }
    });

    // PR #549 renamed the install-time bookkeeping flag from `hadOwnProperty`
    // to `hasOwnProperty`. The new name shadows the inherited Object.prototype
    // method on each fake function, so any caller that runs
    // `setTimeout.hasOwnProperty(name)` on the installed global crashes with
    // `TypeError: ... is not a function`.
    it("does not shadow Object.prototype.hasOwnProperty on hijacked globals", function () {
        clock = FakeTimers.install();

        assert.isFunction(globalThis.setTimeout.hasOwnProperty);
        assert.isFunction(globalThis.setInterval.hasOwnProperty);
        assert.isFunction(globalThis.clearTimeout.hasOwnProperty);
        assert.isFunction(globalThis.clearInterval.hasOwnProperty);
        assert.isFunction(globalThis.Date.hasOwnProperty);

        assert.isTrue(globalThis.setTimeout.hasOwnProperty("name"));
        assert.isFalse(globalThis.setTimeout.hasOwnProperty("definitelyNot"));
    });
});
