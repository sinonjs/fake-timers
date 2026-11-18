"use strict";

const { assert, FakeTimers, refute, sinon } = require("./helpers/setup-tests");

const NativeAbortSignal = globalThis.AbortSignal;
const nativeTimeout = NativeAbortSignal.timeout;
const isNode = Boolean(globalThis.process?.versions?.node);

describe("issue #521: AbortSignal.timeout", function () {
    let clock;

    function createGlobal() {
        return {
            Date,
            AbortSignal: NativeAbortSignal,
            AbortController,
            DOMException,
            setTimeout(...args) {
                return globalThis.setTimeout(...args);
            },
            clearTimeout(...args) {
                return globalThis.clearTimeout(...args);
            },
            setInterval(...args) {
                return globalThis.setInterval(...args);
            },
            clearInterval(...args) {
                return globalThis.clearInterval(...args);
            },
        };
    }

    afterEach(function () {
        clock?.uninstall();
        clock = undefined;
        assert.same(NativeAbortSignal.timeout, nativeTimeout);
    });

    it("returns a native signal that aborts at the fake deadline", function () {
        clock = FakeTimers.createClock();
        const signal = clock.AbortSignal.timeout(20);
        const listener = sinon.spy();
        signal.addEventListener("abort", listener);
        signal.onabort = sinon.spy();

        assert(signal instanceof NativeAbortSignal);
        assert(signal instanceof clock.AbortSignal);
        assert.equals(clock.countTimers(), 1);
        clock.tick(19);
        refute(signal.aborted);
        refute.called(listener);
        clock.tick(1);

        assert(signal.aborted);
        assert.calledOnce(listener);
        assert.calledOnce(signal.onabort);
        assert.same(listener.firstCall.args[0].target, signal);
        assert(signal.reason instanceof DOMException);
        assert.equals(signal.reason.name, "TimeoutError");
        assert.exception(() => signal.throwIfAborted(), signal.reason);
        assert.equals(clock.countTimers(), 0);
        clock.runAll();
        assert.calledOnce(listener);
    });

    it("queues a zero-delay abort instead of aborting synchronously", function () {
        clock = FakeTimers.createClock();
        const signal = clock.AbortSignal.timeout(0);
        refute(signal.aborted);
        clock.tick(0);
        assert(signal.aborted);
    });

    it("preserves the native prototype and other static factories", function () {
        clock = FakeTimers.createClock();
        assert.same(clock.AbortSignal.prototype, NativeAbortSignal.prototype);
        const reason = new Error("cancelled");
        const signal = clock.AbortSignal.abort(reason);
        assert.same(signal.reason, reason);
        assert(signal instanceof clock.AbortSignal);
        assert.same(clock.AbortSignal.any([signal]).reason, reason);
        assert.exception(() => new clock.AbortSignal(), { name: "TypeError" });
        assert.exception(
            () => Reflect.apply(clock.AbortSignal, undefined, []),
            {
                name: "TypeError",
            },
        );
    });

    it("composes a timeout with native AbortSignal.any", function () {
        clock = FakeTimers.createClock();
        const timeout = clock.AbortSignal.timeout(10);
        const controller = new AbortController();
        const signal = clock.AbortSignal.any([controller.signal, timeout]);
        clock.runAll();
        assert(signal.aborted);
        assert.same(signal.reason, timeout.reason);
    });

    it("installs by default and restores the original constructor", function () {
        const target = createGlobal();
        clock = FakeTimers.withGlobal(target).install();
        refute.same(target.AbortSignal, NativeAbortSignal);
        const signal = target.AbortSignal.timeout(10);
        clock.tick(10);
        assert(signal.aborted);
        clock.uninstall();
        assert.same(target.AbortSignal, NativeAbortSignal);
    });

    it("can fake AbortSignal without replacing setTimeout", function () {
        const target = createGlobal();
        const originalSetTimeout = target.setTimeout;
        clock = FakeTimers.withGlobal(target).install({
            toFake: ["AbortSignal"],
        });
        const signal = target.AbortSignal.timeout(10);
        assert.same(target.setTimeout, originalSetTimeout);
        clock.tick(10);
        assert(signal.aborted);
    });

    it("can leave AbortSignal native with toNotFake", function () {
        const target = createGlobal();
        clock = FakeTimers.withGlobal(target).install({
            toNotFake: ["AbortSignal"],
        });
        assert.same(target.AbortSignal, NativeAbortSignal);
    });

    it("restores an inherited constructor without leaving an own property", function () {
        const target = Object.assign(
            Object.create({ AbortSignal: NativeAbortSignal }),
            createGlobal(),
        );
        delete target.AbortSignal;
        clock = FakeTimers.withGlobal(target).install({
            toFake: ["AbortSignal"],
        });
        assert(Object.hasOwn(target, "AbortSignal"));
        clock.uninstall();
        refute(Object.hasOwn(target, "AbortSignal"));
        assert.same(target.AbortSignal, NativeAbortSignal);
    });

    it("keeps independent clocks isolated without changing the native timeout", function () {
        clock = FakeTimers.withGlobal(createGlobal()).createClock();
        const other = FakeTimers.withGlobal(createGlobal()).createClock();
        const first = clock.AbortSignal.timeout(10);
        const second = other.AbortSignal.timeout(10);
        clock.tick(10);
        assert(first.aborted);
        refute(second.aborted);
        other.tick(10);
        assert(second.aborted);
    });

    it("keeps native delay conversion when another clock is installed", function () {
        clock = FakeTimers.install({ toFake: ["AbortSignal"] });
        const other = FakeTimers.withGlobal(createGlobal()).createClock();
        if (isNode) {
            assert.exception(() => other.AbortSignal.timeout("1"), {
                name: "TypeError",
            });
        } else {
            const signal = other.AbortSignal.timeout("1");
            other.tick(1);
            assert(signal.aborted);
        }
    });

    it("does not introduce AbortSignal where it is absent", function () {
        const ft = FakeTimers.withGlobal({ Date });
        assert.isUndefined(ft.createClock().AbortSignal);
        assert.exception(() => ft.install({ toFake: ["AbortSignal"] }), {
            name: "ReferenceError",
        });
        clock = ft.install({
            toFake: ["AbortSignal"],
            ignoreMissingTimers: true,
        });
        assert.isUndefined(clock.AbortSignal);
    });

    it("reset removes pending signal timeouts", function () {
        clock = FakeTimers.createClock();
        const signal = clock.AbortSignal.timeout(10);
        clock.reset();
        clock.tick(10);
        refute(signal.aborted);
        assert.equals(clock.countTimers(), 0);
    });

    it("keeps the delay stable when the system time changes", function () {
        clock = FakeTimers.createClock();
        const signal = clock.AbortSignal.timeout(10);
        clock.setSystemTime(1000);
        clock.tick(9);
        refute(signal.aborted);
        clock.tick(1);
        assert(signal.aborted);
    });

    it("cancels a Node promise timer with a native-compatible signal", async function () {
        if (!isNode) {
            this.skip();
        }
        const timersPromises = require("timers/promises");
        clock = FakeTimers.install({ toFake: ["AbortSignal"] });
        const signal = AbortSignal.timeout(10);
        const result = timersPromises
            .setTimeout(100, "late", { signal })
            .catch((error) => error);
        await clock.tickAsync(10);

        const error = await result;
        assert.equals(error.name, "AbortError");
        assert.same(error.cause, signal.reason);
        assert.equals(clock.countTimers(), 0);
    });

    it("rejects invalid delays without scheduling a timer", function () {
        clock = FakeTimers.createClock();
        const timeout = clock.AbortSignal.timeout;
        for (const value of [
            undefined,
            NaN,
            Infinity,
            -Infinity,
            -1,
            2 ** 64,
            Symbol("delay"),
            1n,
        ]) {
            assert.exception(() => timeout(value));
            assert.equals(clock.countTimers(), 0);
        }
    });

    it("preserves the native delay conversion rules", function () {
        clock = FakeTimers.createClock();
        const timeout = clock.AbortSignal.timeout;
        if (isNode) {
            for (const value of ["10", null, false, {}, 1.5, 2 ** 32]) {
                assert.exception(() => timeout(value));
                assert.equals(clock.countTimers(), 0);
            }
        } else {
            for (const value of ["1.5", 1.5, null, false, -0.5]) {
                const signal = timeout(value);
                refute(signal.aborted);
                clock.tick(Math.trunc(Number(value)));
                assert(signal.aborted);
            }
        }
    });

    it("keeps browser delays above the setTimeout limit", function () {
        if (isNode) {
            this.skip();
        }
        clock = FakeTimers.createClock();
        const delay = 2 ** 32;
        const signal = clock.AbortSignal.timeout(delay);
        clock.tick(delay - 1);
        refute(signal.aborted);
        clock.tick(1);
        assert(signal.aborted);
    });
});
