"use strict";

const { FakeTimers, assert } = require("./helpers/setup-tests");

describe("issue #522 - tasks not adjusted on setTimeout(fn,0)", function () {
    let clock;

    after(function () {
        clock.uninstall();
    });

    it("should print the setTimeout as the second thing", function () {
        clock = FakeTimers.install();
        let intervalCount = 0;
        const intervalId = setInterval(() => {
            console.log("intervaaal");
            if (++intervalCount > 4) {
                clearInterval(intervalId);
            }
        }, 0);
        setTimeout(() => console.log("timeout"), 0);

        clock.tick(0);
    });
});
