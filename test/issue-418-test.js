"use strict";

const { assert, FakeTimers, refute, sinon } = require("./helpers/setup-tests");

describe("issue #418", function () {
    let clock;

    function createGlobal() {
        return {
            Date: Date,
            Promise: Promise,
            setTimeout: function setTimeoutWrapper(callback, delay) {
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
            scheduler: {
                postTask: function postTask() {
                    return Promise.resolve();
                },
            },
        };
    }

    afterEach(function () {
        if (clock) {
            clock.uninstall();
            clock = undefined;
        }
    });

    it("installs and uninstalls scheduler identity", function () {
        const target = createGlobal();
        const originalScheduler = target.scheduler;

        clock = FakeTimers.withGlobal(target).install();

        refute.same(target.scheduler, originalScheduler);
        assert.isFunction(target.scheduler.postTask);

        clock.uninstall();
        clock = undefined;

        assert.same(target.scheduler, originalScheduler);
    });

    it("installs and uninstalls a getter-only scheduler descriptor", function () {
        const target = createGlobal();
        const nativeScheduler = target.scheduler;
        delete target.scheduler;

        Object.defineProperty(target, "scheduler", {
            configurable: true,
            enumerable: true,
            get: function getScheduler() {
                return nativeScheduler;
            },
        });
        const originalDescriptor = Object.getOwnPropertyDescriptor(
            target,
            "scheduler",
        );

        clock = FakeTimers.withGlobal(target).install();

        refute.same(target.scheduler, nativeScheduler);
        assert.isFunction(target.scheduler.postTask);
        assert.isFalse(
            Object.prototype.hasOwnProperty.call(nativeScheduler, "clock"),
        );

        clock.uninstall();
        clock = undefined;

        assert.equals(
            Object.getOwnPropertyDescriptor(target, "scheduler"),
            originalDescriptor,
        );
        assert.same(target.scheduler, nativeScheduler);
        assert.isFalse(
            Object.prototype.hasOwnProperty.call(nativeScheduler, "clock"),
        );
    });

    it("throws synchronously for non-callable postTask callbacks", function () {
        const target = createGlobal();
        clock = FakeTimers.withGlobal(target).install();

        assert.exception(
            function () {
                target.scheduler.postTask("not a function");
            },
            {
                name: "TypeError",
                message: "callback must be a function",
            },
        );
    });

    it("treats null postTask options as an empty dictionary", async function () {
        const target = createGlobal();
        clock = FakeTimers.withGlobal(target).install();

        const promise = target.scheduler.postTask(function () {
            return "result";
        }, null);

        clock.tick(0);

        assert.equals(await promise, "result");
    });

    it("runs postTask after its delay on the fake clock", async function () {
        const target = createGlobal();
        const callback = sinon.stub().returns("result");
        clock = FakeTimers.withGlobal(target).install();

        const promise = target.scheduler.postTask(callback, { delay: 30 });

        clock.tick(29);
        await Promise.resolve();

        refute.called(callback);

        clock.tick(1);

        assert.calledOnce(callback);
        assert.equals(await promise, "result");
    });

    it("adopts thenables returned from postTask callbacks", async function () {
        const target = createGlobal();
        clock = FakeTimers.withGlobal(target).install();

        const promise = target.scheduler.postTask(function () {
            return {
                then: function then(resolve) {
                    resolve("adopted");
                },
            };
        });

        clock.tick(0);

        assert.equals(await promise, "adopted");
    });

    it("rejects and clears delayed postTasks when aborted", async function () {
        const target = createGlobal();
        const callback = sinon.spy();
        const abortController = new AbortController();
        const reason = new Error("aborted");
        clock = FakeTimers.withGlobal(target).install();

        const promise = target.scheduler.postTask(callback, {
            delay: 50,
            signal: abortController.signal,
        });

        abortController.abort(reason);

        await promise.catch(function (error) {
            assert.same(error, reason);
        });

        clock.tick(50);

        refute.called(callback);
        assert.equals(clock.abortListenerMap.size, 0);
    });

    it("removes postTask abort listeners when uninstalling", function () {
        const target = createGlobal();
        const abortController = new AbortController();
        abortController.signal.removeEventListener = sinon.stub();
        clock = FakeTimers.withGlobal(target).install();

        target.scheduler.postTask(function () {}, {
            delay: 50,
            signal: abortController.signal,
        });

        clock.uninstall();
        clock = undefined;

        assert.calledOnce(abortController.signal.removeEventListener);
    });
});
