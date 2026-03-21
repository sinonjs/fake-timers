"use strict";

const { FakeTimers } = require("./helpers/setup-tests");

describe("issue #516 - not resilient to changes on Intl", function () {
    it("should successfully install the timer", function () {
        const originalIntlProperties = Object.getOwnPropertyDescriptors(
            globalThis.Intl,
        );
        for (const key of Object.keys(originalIntlProperties)) {
            delete globalThis.Intl[key];
        }
        try {
            const clock = FakeTimers.createClock();
            clock.tick(16);
        } finally {
            Object.defineProperties(globalThis.Intl, originalIntlProperties);
        }
    });
});
