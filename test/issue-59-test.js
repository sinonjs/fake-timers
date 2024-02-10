"use strict";

const { sinon, FakeTimers, assert, NOOP } = require("./helpers/setup-tests");

describe("issue #59", function () {
    it("should install and uninstall the clock on a custom target", function () {
        const setTimeoutFake = sinon.fake();
        const context = {
            Date: Date,
            setTimeout: setTimeoutFake,
            clearTimeout: sinon.fake(),
        };
        const clock = FakeTimers.withGlobal(context).install({
            ignoreMissingTimers: true,
        });
        assert.equals(setTimeoutFake.callCount, 1);
        clock.setTimeout(NOOP, 0);
        assert.equals(setTimeoutFake.callCount, 1);
        // this would throw an error before issue #59 was fixed
        clock.uninstall();
    });
});
