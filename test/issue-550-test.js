"use strict";

const { refute } = require("@sinonjs/referee-sinon");
const fakeTimers = require("../src/fake-timers-src");

describe("issue #550 - clearTimeout before the first setTimeout", function () {
    let clock;

    afterEach(function () {
        if (clock) {
            clock.uninstall();
            clock = undefined;
        }
    });

    it("does not crash when a timer is scheduled after clearing a native id", function () {
        /* eslint-disable no-console */
        clock = fakeTimers.install();
        const originalWarn = console.warn;
        console.warn = function () {};

        try {
            refute.exception(function () {
                clearTimeout(123);
                setTimeout(function () {}, 100);
            });
        } finally {
            console.warn = originalWarn;
        }
    });
});
