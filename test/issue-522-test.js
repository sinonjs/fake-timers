"use strict";

const { FakeTimers, assert } = require("./helpers/setup-tests");

describe("issue #522 - setInterval(0) should not starve same-time setTimeout(0)", function () {
    let clock;

    afterEach(function () {
        clock.uninstall();
    });

    it("runs the timeout before the interval repeats", function () {
        clock = FakeTimers.install();

        const events = [];
        let intervalCount = 0;
        const intervalId = setInterval(function () {
            events.push("interval");

            if (++intervalCount > 4) {
                clearInterval(intervalId);
            }
        }, 0);

        setTimeout(function () {
            events.push("timeout");
        }, 0);

        clock.tick(0);

        assert.equals(events, [
            "interval",
            "timeout",
            "interval",
            "interval",
            "interval",
            "interval",
        ]);
    });
});
