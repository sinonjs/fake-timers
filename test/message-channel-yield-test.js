"use strict";

const { assert, FakeTimers } = require("./helpers/setup-tests");

describe("async ticking without setImmediate", function () {
    let clock;

    afterEach(function () {
        if (clock) {
            clock.uninstall();
            clock = undefined;
        }
    });

    it("yields through a MessageChannel instead of setTimeout", async function () {
        let postedMessages = 0;
        let nativeTimeouts = 0;
        const target = {
            Date,
            Promise,
            setTimeout: function setTimeoutWrapper(callback, delay) {
                nativeTimeouts++;
                return setTimeout(callback, delay);
            },
            clearTimeout: function clearTimeoutWrapper(id) {
                clearTimeout(id);
            },
            setInterval: function setIntervalWrapper(callback, delay) {
                return setInterval(callback, delay);
            },
            clearInterval: function clearIntervalWrapper(id) {
                clearInterval(id);
            },
            MessageChannel: function FakeMessageChannel() {
                const port1 = { onmessage: null, close() {} };
                this.port1 = port1;
                this.port2 = {
                    postMessage() {
                        postedMessages++;
                        setTimeout(() => {
                            port1.onmessage();
                        }, 0);
                    },
                };
            },
        };
        clock = FakeTimers.withGlobal(target).install();
        // withGlobal calls setTimeout once to detect what timers return.
        nativeTimeouts = 0;
        let fired = 0;
        target.setTimeout(() => {
            fired++;
        }, 5);
        target.setTimeout(() => {
            fired++;
        }, 10);

        await clock.tickAsync(10);

        assert.equals(fired, 2);
        assert.isTrue(postedMessages > 0);
        assert.equals(nativeTimeouts, 0);
    });
});
