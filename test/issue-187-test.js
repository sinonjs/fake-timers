"use strict";

const { sinon, FakeTimers, assert, NOOP } = require("./helpers/setup-tests");

describe("#187 - Support timeout.refresh in node environments", function () {
    it("calls the stub again after refreshing the timeout", function () {
        const clock = FakeTimers.install();
        const stub = sinon.stub();

        if (typeof setTimeout(NOOP, 0) === "object") {
            const t = setTimeout(stub, 1000);
            clock.tick(1000);
            t.refresh();
            clock.tick(1000);
            assert(stub.calledTwice);
        }
        clock.uninstall();
    });

    it("only calls stub once if not fired at time of refresh", function () {
        const clock = FakeTimers.install();
        const stub = sinon.stub();

        if (typeof setTimeout(NOOP, 0) === "object") {
            const t = setTimeout(stub, 1000);
            clock.tick(999);
            assert(stub.notCalled);
            t.refresh();
            clock.tick(999);
            assert(stub.notCalled);
            clock.tick(1);
            assert(stub.calledOnce);
        }
        clock.uninstall();
    });

    it("preserves execution order of other pending timers when refreshing", function () {
        const clock = FakeTimers.install({ now: 0 });

        if (typeof setTimeout(NOOP, 0) === "object") {
            const fired = [];
            const add = (name, delay) =>
                setTimeout(() => fired.push(`${name}@${Date.now()}`), delay);

            const a = add("a", 100);
            add("b", 110);
            add("c", 120);
            add("d", 130);

            clock.tick(50);
            a.refresh();

            clock.runAll();
            assert.equals(fired, ["b@110", "c@120", "d@130", "a@150"]);
        }
        clock.uninstall();
    });
});
