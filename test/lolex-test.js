/**
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2014 Christian Johansen
 */
/* eslint-disable no-empty-function */
"use strict";

/*
 * FIXME This is an interim hack to break a circular dependency between lolex,
 * nise and sinon.
 *
 * 1. Load lolex firt, without defining global, verifying the ReferenceError is gone.
 */
var lolex = require("../src/lolex-src");

/*
 * 2. Define global, if missing.
 */
if (typeof global === "undefined") {
    window.global = window;
}

/*
 * 3. Load sinon with global defined.
 */
var assert = require("@sinonjs/referee-sinon").assert;
var refute = require("@sinonjs/referee-sinon").refute;
var sinon = require("@sinonjs/referee-sinon").sinon;

var globalObject = typeof global !== "undefined" ? global : window;
globalObject.lolex = lolex; // For testing eval

var GlobalDate = Date;

var NOOP = function NOOP() {
    return undefined;
};
var nextTickPresent =
    global.process && typeof global.process.nextTick === "function";
var queueMicrotaskPresent = typeof global.queueMicrotask === "function";
var hrtimePresent =
    global.process && typeof global.process.hrtime === "function";
var hrtimeBigintPresent =
    hrtimePresent && typeof global.process.hrtime.bigint === "function";
var performanceNowPresent =
    global.performance && typeof global.performance.now === "function";
var performanceMarkPresent =
    global.performance && typeof global.performance.mark === "function";
var setImmediatePresent =
    global.setImmediate && typeof global.setImmediate === "function";

describe("issue #59", function() {
    var context = {
        Date: Date,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout
    };
    var clock;

    it("should install and uninstall the clock on a custom target", function() {
        clock = lolex.install(context);
        // this would throw an error before issue #59 was fixed
        clock.uninstall();
    });
});

describe("issue #73", function() {
    it("should install with date object", function() {
        var date = new Date("2015-09-25");
        var clock = lolex.install({ now: date });
        assert.same(clock.now, 1443139200000);
        clock.uninstall();
    });
});

describe("issue #67", function() {
    // see https://nodejs.org/api/timers.html
    it("should overflow to 1 on very big timeouts", function() {
        var clock = lolex.install();
        var stub1 = sinon.stub();
        var stub2 = sinon.stub();

        clock.setTimeout(stub1, 100);
        clock.setTimeout(stub2, 214748334700); //should be called after 1 tick

        clock.tick(1);
        assert(stub2.called);
        assert.isFalse(stub1.called);

        clock.tick(99);
        assert(stub1.called);
        assert(stub2.called);

        clock.uninstall();
    });

    it("should overflow to interval 1 on very big timeouts", function() {
        var clock = lolex.install();
        var stub = sinon.stub();

        clock.setInterval(stub, 214748334700);
        clock.tick(3);
        assert(stub.calledThrice);

        clock.uninstall();
    });

    it("should execute setTimeout smaller than 1", function() {
        var clock = lolex.install();
        var stub1 = sinon.stub();

        clock.setTimeout(stub1, 0.5);
        clock.tick(1);
        assert(stub1.calledOnce);

        clock.uninstall();
    });

    it("executes setTimeout with negative duration as if it has zero delay", function() {
        var clock = lolex.install();
        var stub1 = sinon.stub();

        clock.setTimeout(stub1, -10);
        clock.tick(1);
        assert(stub1.calledOnce);

        clock.uninstall();
    });
});

describe("issue sinon#1852", function() {
    it("throws when creating a clock and global has no Date", function() {
        var clock = lolex.withGlobal({
            setTimeout: function() {},
            clearTimeout: function() {}
        });
        assert.exception(function() {
            clock.createClock();
        });
        assert.exception(function() {
            clock.install();
        });
    });
});

describe("issue #207 - nanosecond round-off errors on high-res timer", function() {
    var clock;

    afterEach(function() {
        clock.uninstall();
    });

    if (hrtimePresent) {
        it("should not round off nanosecond arithmetic on hrtime - case 1", function() {
            clock = lolex.install();

            clock.tick(1022.7791);

            var nanos = clock.hrtime([0, 2 * 1e7])[1];
            assert.equals(nanos, 2779100);
        });

        it("should not round off nanosecond arithmetic on hrtime - case 2", function() {
            clock = lolex.install({
                now: new Date("2018-09-12T08:58:33.742000000Z").getTime(),
                toFake: ["hrtime"]
            });
            var start = clock.hrtime();
            clock.tick(123.493);

            var nanos = clock.hrtime(start)[1];
            assert.equals(nanos, 123493000);
        });

        it("should truncate sub-nanosecond ticks", function() {
            clock = lolex.install();
            clock.tick(0.123456789);

            var nanos = clock.hrtime()[1];
            assert.equals(nanos, 123456);
        });
    }

    it("should always set 'now' to an integer value when ticking with sub-millisecond precision", function() {
        clock = lolex.install();
        clock.tick(2.993);

        assert.equals(clock.now, 2);
    });

    it("should adjust adjust the 'now' value when the nano-remainder overflows", function() {
        clock = lolex.install();
        clock.tick(0.993);
        clock.tick(0.5);

        assert.equals(clock.now, 1);
    });

    it("should floor negative now values", function() {
        clock = lolex.install({ now: -1.2 });

        assert.equals(clock.now, -2);
    });

    it("should floor start times", function() {
        clock = lolex.install({ now: 1.2 });
        assert.equals(clock.now, 1);
    });

    it("should floor negative start times", function() {
        clock = lolex.install({ now: -1.2 });
        assert.equals(clock.now, -2);
    });

    it("should handle ticks on the negative side of the Epoch", function() {
        clock = lolex.install({ now: -2 });
        clock.tick(0.8); // -1.2
        clock.tick(0.5); // -0.7

        assert.equals(clock.now, -1);
    });

    it("should handle multiple non-integer ticks", function() {
        clock = lolex.install({ now: -2 });
        clock.tick(1.1); // -0.9
        clock.tick(0.5);
        clock.tick(0.5); // 0.1

        assert.equals(clock.now, 0);
    });
});

describe("issue #sinonjs/2086 - don't install setImmediate in unsupported environment", function() {
    var clock;

    if (typeof setImmediate === "undefined") {
        afterEach(function() {
            clock.uninstall();
        });

        it("should not install setImmediate", function() {
            clock = lolex.install();

            assert.isUndefined(global.setImmediate);
        });
    }
});

describe("lolex", function() {
    describe("setTimeout", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
            lolex.evalCalled = false;
        });

        afterEach(function() {
            delete lolex.evalCalled;
        });

        it("throws if no arguments", function() {
            var clock = this.clock;

            assert.exception(function() {
                clock.setTimeout();
            });
        });

        it("returns numeric id or object with numeric id", function() {
            var result = this.clock.setTimeout("");

            if (typeof result === "object") {
                assert.isNumber(result.id);
            } else {
                assert.isNumber(result);
            }
        });

        it("returns unique id", function() {
            var id1 = this.clock.setTimeout("");
            var id2 = this.clock.setTimeout("");

            refute.equals(id2, id1);
        });

        it("sets timers on instance", function() {
            var clock1 = lolex.createClock();
            var clock2 = lolex.createClock();
            var stubs = [sinon.stub(), sinon.stub()];

            clock1.setTimeout(stubs[0], 100);
            clock2.setTimeout(stubs[1], 100);
            clock2.tick(200);

            assert.isFalse(stubs[0].called);
            assert(stubs[1].called);
        });

        it("parses numeric string times", function() {
            this.clock.setTimeout(function() {
                lolex.evalCalled = true;
            }, "10");
            this.clock.tick(10);

            assert(lolex.evalCalled);
        });

        it("parses no-numeric string times", function() {
            this.clock.setTimeout(function() {
                lolex.evalCalled = true;
            }, "string");
            this.clock.tick(10);

            assert(lolex.evalCalled);
        });

        it("evals non-function callbacks", function() {
            this.clock.setTimeout("lolex.evalCalled = true", 10);
            this.clock.tick(10);

            assert(lolex.evalCalled);
        });

        it("passes setTimeout parameters", function() {
            var clock = lolex.createClock();
            var stub = sinon.stub();

            clock.setTimeout(stub, 2, "the first", "the second");

            clock.tick(3);

            assert.isTrue(stub.calledWithExactly("the first", "the second"));
        });

        it("calls correct timeout on recursive tick", function() {
            var clock = lolex.createClock();
            var stub = sinon.stub();
            var recurseCallback = function() {
                clock.tick(100);
            };

            clock.setTimeout(recurseCallback, 50);
            clock.setTimeout(stub, 100);

            clock.tick(50);
            assert(stub.called);
        });

        it("does not depend on this", function() {
            var clock = lolex.createClock();
            var stub = sinon.stub();
            var setTimeout = clock.setTimeout;

            setTimeout(stub, 100);

            clock.tick(100);
            assert(stub.called);
        });

        it("is not influenced by forward system clock changes", function() {
            var stub = sinon.stub();
            this.clock.setTimeout(stub, 5000);
            this.clock.tick(1000);
            this.clock.setSystemTime(new this.clock.Date().getTime() + 1000);
            this.clock.tick(3990);
            assert.equals(stub.callCount, 0);
            this.clock.tick(20);
            assert.equals(stub.callCount, 1);
        });

        it("is not influenced by forward system clock changes during process.nextTick()", function() {
            var me = this;
            var stub = sinon.stub();
            this.clock.setTimeout(stub, 5000);
            this.clock.tick(1000);
            this.clock.nextTick(function() {
                me.clock.setSystemTime(me.clock.now + 1000);
            });
            this.clock.tick(3990);
            assert.equals(stub.callCount, 0);
            this.clock.tick(20);
            assert.equals(stub.callCount, 1);
        });

        it("is not influenced by backward system clock changes", function() {
            var stub = sinon.stub();
            this.clock.setTimeout(stub, 5000);
            this.clock.tick(1000);
            this.clock.setSystemTime(new this.clock.Date().getTime() - 1000);
            this.clock.tick(3990);
            assert.equals(stub.callCount, 0);
            this.clock.tick(20);
            assert.equals(stub.callCount, 1);
        });

        it("should work when called from a process.nextTick()", function() {
            var me = this;
            var callbackCalled = false;
            this.clock.nextTick(function() {
                me.clock.setTimeout(function() {
                    callbackCalled = true;
                }, 50);
            });
            this.clock.tick(60);
            assert.equals(callbackCalled, true);
        });
        it("should work when called from a process.nextTick() (across the tick())", function() {
            var me = this;
            var callbackCalled = false;
            this.clock.nextTick(function() {
                me.clock.setTimeout(function() {
                    callbackCalled = true;
                }, 100);
            });
            this.clock.tick(60);
            assert.equals(callbackCalled, false);
            this.clock.tick(41);
            assert.equals(callbackCalled, true);
        });
        it("should work when called from setTimeout(() => process.nextTick())", function() {
            var me = this;
            var callbackCalled = false;
            this.clock.setTimeout(function() {
                me.clock.nextTick(function() {
                    me.clock.setTimeout(function() {
                        callbackCalled = true;
                    }, 50);
                });
            }, 10);
            this.clock.tick(61);
            assert.equals(callbackCalled, true);
        });
        it("handles Infinity and negative Infinity correctly", function() {
            var calls = [];
            this.clock.setTimeout(function() {
                calls.push("NaN");
            }, NaN);
            this.clock.setTimeout(function() {
                calls.push("Infinity");
            }, Number.POSITIVE_INFINITY);
            this.clock.setTimeout(function() {
                calls.push("-Infinity");
            }, Number.NEGATIVE_INFINITY);
            this.clock.runAll();
            assert.equals(calls, ["NaN", "Infinity", "-Infinity"]);
        });
    });

    describe("setImmediate", function() {
        beforeEach(function() {
            if (!setImmediatePresent) {
                this.skip();
            }

            this.clock = lolex.createClock();
        });

        it("returns numeric id or object with numeric id", function() {
            var result = this.clock.setImmediate(NOOP);

            if (typeof result === "object") {
                assert.isNumber(result.id);
            } else {
                assert.isNumber(result);
            }
        });

        it("calls the given callback immediately", function() {
            var stub = sinon.stub();

            this.clock.setImmediate(stub);
            this.clock.tick(0);

            assert(stub.called);
        });

        it("throws if no arguments", function() {
            var clock = this.clock;

            assert.exception(function() {
                clock.setImmediate();
            });
        });

        it("manages separate timers per clock instance", function() {
            var clock1 = lolex.createClock();
            var clock2 = lolex.createClock();
            var stubs = [sinon.stub(), sinon.stub()];

            clock1.setImmediate(stubs[0]);
            clock2.setImmediate(stubs[1]);
            clock2.tick(0);

            assert.isFalse(stubs[0].called);
            assert(stubs[1].called);
        });

        it("passes extra parameters through to the callback", function() {
            var stub = sinon.stub();

            this.clock.setImmediate(stub, "value1", 2);
            this.clock.tick(1);

            assert(stub.calledWithExactly("value1", 2));
        });

        it("calls the given callback before setTimeout", function() {
            var stub1 = sinon.stub();
            var stub2 = sinon.stub();

            this.clock.setTimeout(stub1, 0);
            this.clock.setImmediate(stub2);
            this.clock.tick(0);

            assert(stub1.calledOnce);
            assert(stub2.calledOnce);
            assert(stub2.calledBefore(stub1));
        });

        it("does not stuck next tick even if nested", function() {
            var clock = this.clock;

            clock.setImmediate(function f() {
                clock.setImmediate(f);
            });

            clock.tick(0);
        });
    });

    describe("clearImmediate", function() {
        beforeEach(function() {
            if (!setImmediatePresent) {
                this.skip();
            }

            this.clock = lolex.createClock();
        });

        it("removes immediate callbacks", function() {
            var callback = sinon.stub();

            var id = this.clock.setImmediate(callback);
            this.clock.clearImmediate(id);
            this.clock.tick(1);

            assert.isFalse(callback.called);
        });

        it("does not remove timeout", function() {
            var callback = sinon.stub();

            var id = this.clock.setTimeout(callback, 50);
            assert.exception(
                function() {
                    this.clock.clearImmediate(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setTimeout() but cleared with clearImmediate()"
                }
            );
            this.clock.tick(55);

            assert.isTrue(callback.called);
        });

        it("does not remove interval", function() {
            var callback = sinon.stub();

            var id = this.clock.setInterval(callback, 50);
            assert.exception(
                function() {
                    this.clock.clearImmediate(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setInterval() but cleared with clearImmediate()"
                }
            );
            this.clock.tick(55);

            assert.isTrue(callback.called);
        });
    });

    describe("countTimers", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("return zero for a fresh clock", function() {
            assert.equals(this.clock.countTimers(), 0);
        });

        it("counts remaining timers", function() {
            this.clock.setTimeout(NOOP, 100);
            this.clock.setTimeout(NOOP, 200);
            this.clock.setTimeout(NOOP, 300);
            this.clock.tick(150);
            assert.equals(this.clock.countTimers(), 2);
        });

        it("counts microtasks", function() {
            this.clock.nextTick(NOOP);
            assert.equals(this.clock.countTimers(), 1);
        });
    });

    describe("tick", function() {
        beforeEach(function() {
            this.clock = lolex.install({ now: 0 });
        });

        afterEach(function() {
            this.clock.uninstall();
        });

        it("triggers immediately without specified delay", function() {
            var stub = sinon.stub();
            this.clock.setTimeout(stub);

            this.clock.tick(0);

            assert(stub.called);
        });

        it("does not trigger without sufficient delay", function() {
            var stub = sinon.stub();
            this.clock.setTimeout(stub, 100);
            this.clock.tick(10);

            assert.isFalse(stub.called);
        });

        it("triggers after sufficient delay", function() {
            var stub = sinon.stub();
            this.clock.setTimeout(stub, 100);
            this.clock.tick(100);

            assert(stub.called);
        });

        it("triggers simultaneous timers", function() {
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 100);
            this.clock.setTimeout(spies[1], 100);

            this.clock.tick(100);

            assert(spies[0].called);
            assert(spies[1].called);
        });

        it("triggers multiple simultaneous timers", function() {
            var spies = [sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 100);
            this.clock.setTimeout(spies[1], 100);
            this.clock.setTimeout(spies[2], 99);
            this.clock.setTimeout(spies[3], 100);

            this.clock.tick(100);

            assert(spies[0].called);
            assert(spies[1].called);
            assert(spies[2].called);
            assert(spies[3].called);
        });

        it("triggers multiple simultaneous timers with zero callAt", function() {
            var test = this;
            var spies = [
                sinon.spy(function() {
                    test.clock.setTimeout(spies[1], 0);
                }),
                sinon.spy(),
                sinon.spy()
            ];

            // First spy calls another setTimeout with delay=0
            this.clock.setTimeout(spies[0], 0);
            this.clock.setTimeout(spies[2], 10);

            this.clock.tick(10);

            assert(spies[0].called);
            assert(spies[1].called);
            assert(spies[2].called);
        });

        it("waits after setTimeout was called", function() {
            this.clock.tick(100);
            var stub = sinon.stub();
            this.clock.setTimeout(stub, 150);
            this.clock.tick(50);

            assert.isFalse(stub.called);
            this.clock.tick(100);
            assert(stub.called);
        });

        it("mini integration test", function() {
            var stubs = [sinon.stub(), sinon.stub(), sinon.stub()];
            this.clock.setTimeout(stubs[0], 100);
            this.clock.setTimeout(stubs[1], 120);
            this.clock.tick(10);
            this.clock.tick(89);
            assert.isFalse(stubs[0].called);
            assert.isFalse(stubs[1].called);
            this.clock.setTimeout(stubs[2], 20);
            this.clock.tick(1);
            assert(stubs[0].called);
            assert.isFalse(stubs[1].called);
            assert.isFalse(stubs[2].called);
            this.clock.tick(19);
            assert.isFalse(stubs[1].called);
            assert(stubs[2].called);
            this.clock.tick(1);
            assert(stubs[1].called);
        });

        it("triggers even when some throw", function() {
            var clock = this.clock;
            var stubs = [sinon.stub().throws(), sinon.stub()];

            clock.setTimeout(stubs[0], 100);
            clock.setTimeout(stubs[1], 120);

            assert.exception(function() {
                clock.tick(120);
            });

            assert(stubs[0].called);
            assert(stubs[1].called);
        });

        it("calls function with global object or null (strict mode) as this", function() {
            var clock = this.clock;
            var stub = sinon.stub().throws();
            clock.setTimeout(stub, 100);

            assert.exception(function() {
                clock.tick(100);
            });

            assert(stub.calledOn(global) || stub.calledOn(null));
        });

        it("triggers in the order scheduled", function() {
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 13);
            this.clock.setTimeout(spies[1], 11);

            this.clock.tick(15);

            assert(spies[1].calledBefore(spies[0]));
        });

        it("creates updated Date while ticking", function() {
            var spy = sinon.spy();

            this.clock.setInterval(function() {
                spy(new Date().getTime());
            }, 10);

            this.clock.tick(100);

            assert.equals(spy.callCount, 10);
            assert(spy.calledWith(10));
            assert(spy.calledWith(20));
            assert(spy.calledWith(30));
            assert(spy.calledWith(40));
            assert(spy.calledWith(50));
            assert(spy.calledWith(60));
            assert(spy.calledWith(70));
            assert(spy.calledWith(80));
            assert(spy.calledWith(90));
            assert(spy.calledWith(100));
        });

        it("fires timer in intervals of 13", function() {
            var spy = sinon.spy();
            this.clock.setInterval(spy, 13);

            this.clock.tick(500);

            assert.equals(spy.callCount, 38);
        });

        it("fires timer in intervals of '13'", function() {
            var spy = sinon.spy();
            this.clock.setInterval(spy, "13");

            this.clock.tick(500);

            assert.equals(spy.callCount, 38);
        });

        it("fires timers in correct order", function() {
            var spy13 = sinon.spy();
            var spy10 = sinon.spy();

            this.clock.setInterval(function() {
                spy13(new Date().getTime());
            }, 13);

            this.clock.setInterval(function() {
                spy10(new Date().getTime());
            }, 10);

            this.clock.tick(500);

            assert.equals(spy13.callCount, 38);
            assert.equals(spy10.callCount, 50);

            assert(spy13.calledWith(416));
            assert(spy10.calledWith(320));

            assert(spy10.getCall(0).calledBefore(spy13.getCall(0)));
            assert(spy10.getCall(4).calledBefore(spy13.getCall(3)));
        });

        it("triggers timeouts and intervals in the order scheduled", function() {
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setInterval(spies[0], 10);
            this.clock.setTimeout(spies[1], 50);

            this.clock.tick(100);

            assert(spies[0].calledBefore(spies[1]));
            assert.equals(spies[0].callCount, 10);
            assert.equals(spies[1].callCount, 1);
        });

        it("does not fire canceled intervals", function() {
            var id;
            var callback = sinon.spy(function() {
                if (callback.callCount === 3) {
                    clearInterval(id);
                }
            });

            id = this.clock.setInterval(callback, 10);
            this.clock.tick(100);

            assert.equals(callback.callCount, 3);
        });

        it("passes 8 seconds", function() {
            var spy = sinon.spy();
            this.clock.setInterval(spy, 4000);

            this.clock.tick("08");

            assert.equals(spy.callCount, 2);
        });

        it("passes 1 minute", function() {
            var spy = sinon.spy();
            this.clock.setInterval(spy, 6000);

            this.clock.tick("01:00");

            assert.equals(spy.callCount, 10);
        });

        it("passes 2 hours, 34 minutes and 10 seconds", function() {
            var spy = sinon.spy();
            this.clock.setInterval(spy, 10000);

            this.clock.tick("02:34:10");

            assert.equals(spy.callCount, 925);
        });

        it("throws for invalid format", function() {
            var spy = sinon.spy();
            this.clock.setInterval(spy, 10000);
            var test = this;

            assert.exception(function() {
                test.clock.tick("12:02:34:10");
            });

            assert.equals(spy.callCount, 0);
        });

        it("throws for invalid minutes", function() {
            var spy = sinon.spy();
            this.clock.setInterval(spy, 10000);
            var test = this;

            assert.exception(function() {
                test.clock.tick("67:10");
            });

            assert.equals(spy.callCount, 0);
        });

        it("throws for negative minutes", function() {
            var spy = sinon.spy();
            this.clock.setInterval(spy, 10000);
            var test = this;

            assert.exception(function() {
                test.clock.tick("-7:10");
            });

            assert.equals(spy.callCount, 0);
        });

        it("treats missing argument as 0", function() {
            this.clock.tick();

            assert.equals(this.clock.now, 0);
        });

        it("fires nested setTimeout calls properly", function() {
            var i = 0;
            var clock = this.clock;

            var callback = function() {
                ++i;
                clock.setTimeout(function() {
                    callback();
                }, 100);
            };

            callback();

            clock.tick(1000);

            assert.equals(i, 11);
        });

        it("does not silently catch errors", function() {
            var clock = this.clock;

            clock.setTimeout(function() {
                throw new Error("oh no!");
            }, 1000);

            assert.exception(function() {
                clock.tick(1000);
            });
        });

        it("returns the current now value", function() {
            var clock = this.clock;
            var value = clock.tick(200);
            assert.equals(clock.now, value);
        });

        it("is not influenced by forward system clock changes", function() {
            var clock = this.clock;
            var callback = function() {
                clock.setSystemTime(new clock.Date().getTime() + 1000);
            };
            var stub = sinon.stub();
            clock.setTimeout(callback, 1000);
            clock.setTimeout(stub, 2000);
            clock.tick(1990);
            assert.equals(stub.callCount, 0);
            clock.tick(20);
            assert.equals(stub.callCount, 1);
        });

        it("is not influenced by forward system clock changes", function() {
            var clock = this.clock;
            var callback = function() {
                clock.setSystemTime(new clock.Date().getTime() - 1000);
            };
            var stub = sinon.stub();
            clock.setTimeout(callback, 1000);
            clock.setTimeout(stub, 2000);
            clock.tick(1990);
            assert.equals(stub.callCount, 0);
            clock.tick(20);
            assert.equals(stub.callCount, 1);
        });

        it("is not influenced by forward system clock changes when an error is thrown", function() {
            var clock = this.clock;
            var callback = function() {
                clock.setSystemTime(new clock.Date().getTime() + 1000);
                throw new Error();
            };
            var stub = sinon.stub();
            clock.setTimeout(callback, 1000);
            clock.setTimeout(stub, 2000);
            assert.exception(function() {
                clock.tick(1990);
            });
            assert.equals(stub.callCount, 0);
            clock.tick(20);
            assert.equals(stub.callCount, 1);
        });

        it("is not influenced by forward system clock changes when an error is thrown", function() {
            var clock = this.clock;
            var callback = function() {
                clock.setSystemTime(new clock.Date().getTime() - 1000);
                throw new Error();
            };
            var stub = sinon.stub();
            clock.setTimeout(callback, 1000);
            clock.setTimeout(stub, 2000);
            assert.exception(function() {
                clock.tick(1990);
            });
            assert.equals(stub.callCount, 0);
            clock.tick(20);
            assert.equals(stub.callCount, 1);
        });

        it("throws on negative ticks", function() {
            var clock = this.clock;

            assert.exception(
                function() {
                    clock.tick(-500);
                },
                { message: "Negative ticks are not supported" }
            );
        });
    });

    if (typeof global.Promise !== "undefined") {
        describe("tickAsync", function() {
            beforeEach(function() {
                this.clock = lolex.install();
            });

            afterEach(function() {
                this.clock.uninstall();
            });

            it("triggers immediately without specified delay", function() {
                var stub = sinon.stub();
                this.clock.setTimeout(stub);

                return this.clock.tickAsync(0).then(function() {
                    assert(stub.called);
                });
            });

            it("does not trigger without sufficient delay", function() {
                var stub = sinon.stub();
                this.clock.setTimeout(stub, 100);

                return this.clock.tickAsync(10).then(function() {
                    assert.isFalse(stub.called);
                });
            });

            it("triggers after sufficient delay", function() {
                var stub = sinon.stub();
                this.clock.setTimeout(stub, 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(stub.called);
                });
            });

            it("triggers simultaneous timers", function() {
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 100);
                this.clock.setTimeout(spies[1], 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                });
            });

            it("triggers multiple simultaneous timers", function() {
                var spies = [
                    sinon.spy(),
                    sinon.spy(),
                    sinon.spy(),
                    sinon.spy()
                ];
                this.clock.setTimeout(spies[0], 100);
                this.clock.setTimeout(spies[1], 100);
                this.clock.setTimeout(spies[2], 99);
                this.clock.setTimeout(spies[3], 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                    assert(spies[2].called);
                    assert(spies[3].called);
                });
            });

            it("triggers multiple simultaneous timers with zero callAt", function() {
                var test = this;
                var spies = [
                    sinon.spy(function() {
                        test.clock.setTimeout(spies[1], 0);
                    }),
                    sinon.spy(),
                    sinon.spy()
                ];

                // First spy calls another setTimeout with delay=0
                this.clock.setTimeout(spies[0], 0);
                this.clock.setTimeout(spies[2], 10);

                return this.clock.tickAsync(10).then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                    assert(spies[2].called);
                });
            });

            it("triggers multiple simultaneous timers with zero callAt created in promises", function() {
                var test = this;
                var spies = [
                    sinon.spy(function() {
                        global.Promise.resolve().then(function() {
                            test.clock.setTimeout(spies[1], 0);
                        });
                    }),
                    sinon.spy(),
                    sinon.spy()
                ];

                // First spy calls another setTimeout with delay=0
                this.clock.setTimeout(spies[0], 0);
                this.clock.setTimeout(spies[2], 10);

                return this.clock.tickAsync(10).then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                    assert(spies[2].called);
                });
            });

            it("waits after setTimeout was called", function() {
                var clock = this.clock;
                var stub = sinon.stub();

                return clock
                    .tickAsync(100)
                    .then(function() {
                        clock.setTimeout(stub, 150);
                        return clock.tickAsync(50);
                    })
                    .then(function() {
                        assert.isFalse(stub.called);
                        return clock.tickAsync(100);
                    })
                    .then(function() {
                        assert(stub.called);
                    });
            });

            it("mini integration test", function() {
                var clock = this.clock;
                var stubs = [sinon.stub(), sinon.stub(), sinon.stub()];
                clock.setTimeout(stubs[0], 100);
                clock.setTimeout(stubs[1], 120);

                return clock
                    .tickAsync(10)
                    .then(function() {
                        return clock.tickAsync(89);
                    })
                    .then(function() {
                        assert.isFalse(stubs[0].called);
                        assert.isFalse(stubs[1].called);
                        clock.setTimeout(stubs[2], 20);
                        return clock.tickAsync(1);
                    })
                    .then(function() {
                        assert(stubs[0].called);
                        assert.isFalse(stubs[1].called);
                        assert.isFalse(stubs[2].called);
                        return clock.tickAsync(19);
                    })
                    .then(function() {
                        assert.isFalse(stubs[1].called);
                        assert(stubs[2].called);
                        return clock.tickAsync(1);
                    })
                    .then(function() {
                        assert(stubs[1].called);
                    });
            });

            it("triggers even when some throw", function() {
                var clock = this.clock;
                var stubs = [sinon.stub().throws(), sinon.stub()];
                var catchSpy = sinon.spy();

                clock.setTimeout(stubs[0], 100);
                clock.setTimeout(stubs[1], 120);

                return clock
                    .tickAsync(120)
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                        assert(stubs[0].called);
                        assert(stubs[1].called);
                    });
            });

            it("calls function with global object or null (strict mode) as this", function() {
                var clock = this.clock;
                var stub = sinon.stub().throws();
                var catchSpy = sinon.spy();
                clock.setTimeout(stub, 100);

                return clock
                    .tickAsync(100)
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                        assert(stub.calledOn(global) || stub.calledOn(null));
                    });
            });

            it("triggers in the order scheduled", function() {
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 13);
                this.clock.setTimeout(spies[1], 11);

                return this.clock.tickAsync(15).then(function() {
                    assert(spies[1].calledBefore(spies[0]));
                });
            });

            it("creates updated Date while ticking", function() {
                var spy = sinon.spy();

                this.clock.setInterval(function() {
                    spy(new Date().getTime());
                }, 10);

                return this.clock.tickAsync(100).then(function() {
                    assert.equals(spy.callCount, 10);
                    assert(spy.calledWith(10));
                    assert(spy.calledWith(20));
                    assert(spy.calledWith(30));
                    assert(spy.calledWith(40));
                    assert(spy.calledWith(50));
                    assert(spy.calledWith(60));
                    assert(spy.calledWith(70));
                    assert(spy.calledWith(80));
                    assert(spy.calledWith(90));
                    assert(spy.calledWith(100));
                });
            });

            it("creates updated Date while ticking promises", function() {
                var spy = sinon.spy();

                this.clock.setInterval(function() {
                    global.Promise.resolve().then(function() {
                        spy(new Date().getTime());
                    });
                }, 10);

                return this.clock.tickAsync(100).then(function() {
                    assert.equals(spy.callCount, 10);
                    assert(spy.calledWith(10));
                    assert(spy.calledWith(20));
                    assert(spy.calledWith(30));
                    assert(spy.calledWith(40));
                    assert(spy.calledWith(50));
                    assert(spy.calledWith(60));
                    assert(spy.calledWith(70));
                    assert(spy.calledWith(80));
                    assert(spy.calledWith(90));
                    assert(spy.calledWith(100));
                });
            });

            it("fires timer in intervals of 13", function() {
                var spy = sinon.spy();
                this.clock.setInterval(spy, 13);

                return this.clock.tickAsync(500).then(function() {
                    assert.equals(spy.callCount, 38);
                });
            });

            it("fires timers in correct order", function() {
                var spy13 = sinon.spy();
                var spy10 = sinon.spy();

                this.clock.setInterval(function() {
                    spy13(new Date().getTime());
                }, 13);

                this.clock.setInterval(function() {
                    spy10(new Date().getTime());
                }, 10);

                return this.clock.tickAsync(500).then(function() {
                    assert.equals(spy13.callCount, 38);
                    assert.equals(spy10.callCount, 50);

                    assert(spy13.calledWith(416));
                    assert(spy10.calledWith(320));

                    assert(spy10.getCall(0).calledBefore(spy13.getCall(0)));
                    assert(spy10.getCall(4).calledBefore(spy13.getCall(3)));
                });
            });

            it("fires promise timers in correct order", function() {
                var spy13 = sinon.spy();
                var spy10 = sinon.spy();

                this.clock.setInterval(function() {
                    global.Promise.resolve().then(function() {
                        spy13(new Date().getTime());
                    });
                }, 13);

                this.clock.setInterval(function() {
                    global.Promise.resolve().then(function() {
                        spy10(new Date().getTime());
                    });
                }, 10);

                return this.clock.tickAsync(500).then(function() {
                    assert.equals(spy13.callCount, 38);
                    assert.equals(spy10.callCount, 50);

                    assert(spy13.calledWith(416));
                    assert(spy10.calledWith(320));

                    assert(spy10.getCall(0).calledBefore(spy13.getCall(0)));
                    assert(spy10.getCall(4).calledBefore(spy13.getCall(3)));
                });
            });

            it("triggers timeouts and intervals in the order scheduled", function() {
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setInterval(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                return this.clock.tickAsync(100).then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                    assert.equals(spies[0].callCount, 10);
                    assert.equals(spies[1].callCount, 1);
                });
            });

            it("does not fire canceled intervals", function() {
                var id;
                var callback = sinon.spy(function() {
                    if (callback.callCount === 3) {
                        clearInterval(id);
                    }
                });

                id = this.clock.setInterval(callback, 10);
                return this.clock.tickAsync(100).then(function() {
                    assert.equals(callback.callCount, 3);
                });
            });

            it("does not fire intervals canceled in a promise", function() {
                var id;
                var callback = sinon.spy(function() {
                    if (callback.callCount === 3) {
                        global.Promise.resolve().then(function() {
                            clearInterval(id);
                        });
                    }
                });

                id = this.clock.setInterval(callback, 10);
                return this.clock.tickAsync(100).then(function() {
                    assert.equals(callback.callCount, 3);
                });
            });

            it("passes 8 seconds", function() {
                var spy = sinon.spy();
                this.clock.setInterval(spy, 4000);

                return this.clock.tickAsync("08").then(function() {
                    assert.equals(spy.callCount, 2);
                });
            });

            it("passes 1 minute", function() {
                var spy = sinon.spy();
                this.clock.setInterval(spy, 6000);

                return this.clock.tickAsync("01:00").then(function() {
                    assert.equals(spy.callCount, 10);
                });
            });

            it("passes 2 hours, 34 minutes and 10 seconds", function() {
                var spy = sinon.spy();
                this.clock.setInterval(spy, 100000);

                return this.clock.tickAsync("02:34:10").then(function() {
                    assert.equals(spy.callCount, 92);
                });
            });

            it("throws for invalid format", function() {
                var spy = sinon.spy();
                this.clock.setInterval(spy, 10000);
                var test = this;
                var catchSpy = sinon.spy();

                return test.clock
                    .tickAsync("12:02:34:10")
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                        assert.equals(spy.callCount, 0);
                    });
            });

            it("throws for invalid minutes", function() {
                var spy = sinon.spy();
                this.clock.setInterval(spy, 10000);
                var test = this;
                var catchSpy = sinon.spy();

                return test.clock
                    .tickAsync("67:10")
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                        assert.equals(spy.callCount, 0);
                    });
            });

            it("throws for negative minutes", function() {
                var spy = sinon.spy();
                this.clock.setInterval(spy, 10000);
                var test = this;
                var catchSpy = sinon.spy();

                return test.clock
                    .tickAsync("-7:10")
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                        assert.equals(spy.callCount, 0);
                    });
            });

            it("treats missing argument as 0", function() {
                var clock = this.clock;
                return this.clock.tickAsync().then(function() {
                    assert.equals(clock.now, 0);
                });
            });

            it("fires nested setTimeout calls properly", function() {
                var i = 0;
                var clock = this.clock;

                var callback = function() {
                    ++i;
                    clock.setTimeout(function() {
                        callback();
                    }, 100);
                };

                callback();

                return clock.tickAsync(1000).then(function() {
                    assert.equals(i, 11);
                });
            });

            it("fires nested setTimeout calls in user-created promises properly", function() {
                var i = 0;
                var clock = this.clock;

                var callback = function() {
                    global.Promise.resolve().then(function() {
                        ++i;
                        clock.setTimeout(function() {
                            global.Promise.resolve().then(function() {
                                callback();
                            });
                        }, 100);
                    });
                };

                callback();

                return clock.tickAsync(1000).then(function() {
                    assert.equals(i, 11);
                });
            });

            it("does not silently catch errors", function() {
                var clock = this.clock;
                var catchSpy = sinon.spy();

                clock.setTimeout(function() {
                    throw new Error("oh no!");
                }, 1000);

                return clock
                    .tickAsync(1000)
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                    });
            });

            it("returns the current now value", function() {
                var clock = this.clock;
                return clock.tickAsync(200).then(function(value) {
                    assert.equals(clock.now, value);
                });
            });

            it("is not influenced by forward system clock changes", function() {
                var clock = this.clock;
                var callback = function() {
                    clock.setSystemTime(new clock.Date().getTime() + 1000);
                };
                var stub = sinon.stub();
                clock.setTimeout(callback, 1000);
                clock.setTimeout(stub, 2000);
                return clock
                    .tickAsync(1990)
                    .then(function() {
                        assert.equals(stub.callCount, 0);
                        return clock.tickAsync(20);
                    })
                    .then(function() {
                        assert.equals(stub.callCount, 1);
                    });
            });

            it("is not influenced by forward system clock changes in promises", function() {
                var clock = this.clock;
                var callback = function() {
                    global.Promise.resolve().then(function() {
                        clock.setSystemTime(new clock.Date().getTime() + 1000);
                    });
                };
                var stub = sinon.stub();
                clock.setTimeout(callback, 1000);
                clock.setTimeout(stub, 2000);
                return clock
                    .tickAsync(1990)
                    .then(function() {
                        assert.equals(stub.callCount, 0);
                        return clock.tickAsync(20);
                    })
                    .then(function() {
                        assert.equals(stub.callCount, 1);
                    });
            });

            it("is not influenced by forward system clock changes when an error is thrown", function() {
                var clock = this.clock;
                var callback = function() {
                    clock.setSystemTime(new clock.Date().getTime() + 1000);
                    throw new Error();
                };
                var stub = sinon.stub();
                var catchSpy = sinon.spy();
                clock.setTimeout(callback, 1000);
                clock.setTimeout(stub, 2000);
                return clock
                    .tickAsync(1990)
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                        assert.equals(stub.callCount, 0);
                        return clock.tickAsync(20);
                    })
                    .then(function() {
                        assert.equals(stub.callCount, 1);
                    });
            });

            it("should settle user-created promises", function() {
                var spy = sinon.spy();

                setTimeout(function() {
                    global.Promise.resolve().then(spy);
                }, 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spy.calledOnce);
                });
            });

            it("should settle chained user-created promises", function() {
                var spies = [sinon.spy(), sinon.spy(), sinon.spy()];

                setTimeout(function() {
                    global.Promise.resolve()
                        .then(spies[0])
                        .then(spies[1])
                        .then(spies[2]);
                }, 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spies[0].calledOnce);
                    assert(spies[1].calledOnce);
                    assert(spies[2].calledOnce);
                });
            });

            it("should settle multiple user-created promises", function() {
                var spies = [sinon.spy(), sinon.spy(), sinon.spy()];

                setTimeout(function() {
                    global.Promise.resolve().then(spies[0]);
                    global.Promise.resolve().then(spies[1]);
                    global.Promise.resolve().then(spies[2]);
                }, 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spies[0].calledOnce);
                    assert(spies[1].calledOnce);
                    assert(spies[2].calledOnce);
                });
            });

            it("should settle nested user-created promises", function() {
                var spy = sinon.spy();

                setTimeout(function() {
                    global.Promise.resolve().then(function() {
                        global.Promise.resolve().then(function() {
                            global.Promise.resolve().then(spy);
                        });
                    });
                }, 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spy.calledOnce);
                });
            });

            it("should settle user-created promises even if some throw", function() {
                var spies = [
                    sinon.spy(),
                    sinon.spy(),
                    sinon.spy(),
                    sinon.spy()
                ];

                setTimeout(function() {
                    global.Promise.reject()
                        .then(spies[0])
                        .catch(spies[1]);
                    global.Promise.resolve()
                        .then(spies[2])
                        .catch(spies[3]);
                }, 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spies[0].notCalled);
                    assert(spies[1].calledOnce);
                    assert(spies[2].calledOnce);
                    assert(spies[3].notCalled);
                });
            });

            it("should settle user-created promises before calling more timeouts", function() {
                var spies = [sinon.spy(), sinon.spy()];

                setTimeout(function() {
                    global.Promise.resolve().then(spies[0]);
                }, 100);

                setTimeout(spies[1], 200);

                return this.clock.tickAsync(200).then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                });
            });

            it("should settle local promises before calling timeouts", function() {
                var spies = [sinon.spy(), sinon.spy()];

                global.Promise.resolve().then(spies[0]);

                setTimeout(spies[1], 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                });
            });

            it("should settle local nested promises before calling timeouts", function() {
                var spies = [sinon.spy(), sinon.spy()];

                global.Promise.resolve().then(function() {
                    global.Promise.resolve().then(function() {
                        global.Promise.resolve().then(spies[0]);
                    });
                });

                setTimeout(spies[1], 100);

                return this.clock.tickAsync(100).then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                });
            });
        });
    }

    describe("next", function() {
        beforeEach(function() {
            this.clock = lolex.install({ now: 0 });
        });

        afterEach(function() {
            this.clock.uninstall();
        });

        it("triggers the next timer", function() {
            var stub = sinon.stub();
            this.clock.setTimeout(stub, 100);

            this.clock.next();

            assert(stub.called);
        });

        it("does not trigger simultaneous timers", function() {
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 100);
            this.clock.setTimeout(spies[1], 100);

            this.clock.next();

            assert(spies[0].called);
            assert.isFalse(spies[1].called);
        });

        it("subsequent calls trigger simultaneous timers", function() {
            var spies = [sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 100);
            this.clock.setTimeout(spies[1], 100);
            this.clock.setTimeout(spies[2], 99);
            this.clock.setTimeout(spies[3], 100);

            this.clock.next();
            assert(spies[2].called);
            assert.isFalse(spies[0].called);
            assert.isFalse(spies[1].called);
            assert.isFalse(spies[3].called);

            this.clock.next();
            assert(spies[0].called);
            assert.isFalse(spies[1].called);
            assert.isFalse(spies[3].called);

            this.clock.next();
            assert(spies[1].called);
            assert.isFalse(spies[3].called);

            this.clock.next();
            assert(spies[3].called);
        });

        it("subsequent calls triggers simultaneous timers with zero callAt", function() {
            var test = this;
            var spies = [
                sinon.spy(function() {
                    test.clock.setTimeout(spies[1], 0);
                }),
                sinon.spy(),
                sinon.spy()
            ];

            // First spy calls another setTimeout with delay=0
            this.clock.setTimeout(spies[0], 0);
            this.clock.setTimeout(spies[2], 10);

            this.clock.next();
            assert(spies[0].called);
            assert.isFalse(spies[1].called);

            this.clock.next();
            assert(spies[1].called);

            this.clock.next();
            assert(spies[2].called);
        });

        it("throws exception thrown by timer", function() {
            var clock = this.clock;
            var stub = sinon.stub().throws();

            clock.setTimeout(stub, 100);

            assert.exception(function() {
                clock.next();
            });

            assert(stub.called);
        });

        it("calls function with global object or null (strict mode) as this", function() {
            var clock = this.clock;
            var stub = sinon.stub().throws();
            clock.setTimeout(stub, 100);

            assert.exception(function() {
                clock.next();
            });

            assert(stub.calledOn(global) || stub.calledOn(null));
        });

        it("subsequent calls trigger in the order scheduled", function() {
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 13);
            this.clock.setTimeout(spies[1], 11);

            this.clock.next();
            this.clock.next();

            assert(spies[1].calledBefore(spies[0]));
        });

        it("subsequent calls create updated Date", function() {
            var spy = sinon.spy();

            this.clock.setInterval(function() {
                spy(new Date().getTime());
            }, 10);

            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();

            assert.equals(spy.callCount, 10);
            assert(spy.calledWith(10));
            assert(spy.calledWith(20));
            assert(spy.calledWith(30));
            assert(spy.calledWith(40));
            assert(spy.calledWith(50));
            assert(spy.calledWith(60));
            assert(spy.calledWith(70));
            assert(spy.calledWith(80));
            assert(spy.calledWith(90));
            assert(spy.calledWith(100));
        });

        it("subsequent calls trigger timeouts and intervals in the order scheduled", function() {
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setInterval(spies[0], 10);
            this.clock.setTimeout(spies[1], 50);

            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();

            assert(spies[0].calledBefore(spies[1]));
            assert.equals(spies[0].callCount, 5);
            assert.equals(spies[1].callCount, 1);
        });

        it("subsequent calls do not fire canceled intervals", function() {
            var id;
            var callback = sinon.spy(function() {
                if (callback.callCount === 3) {
                    clearInterval(id);
                }
            });

            id = this.clock.setInterval(callback, 10);
            this.clock.next();
            this.clock.next();
            this.clock.next();
            this.clock.next();

            assert.equals(callback.callCount, 3);
        });

        it("advances the clock based on when the timer was supposed to be called", function() {
            var clock = this.clock;
            clock.setTimeout(sinon.spy(), 55);
            clock.next();
            assert.equals(clock.now, 55);
        });

        it("returns the current now value", function() {
            var clock = this.clock;
            clock.setTimeout(sinon.spy(), 55);
            var value = clock.next();
            assert.equals(clock.now, value);
        });
    });

    if (typeof global.Promise !== "undefined") {
        describe("nextAsync", function() {
            beforeEach(function() {
                this.clock = lolex.install();
            });

            afterEach(function() {
                this.clock.uninstall();
            });

            it("triggers the next timer", function() {
                var stub = sinon.stub();
                this.clock.setTimeout(stub, 100);

                return this.clock.nextAsync().then(function() {
                    assert(stub.called);
                });
            });

            it("does not trigger simultaneous timers", function() {
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 100);
                this.clock.setTimeout(spies[1], 100);

                return this.clock.nextAsync().then(function() {
                    assert(spies[0].called);
                    assert.isFalse(spies[1].called);
                });
            });

            it("subsequent calls trigger simultaneous timers", function() {
                var spies = [
                    sinon.spy(),
                    sinon.spy(),
                    sinon.spy(),
                    sinon.spy()
                ];
                var clock = this.clock;
                this.clock.setTimeout(spies[0], 100);
                this.clock.setTimeout(spies[1], 100);
                this.clock.setTimeout(spies[2], 99);
                this.clock.setTimeout(spies[3], 100);

                return this.clock
                    .nextAsync()
                    .then(function() {
                        assert(spies[2].called);
                        assert.isFalse(spies[0].called);
                        assert.isFalse(spies[1].called);
                        assert.isFalse(spies[3].called);
                        return clock.nextAsync();
                    })
                    .then(function() {
                        assert(spies[0].called);
                        assert.isFalse(spies[1].called);
                        assert.isFalse(spies[3].called);

                        return clock.nextAsync();
                    })
                    .then(function() {
                        assert(spies[1].called);
                        assert.isFalse(spies[3].called);

                        return clock.nextAsync();
                    })
                    .then(function() {
                        assert(spies[3].called);
                    });
            });

            it("subsequent calls triggers simultaneous timers with zero callAt", function() {
                var test = this;
                var spies = [
                    sinon.spy(function() {
                        test.clock.setTimeout(spies[1], 0);
                    }),
                    sinon.spy(),
                    sinon.spy()
                ];

                // First spy calls another setTimeout with delay=0
                this.clock.setTimeout(spies[0], 0);
                this.clock.setTimeout(spies[2], 10);

                return this.clock
                    .nextAsync()
                    .then(function() {
                        assert(spies[0].called);
                        assert.isFalse(spies[1].called);

                        return test.clock.nextAsync();
                    })
                    .then(function() {
                        assert(spies[1].called);

                        return test.clock.nextAsync();
                    })
                    .then(function() {
                        assert(spies[2].called);
                    });
            });

            it("subsequent calls in promises triggers simultaneous timers with zero callAt", function() {
                var test = this;
                var spies = [
                    sinon.spy(function() {
                        global.Promise.resolve().then(function() {
                            test.clock.setTimeout(spies[1], 0);
                        });
                    }),
                    sinon.spy(),
                    sinon.spy()
                ];

                // First spy calls another setTimeout with delay=0
                this.clock.setTimeout(spies[0], 0);
                this.clock.setTimeout(spies[2], 10);

                return this.clock
                    .nextAsync()
                    .then(function() {
                        assert(spies[0].called);
                        assert.isFalse(spies[1].called);

                        return test.clock.nextAsync();
                    })
                    .then(function() {
                        assert(spies[1].called);

                        return test.clock.nextAsync();
                    })
                    .then(function() {
                        assert(spies[2].called);
                    });
            });

            it("throws exception thrown by timer", function() {
                var clock = this.clock;
                var stub = sinon.stub().throws();
                var catchSpy = sinon.spy();

                clock.setTimeout(stub, 100);

                return clock
                    .nextAsync()
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);

                        assert(stub.called);
                    });
            });

            it("calls function with global object or null (strict mode) as this", function() {
                var clock = this.clock;
                var stub = sinon.stub().throws();
                var catchSpy = sinon.spy();
                clock.setTimeout(stub, 100);

                return clock
                    .nextAsync()
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);

                        assert(stub.calledOn(global) || stub.calledOn(null));
                    });
            });

            it("subsequent calls trigger in the order scheduled", function() {
                var clock = this.clock;
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 13);
                this.clock.setTimeout(spies[1], 11);

                return this.clock
                    .nextAsync()
                    .then(function() {
                        return clock.nextAsync();
                    })
                    .then(function() {
                        assert(spies[1].calledBefore(spies[0]));
                    });
            });

            it("subsequent calls create updated Date", function() {
                var clock = this.clock;
                var spy = sinon.spy();

                this.clock.setInterval(function() {
                    spy(new Date().getTime());
                }, 10);

                return this.clock
                    .nextAsync()
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(function() {
                        assert.equals(spy.callCount, 10);
                        assert(spy.calledWith(10));
                        assert(spy.calledWith(20));
                        assert(spy.calledWith(30));
                        assert(spy.calledWith(40));
                        assert(spy.calledWith(50));
                        assert(spy.calledWith(60));
                        assert(spy.calledWith(70));
                        assert(spy.calledWith(80));
                        assert(spy.calledWith(90));
                        assert(spy.calledWith(100));
                    });
            });

            it("subsequent calls in promises create updated Date", function() {
                var clock = this.clock;
                var spy = sinon.spy();

                this.clock.setInterval(function() {
                    global.Promise.resolve().then(function() {
                        spy(new Date().getTime());
                    });
                }, 10);

                return this.clock
                    .nextAsync()
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(function() {
                        assert.equals(spy.callCount, 10);
                        assert(spy.calledWith(10));
                        assert(spy.calledWith(20));
                        assert(spy.calledWith(30));
                        assert(spy.calledWith(40));
                        assert(spy.calledWith(50));
                        assert(spy.calledWith(60));
                        assert(spy.calledWith(70));
                        assert(spy.calledWith(80));
                        assert(spy.calledWith(90));
                        assert(spy.calledWith(100));
                    });
            });

            it("subsequent calls trigger timeouts and intervals in the order scheduled", function() {
                var clock = this.clock;
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setInterval(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                return this.clock
                    .nextAsync()
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(function() {
                        assert(spies[0].calledBefore(spies[1]));
                        assert.equals(spies[0].callCount, 5);
                        assert.equals(spies[1].callCount, 1);
                    });
            });

            it("subsequent calls do not fire canceled intervals", function() {
                var id;
                var clock = this.clock;
                var callback = sinon.spy(function() {
                    if (callback.callCount === 3) {
                        clearInterval(id);
                    }
                });

                id = this.clock.setInterval(callback, 10);
                return this.clock
                    .nextAsync()
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(function() {
                        assert.equals(callback.callCount, 3);
                    });
            });

            it("subsequent calls do not fire intervals canceled in promises", function() {
                var id;
                var clock = this.clock;
                var callback = sinon.spy(function() {
                    if (callback.callCount === 3) {
                        global.Promise.resolve().then(function() {
                            clearInterval(id);
                        });
                    }
                });

                id = this.clock.setInterval(callback, 10);
                return this.clock
                    .nextAsync()
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(clock.nextAsync)
                    .then(function() {
                        assert.equals(callback.callCount, 3);
                    });
            });

            it("advances the clock based on when the timer was supposed to be called", function() {
                var clock = this.clock;
                clock.setTimeout(sinon.spy(), 55);
                return clock.nextAsync().then(function() {
                    assert.equals(clock.now, 55);
                });
            });

            it("returns the current now value", function() {
                var clock = this.clock;
                clock.setTimeout(sinon.spy(), 55);
                return clock.nextAsync().then(function(value) {
                    assert.equals(clock.now, value);
                });
            });

            it("should settle user-created promises", function() {
                var spy = sinon.spy();

                setTimeout(function() {
                    global.Promise.resolve().then(spy);
                }, 55);

                return this.clock.nextAsync().then(function() {
                    assert(spy.calledOnce);
                });
            });

            it("should settle nested user-created promises", function() {
                var spy = sinon.spy();

                setTimeout(function() {
                    global.Promise.resolve().then(function() {
                        global.Promise.resolve().then(function() {
                            global.Promise.resolve().then(spy);
                        });
                    });
                }, 55);

                return this.clock.nextAsync().then(function() {
                    assert(spy.calledOnce);
                });
            });

            it("should settle local promises before firing timers", function() {
                var spies = [sinon.spy(), sinon.spy()];

                global.Promise.resolve().then(spies[0]);

                setTimeout(spies[1], 55);

                return this.clock.nextAsync().then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                });
            });
        });
    }

    describe("runAll", function() {
        it("if there are no timers just return", function() {
            this.clock = lolex.createClock();
            this.clock.runAll();
        });

        it("runs all timers", function() {
            this.clock = lolex.createClock();
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 10);
            this.clock.setTimeout(spies[1], 50);

            this.clock.runAll();

            assert(spies[0].called);
            assert(spies[1].called);
        });

        it("new timers added while running are also run", function() {
            this.clock = lolex.createClock();
            var test = this;
            var spies = [
                sinon.spy(function() {
                    test.clock.setTimeout(spies[1], 50);
                }),
                sinon.spy()
            ];

            // Spy calls another setTimeout
            this.clock.setTimeout(spies[0], 10);

            this.clock.runAll();

            assert(spies[0].called);
            assert(spies[1].called);
        });

        it("throws before allowing infinite recursion", function() {
            this.clock = lolex.createClock();
            var test = this;
            var recursiveCallback = function() {
                test.clock.setTimeout(recursiveCallback, 10);
            };

            this.clock.setTimeout(recursiveCallback, 10);

            assert.exception(function() {
                test.clock.runAll();
            });
        });

        it("the loop limit can be set when creating a clock", function() {
            this.clock = lolex.createClock(0, 1);
            var test = this;

            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 10);
            this.clock.setTimeout(spies[1], 50);

            assert.exception(function() {
                test.clock.runAll();
            });
        });

        it("the loop limit can be set when installing a clock", function() {
            this.clock = lolex.install({ loopLimit: 1 });
            var test = this;

            var spies = [sinon.spy(), sinon.spy()];
            setTimeout(spies[0], 10);
            setTimeout(spies[1], 50);

            assert.exception(function() {
                test.clock.runAll();
            });

            this.clock.uninstall();
        });
    });

    if (typeof global.Promise !== "undefined") {
        describe("runAllAsync", function() {
            it("if there are no timers just return", function() {
                this.clock = lolex.createClock();
                return this.clock.runAllAsync();
            });

            it("runs all timers", function() {
                this.clock = lolex.createClock();
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                return this.clock.runAllAsync().then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                });
            });

            it("new timers added while running are also run", function() {
                this.clock = lolex.createClock();
                var test = this;
                var spies = [
                    sinon.spy(function() {
                        test.clock.setTimeout(spies[1], 50);
                    }),
                    sinon.spy()
                ];

                // Spy calls another setTimeout
                this.clock.setTimeout(spies[0], 10);

                return this.clock.runAllAsync().then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                });
            });

            it("new timers added in promises while running are also run", function() {
                this.clock = lolex.createClock();
                var test = this;
                var spies = [
                    sinon.spy(function() {
                        global.Promise.resolve().then(function() {
                            test.clock.setTimeout(spies[1], 50);
                        });
                    }),
                    sinon.spy()
                ];

                // Spy calls another setTimeout
                this.clock.setTimeout(spies[0], 10);

                return this.clock.runAllAsync().then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                });
            });

            it("throws before allowing infinite recursion", function() {
                this.clock = lolex.createClock(0, 100);
                var test = this;
                var recursiveCallback = function() {
                    test.clock.setTimeout(recursiveCallback, 10);
                };
                var catchSpy = sinon.spy();

                this.clock.setTimeout(recursiveCallback, 10);

                return test.clock
                    .runAllAsync()
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                    });
            });

            it("throws before allowing infinite recursion from promises", function() {
                this.clock = lolex.createClock(0, 100);
                var test = this;
                var recursiveCallback = function() {
                    global.Promise.resolve().then(function() {
                        test.clock.setTimeout(recursiveCallback, 10);
                    });
                };
                var catchSpy = sinon.spy();

                this.clock.setTimeout(recursiveCallback, 10);

                return test.clock
                    .runAllAsync()
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                    });
            });

            it("the loop limit can be set when creating a clock", function() {
                this.clock = lolex.createClock(0, 1);
                var test = this;
                var catchSpy = sinon.spy();

                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                return test.clock
                    .runAllAsync()
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);
                    });
            });

            it("the loop limit can be set when installing a clock", function() {
                this.clock = lolex.install({ loopLimit: 1 });
                var test = this;
                var catchSpy = sinon.spy();

                var spies = [sinon.spy(), sinon.spy()];
                setTimeout(spies[0], 10);
                setTimeout(spies[1], 50);

                return test.clock
                    .runAllAsync()
                    .catch(catchSpy)
                    .then(function() {
                        assert(catchSpy.calledOnce);

                        test.clock.uninstall();
                    });
            });

            it("should settle user-created promises", function() {
                this.clock = lolex.createClock();
                var spy = sinon.spy();

                this.clock.setTimeout(function() {
                    global.Promise.resolve().then(spy);
                }, 55);

                return this.clock.runAllAsync().then(function() {
                    assert(spy.calledOnce);
                });
            });

            it("should settle nested user-created promises", function() {
                this.clock = lolex.createClock();
                var spy = sinon.spy();

                this.clock.setTimeout(function() {
                    global.Promise.resolve().then(function() {
                        global.Promise.resolve().then(function() {
                            global.Promise.resolve().then(spy);
                        });
                    });
                }, 55);

                return this.clock.runAllAsync().then(function() {
                    assert(spy.calledOnce);
                });
            });

            it("should settle local promises before firing timers", function() {
                this.clock = lolex.createClock();
                var spies = [sinon.spy(), sinon.spy()];

                global.Promise.resolve().then(spies[0]);

                this.clock.setTimeout(spies[1], 55);

                return this.clock.runAllAsync().then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                });
            });

            it("should settle user-created promises before firing more timers", function() {
                this.clock = lolex.createClock();
                var spies = [sinon.spy(), sinon.spy()];

                this.clock.setTimeout(function() {
                    global.Promise.resolve().then(spies[0]);
                }, 55);

                this.clock.setTimeout(spies[1], 75);

                return this.clock.runAllAsync().then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                });
            });
        });
    }

    describe("runToLast", function() {
        it("returns current time when there are no timers", function() {
            this.clock = lolex.createClock();

            var time = this.clock.runToLast();

            assert.equals(time, 0);
        });

        it("runs all existing timers", function() {
            this.clock = lolex.createClock();
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 10);
            this.clock.setTimeout(spies[1], 50);

            this.clock.runToLast();

            assert(spies[0].called);
            assert(spies[1].called);
        });

        it("returns time of the last timer", function() {
            this.clock = lolex.createClock();
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 10);
            this.clock.setTimeout(spies[1], 50);

            var time = this.clock.runToLast();

            assert.equals(time, 50);
        });

        it("runs all existing timers when two timers are matched for being last", function() {
            this.clock = lolex.createClock();
            var spies = [sinon.spy(), sinon.spy()];
            this.clock.setTimeout(spies[0], 10);
            this.clock.setTimeout(spies[1], 10);

            this.clock.runToLast();

            assert(spies[0].called);
            assert(spies[1].called);
        });

        it("new timers added with a call time later than the last existing timer are NOT run", function() {
            this.clock = lolex.createClock();
            var test = this;
            var spies = [
                sinon.spy(function() {
                    test.clock.setTimeout(spies[1], 50);
                }),
                sinon.spy()
            ];

            // Spy calls another setTimeout
            this.clock.setTimeout(spies[0], 10);

            this.clock.runToLast();

            assert.isTrue(spies[0].called);
            assert.isFalse(spies[1].called);
        });

        it("new timers added with a call time earlier than the last existing timer are run", function() {
            this.clock = lolex.createClock();
            var test = this;
            var spies = [
                sinon.spy(),
                sinon.spy(function() {
                    test.clock.setTimeout(spies[2], 50);
                }),
                sinon.spy()
            ];

            this.clock.setTimeout(spies[0], 100);
            // Spy calls another setTimeout
            this.clock.setTimeout(spies[1], 10);

            this.clock.runToLast();

            assert.isTrue(spies[0].called);
            assert.isTrue(spies[1].called);
            assert.isTrue(spies[2].called);
        });

        it("new timers cannot cause an infinite loop", function() {
            this.clock = lolex.createClock();
            var test = this;
            var spy = sinon.spy();
            var recursiveCallback = function() {
                test.clock.setTimeout(recursiveCallback, 0);
            };

            this.clock.setTimeout(recursiveCallback, 0);
            this.clock.setTimeout(spy, 100);

            this.clock.runToLast();

            assert.isTrue(spy.called);
        });

        it("should support clocks with start time", function() {
            this.clock = lolex.createClock(200);
            var that = this;
            var invocations = 0;

            this.clock.setTimeout(function cb() {
                invocations++;
                that.clock.setTimeout(cb, 50);
            }, 50);

            this.clock.runToLast();

            assert.equals(invocations, 1);
        });
    });

    if (typeof global.Promise !== "undefined") {
        describe("runToLastAsync", function() {
            it("returns current time when there are no timers", function() {
                this.clock = lolex.createClock();

                return this.clock.runToLastAsync().then(function(time) {
                    assert.equals(time, 0);
                });
            });

            it("runs all existing timers", function() {
                this.clock = lolex.createClock();
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                return this.clock.runToLastAsync().then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                });
            });

            it("returns time of the last timer", function() {
                this.clock = lolex.createClock();
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                return this.clock.runToLastAsync().then(function(time) {
                    assert.equals(time, 50);
                });
            });

            it("runs all existing timers when two timers are matched for being last", function() {
                this.clock = lolex.createClock();
                var spies = [sinon.spy(), sinon.spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 10);

                return this.clock.runToLastAsync().then(function() {
                    assert(spies[0].called);
                    assert(spies[1].called);
                });
            });

            it("new timers added with a call time later than the last existing timer are NOT run", function() {
                this.clock = lolex.createClock();
                var test = this;
                var spies = [
                    sinon.spy(function() {
                        test.clock.setTimeout(spies[1], 50);
                    }),
                    sinon.spy()
                ];

                // Spy calls another setTimeout
                this.clock.setTimeout(spies[0], 10);

                return this.clock.runToLastAsync().then(function() {
                    assert.isTrue(spies[0].called);
                    assert.isFalse(spies[1].called);
                });
            });

            it(
                "new timers added from a promise with a call time later than the last existing timer" +
                    "are NOT run",
                function() {
                    this.clock = lolex.createClock();
                    var test = this;
                    var spies = [
                        sinon.spy(function() {
                            global.Promise.resolve().then(function() {
                                test.clock.setTimeout(spies[1], 50);
                            });
                        }),
                        sinon.spy()
                    ];

                    // Spy calls another setTimeout
                    this.clock.setTimeout(spies[0], 10);

                    return this.clock.runToLastAsync().then(function() {
                        assert.isTrue(spies[0].called);
                        assert.isFalse(spies[1].called);
                    });
                }
            );

            it("new timers added with a call time ealier than the last existing timer are run", function() {
                this.clock = lolex.createClock();
                var test = this;
                var spies = [
                    sinon.spy(),
                    sinon.spy(function() {
                        test.clock.setTimeout(spies[2], 50);
                    }),
                    sinon.spy()
                ];

                this.clock.setTimeout(spies[0], 100);
                // Spy calls another setTimeout
                this.clock.setTimeout(spies[1], 10);

                return this.clock.runToLastAsync().then(function() {
                    assert.isTrue(spies[0].called);
                    assert.isTrue(spies[1].called);
                    assert.isTrue(spies[2].called);
                });
            });

            it(
                "new timers added from a promise with a call time ealier than the last existing timer" +
                    "are run",
                function() {
                    this.clock = lolex.createClock();
                    var test = this;
                    var spies = [
                        sinon.spy(),
                        sinon.spy(function() {
                            global.Promise.resolve().then(function() {
                                test.clock.setTimeout(spies[2], 50);
                            });
                        }),
                        sinon.spy()
                    ];

                    this.clock.setTimeout(spies[0], 100);
                    // Spy calls another setTimeout
                    this.clock.setTimeout(spies[1], 10);

                    return this.clock.runToLastAsync().then(function() {
                        assert.isTrue(spies[0].called);
                        assert.isTrue(spies[1].called);
                        assert.isTrue(spies[2].called);
                    });
                }
            );

            it("new timers cannot cause an infinite loop", function() {
                this.clock = lolex.createClock();
                var test = this;
                var spy = sinon.spy();
                var recursiveCallback = function() {
                    test.clock.setTimeout(recursiveCallback, 0);
                };

                this.clock.setTimeout(recursiveCallback, 0);
                this.clock.setTimeout(spy, 100);

                return this.clock.runToLastAsync().then(function() {
                    assert.isTrue(spy.called);
                });
            });

            it("new timers created from promises cannot cause an infinite loop", function() {
                this.clock = lolex.createClock();
                var test = this;
                var spy = sinon.spy();
                var recursiveCallback = function() {
                    global.Promise.resolve().then(function() {
                        test.clock.setTimeout(recursiveCallback, 0);
                    });
                };

                this.clock.setTimeout(recursiveCallback, 0);
                this.clock.setTimeout(spy, 100);

                return this.clock.runToLastAsync().then(function() {
                    assert.isTrue(spy.called);
                });
            });

            it("should settle user-created promises", function() {
                this.clock = lolex.createClock();
                var spy = sinon.spy();

                this.clock.setTimeout(function() {
                    global.Promise.resolve().then(spy);
                }, 55);

                return this.clock.runToLastAsync().then(function() {
                    assert(spy.calledOnce);
                });
            });

            it("should settle nested user-created promises", function() {
                this.clock = lolex.createClock();
                var spy = sinon.spy();

                this.clock.setTimeout(function() {
                    global.Promise.resolve().then(function() {
                        global.Promise.resolve().then(function() {
                            global.Promise.resolve().then(spy);
                        });
                    });
                }, 55);

                return this.clock.runToLastAsync().then(function() {
                    assert(spy.calledOnce);
                });
            });

            it("should settle local promises before firing timers", function() {
                this.clock = lolex.createClock();
                var spies = [sinon.spy(), sinon.spy()];

                global.Promise.resolve().then(spies[0]);

                this.clock.setTimeout(spies[1], 55);

                return this.clock.runToLastAsync().then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                });
            });

            it("should settle user-created promises before firing more timers", function() {
                this.clock = lolex.createClock();
                var spies = [sinon.spy(), sinon.spy()];

                this.clock.setTimeout(function() {
                    global.Promise.resolve().then(spies[0]);
                }, 55);

                this.clock.setTimeout(spies[1], 75);

                return this.clock.runToLastAsync().then(function() {
                    assert(spies[0].calledBefore(spies[1]));
                });
            });
        });
    }

    describe("clearTimeout", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("removes timeout", function() {
            var stub = sinon.stub();
            var id = this.clock.setTimeout(stub, 50);
            this.clock.clearTimeout(id);
            this.clock.tick(50);

            assert.isFalse(stub.called);
        });

        it("does not remove interval", function() {
            var stub = sinon.stub();
            var id = this.clock.setInterval(stub, 50);
            assert.exception(
                function() {
                    this.clock.clearTimeout(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setInterval() but cleared with clearTimeout()"
                }
            );
            this.clock.tick(50);

            assert.isTrue(stub.called);
        });

        it("does not remove interval with undefined interval", function() {
            var stub = sinon.stub();
            var id = this.clock.setInterval(stub);
            assert.exception(
                function() {
                    this.clock.clearTimeout(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setInterval() but cleared with clearTimeout()"
                }
            );
            this.clock.tick(50);

            assert.isTrue(stub.called);
        });

        it("does not remove immediate", function() {
            if (!setImmediatePresent) {
                this.skip();
            }

            var stub = sinon.stub();
            var id = this.clock.setImmediate(stub);
            assert.exception(
                function() {
                    this.clock.clearTimeout(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setImmediate() but cleared with clearTimeout()"
                }
            );
            this.clock.tick(50);

            assert.isTrue(stub.called);
        });

        it("ignores null argument", function() {
            this.clock.clearTimeout(null);
            assert(true); // doesn't fail
        });
    });

    describe("reset", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("empties timeouts queue", function() {
            var stub = sinon.stub();
            this.clock.setSystemTime(1000);
            this.clock.setTimeout(stub);
            this.clock.nextTick(stub);
            this.clock.reset();
            this.clock.tick(0);

            assert.isFalse(stub.called);
            assert.equals(this.clock.Date.now(), 0);
        });

        it("resets to the time install with - issue #183", function() {
            var clock = lolex.install({ now: 10000 });
            clock.reset();
            assert.equals(clock.now, 10000);
            clock.uninstall();
        });

        it("resets hrTime - issue #206", function() {
            if (!hrtimePresent) {
                this.skip();
            }

            var clock = lolex.createClock();
            clock.tick(100);
            assert.equals(clock.hrtime(), [0, 100 * 1e6]);
            clock.reset();
            assert.equals(clock.hrtime(), [0, 0]);
        });
    });

    describe("setInterval", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("throws if no arguments", function() {
            var clock = this.clock;

            assert.exception(function() {
                clock.setInterval();
            });
        });

        it("returns numeric id or object with numeric id", function() {
            var result = this.clock.setInterval("");

            if (typeof result === "object") {
                assert.isNumber(result.id);
            } else {
                assert.isNumber(result);
            }
        });

        it("returns unique id", function() {
            var id1 = this.clock.setInterval("");
            var id2 = this.clock.setInterval("");

            refute.equals(id2, id1);
        });

        it("schedules recurring timeout", function() {
            var stub = sinon.stub();
            this.clock.setInterval(stub, 10);
            this.clock.tick(99);

            assert.equals(stub.callCount, 9);
        });

        it("is not influenced by forward system clock changes", function() {
            var stub = sinon.stub();
            this.clock.setInterval(stub, 10);
            this.clock.tick(11);
            assert.equals(stub.callCount, 1);
            this.clock.setSystemTime(new this.clock.Date().getTime() + 1000);
            this.clock.tick(8);
            assert.equals(stub.callCount, 1);
            this.clock.tick(3);
            assert.equals(stub.callCount, 2);
        });

        it("is not influenced by backward system clock changes", function() {
            var stub = sinon.stub();
            this.clock.setInterval(stub, 10);
            this.clock.tick(5);
            this.clock.setSystemTime(new this.clock.Date().getTime() - 1000);
            this.clock.tick(6);
            assert.equals(stub.callCount, 1);
            this.clock.tick(10);
            assert.equals(stub.callCount, 2);
        });

        it("does not schedule recurring timeout when cleared", function() {
            var clock = this.clock;
            var id;
            var stub = sinon.spy(function() {
                if (stub.callCount === 3) {
                    clock.clearInterval(id);
                }
            });

            id = this.clock.setInterval(stub, 10);
            this.clock.tick(100);

            assert.equals(stub.callCount, 3);
        });

        it("passes setTimeout parameters", function() {
            var clock = lolex.createClock();
            var stub = sinon.stub();

            clock.setInterval(stub, 2, "the first", "the second");

            clock.tick(3);

            assert.isTrue(stub.calledWithExactly("the first", "the second"));
        });
    });

    describe("clearInterval", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("removes interval", function() {
            var stub = sinon.stub();
            var id = this.clock.setInterval(stub, 50);
            this.clock.clearInterval(id);
            this.clock.tick(50);

            assert.isFalse(stub.called);
        });

        it("removes interval with undefined interval", function() {
            var stub = sinon.stub();
            var id = this.clock.setInterval(stub);
            this.clock.clearInterval(id);
            this.clock.tick(50);

            assert.isFalse(stub.called);
        });

        it("does not remove timeout", function() {
            var stub = sinon.stub();
            var id = this.clock.setTimeout(stub, 50);
            assert.exception(
                function() {
                    this.clock.clearInterval(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setTimeout() but cleared with clearInterval()"
                }
            );
            this.clock.tick(50);
            assert.isTrue(stub.called);
        });

        it("does not remove immediate", function() {
            if (!setImmediatePresent) {
                this.skip();
            }

            var stub = sinon.stub();
            var id = this.clock.setImmediate(stub);
            assert.exception(
                function() {
                    this.clock.clearInterval(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setImmediate() but cleared with clearInterval()"
                }
            );
            this.clock.tick(50);

            assert.isTrue(stub.called);
        });

        it("ignores null argument", function() {
            this.clock.clearInterval(null);
            assert(true); // doesn't fail
        });
    });

    describe("date", function() {
        beforeEach(function() {
            this.now = new GlobalDate().getTime() - 3000;
            this.clock = lolex.createClock(this.now);
            this.Date = global.Date;
        });

        afterEach(function() {
            global.Date = this.Date;
        });

        it("provides date constructor", function() {
            assert.isFunction(this.clock.Date);
        });

        it("creates real Date objects", function() {
            var date = new this.clock.Date();

            assert(Date.prototype.isPrototypeOf(date));
        });

        it("returns date as string when called as function", function() {
            var date = this.clock.Date();

            assert(typeof date === "string");
        });

        it("creates real Date objects when Date constructor is gone", function() {
            var realDate = new Date();
            Date = NOOP; // eslint-disable-line no-global-assign
            global.Date = NOOP;

            var date = new this.clock.Date();

            assert.same(
                date.constructor.prototype,
                realDate.constructor.prototype
            );
        });

        it("creates Date objects representing clock time", function() {
            var date = new this.clock.Date();

            assert.equals(date.getTime(), new Date(this.now).getTime());
        });

        it("returns date as string representing clock time", function() {
            var date = this.clock.Date();

            assert.equals(date, new Date(this.now).toString());
        });

        it("listens to ticking clock", function() {
            var date1 = new this.clock.Date();
            this.clock.tick(3);
            var date2 = new this.clock.Date();

            assert.equals(date2.getTime() - date1.getTime(), 3);
        });

        it("listens to system clock changes", function() {
            var date1 = new this.clock.Date();
            this.clock.setSystemTime(date1.getTime() + 1000);
            var date2 = new this.clock.Date();

            assert.equals(date2.getTime() - date1.getTime(), 1000);
        });

        it("creates regular date when passing timestamp", function() {
            var date = new Date();
            var fakeDate = new this.clock.Date(date.getTime());

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("creates regular date when passing a date as string", function() {
            var date = new Date();
            var fakeDate = new this.clock.Date(date.toISOString());

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("creates regular date when passing a date as RFC 2822 string", function() {
            var date = new Date("Sat Apr 12 2014 12:22:00 GMT+1000");
            var fakeDate = new this.clock.Date(
                "Sat Apr 12 2014 12:22:00 GMT+1000"
            );

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("creates regular date when passing year, month", function() {
            var date = new Date(2010, 4);
            var fakeDate = new this.clock.Date(2010, 4);

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("creates regular date when passing y, m, d", function() {
            var date = new Date(2010, 4, 2);
            var fakeDate = new this.clock.Date(2010, 4, 2);

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("creates regular date when passing y, m, d, h", function() {
            var date = new Date(2010, 4, 2, 12);
            var fakeDate = new this.clock.Date(2010, 4, 2, 12);

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("creates regular date when passing y, m, d, h, m", function() {
            var date = new Date(2010, 4, 2, 12, 42);
            var fakeDate = new this.clock.Date(2010, 4, 2, 12, 42);

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("creates regular date when passing y, m, d, h, m, s", function() {
            var date = new Date(2010, 4, 2, 12, 42, 53);
            var fakeDate = new this.clock.Date(2010, 4, 2, 12, 42, 53);

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("creates regular date when passing y, m, d, h, m, s, ms", function() {
            var date = new Date(2010, 4, 2, 12, 42, 53, 498);
            var fakeDate = new this.clock.Date(2010, 4, 2, 12, 42, 53, 498);

            assert.equals(fakeDate.getTime(), date.getTime());
        });

        it("returns date as string when calling with arguments", function() {
            var fakeDateStr = this.clock.Date(2010, 4, 2, 12, 42, 53, 498);

            assert.equals(fakeDateStr, new this.clock.Date().toString());
        });

        it("returns date as string when calling with timestamp", function() {
            var fakeDateStr = this.clock.Date(1);

            assert.equals(fakeDateStr, new this.clock.Date().toString());
        });

        it("mirrors native Date.prototype", function() {
            assert.same(this.clock.Date.prototype, Date.prototype);
        });

        it("supports now method if present", function() {
            assert.same(typeof this.clock.Date.now, typeof Date.now);
        });

        if (Date.now) {
            describe("now", function() {
                it("returns clock.now", function() {
                    /* eslint camelcase: "off" */
                    var clock_now = this.clock.Date.now();
                    var global_now = GlobalDate.now();

                    assert(this.now <= clock_now && clock_now <= global_now);
                });
            });
        } else {
            describe("unsupported now", function() {
                it("is undefined", function() {
                    assert.isUndefined(this.clock.Date.now);
                });
            });
        }

        it("mirrors parse method", function() {
            assert.same(this.clock.Date.parse, Date.parse);
        });

        it("mirrors UTC method", function() {
            assert.same(this.clock.Date.UTC, Date.UTC);
        });

        it("mirrors toUTCString method", function() {
            assert.same(
                this.clock.Date.prototype.toUTCString,
                Date.prototype.toUTCString
            );
        });

        if (Date.toSource) {
            describe("toSource", function() {
                it("is mirrored", function() {
                    assert.same(this.clock.Date.toSource(), Date.toSource());
                });
            });
        } else {
            describe("unsupported toSource", function() {
                it("is undefined", function() {
                    assert.isUndefined(this.clock.Date.toSource);
                });
            });
        }

        it("mirrors toString", function() {
            assert.same(this.clock.Date.toString(), Date.toString());
        });
    });

    describe("stubTimers", function() {
        beforeEach(function() {
            this.dateNow = global.Date.now;
        });

        afterEach(function() {
            if (this.clock) {
                this.clock.uninstall();
            }

            clearTimeout(this.timer);
            if (this.dateNow === undefined) {
                delete global.Date.now;
            } else {
                global.Date.now = this.dateNow;
            }
        });

        it("returns clock object", function() {
            this.clock = lolex.install();

            assert.isObject(this.clock);
            assert.isFunction(this.clock.tick);
        });

        it("has clock property", function() {
            this.clock = lolex.install();

            assert.same(setTimeout.clock, this.clock);
            assert.same(clearTimeout.clock, this.clock);
            assert.same(setInterval.clock, this.clock);
            assert.same(clearInterval.clock, this.clock);
            assert.same(Date.clock, this.clock);
        });

        it("takes an object parameter", function() {
            this.clock = lolex.install({});
        });

        it("throws a TypeError on a number parameter", function() {
            assert.exception(function() {
                this.clock = lolex.install(0);
            });
        });

        it("sets initial timestamp", function() {
            this.clock = lolex.install({ now: 1400 });

            assert.equals(this.clock.now, 1400);
        });

        it("replaces global setTimeout", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();

            setTimeout(stub, 1000);
            this.clock.tick(1000);

            assert(stub.called);
        });

        it("global fake setTimeout should return id", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();

            var to = setTimeout(stub, 1000);

            if (typeof setTimeout(NOOP, 0) === "object") {
                assert.isNumber(to.id);
                assert.isFunction(to.ref);
                assert.isFunction(to.unref);
            } else {
                assert.isNumber(to);
            }
        });

        it("global fake setTimeout().ref() should return timer", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();

            if (typeof setTimeout(NOOP, 0) === "object") {
                var to = setTimeout(stub, 1000).ref();
                assert.isNumber(to.id);
                assert.isFunction(to.ref);
                assert.isFunction(to.unref);
            }
        });

        it("global fake setTimeout().unref() should return timer", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();

            if (typeof setTimeout(NOOP, 0) === "object") {
                var to = setTimeout(stub, 1000).unref();
                assert.isNumber(to.id);
                assert.isFunction(to.ref);
                assert.isFunction(to.unref);
            }
        });

        it("global fake setTimeout().refresh() should return timer", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();

            if (typeof setTimeout(NOOP, 0) === "object") {
                var to = setTimeout(stub, 1000).refresh();
                assert.isNumber(to.id);
                assert.isFunction(to.ref);
                assert.isFunction(to.refresh);
            }
        });

        it("replaces global clearTimeout", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();

            clearTimeout(setTimeout(stub, 1000));
            this.clock.tick(1000);

            assert.isFalse(stub.called);
        });

        it("uninstalls global setTimeout", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();
            this.clock.uninstall();

            this.timer = setTimeout(stub, 1000);
            this.clock.tick(1000);

            assert.isFalse(stub.called);
            assert.same(setTimeout, lolex.timers.setTimeout);
        });

        it("uninstalls global clearTimeout", function() {
            this.clock = lolex.install();
            sinon.stub();
            this.clock.uninstall();

            assert.same(clearTimeout, lolex.timers.clearTimeout);
        });

        it("replaces global setInterval", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();

            setInterval(stub, 500);
            this.clock.tick(1000);

            assert(stub.calledTwice);
        });

        it("replaces global clearInterval", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();

            clearInterval(setInterval(stub, 500));
            this.clock.tick(1000);

            assert.isFalse(stub.called);
        });

        it("uninstalls global setInterval", function() {
            this.clock = lolex.install();
            var stub = sinon.stub();
            this.clock.uninstall();

            this.timer = setInterval(stub, 1000);
            this.clock.tick(1000);

            assert.isFalse(stub.called);
            assert.same(setInterval, lolex.timers.setInterval);
        });

        it("uninstalls global clearInterval", function() {
            this.clock = lolex.install();
            sinon.stub();
            this.clock.uninstall();

            assert.same(clearInterval, lolex.timers.clearInterval);
        });

        if (hrtimePresent) {
            it("replaces global process.hrtime", function() {
                this.clock = lolex.install();
                var prev = process.hrtime();
                this.clock.tick(1000);
                var result = process.hrtime(prev);
                assert.same(result[0], 1);
                assert.same(result[1], 0);
            });

            it("uninstalls global process.hrtime", function() {
                this.clock = lolex.install();
                this.clock.uninstall();
                assert.same(process.hrtime, lolex.timers.hrtime);
                var prev = process.hrtime();
                this.clock.tick(1000);
                var result = process.hrtime(prev);
                assert.same(result[0], 0);
            });
        }

        if (performanceNowPresent) {
            it("replaces global performance.now", function() {
                this.clock = lolex.install();
                var prev = performance.now();
                this.clock.tick(1000);
                var next = performance.now();
                assert.same(next, 1000);
                assert.same(prev, 0);
            });

            it("uninstalls global performance.now", function() {
                var oldNow = performance.now;
                this.clock = lolex.install();
                assert.same(performance.now, this.clock.performance.now);
                this.clock.uninstall();
                assert.same(performance.now, oldNow);
            });

            /* For instance, Safari 9 has performance.now(), but no performance.mark() */
            if (performanceMarkPresent) {
                it("should let performance.mark still be callable after lolex.install() (#136)", function() {
                    this.clock = lolex.install();
                    refute.exception(function() {
                        global.performance.mark("a name");
                    });
                });
            }

            it("should not alter the global performance properties and methods", function() {
                // In Phantom.js environment, Performance.prototype has only "now" method.
                // For testing, some stub functions need to be assigned.
                Performance.prototype.someFunc1 = function() {};
                Performance.prototype.someFunc2 = function() {};
                Performance.prototype.someFunc3 = function() {};

                this.clock = lolex.install();

                assert.isFunction(performance.someFunc1);
                assert.isFunction(performance.someFunc2);
                assert.isFunction(performance.someFunc3);

                this.clock.uninstall();

                delete Performance.prototype.someFunc1;
                delete Performance.prototype.someFunc2;
                delete Performance.prototype.someFunc3;
            });

            it("should replace the getEntries, getEntriesByX methods with noops that return []", function() {
                function noop() {
                    return ["foo"];
                }

                Performance.prototype.getEntries = noop;
                Performance.prototype.getEntriesByName = noop;
                Performance.prototype.getEntriesByType = noop;

                this.clock = lolex.install();

                assert.equals(performance.getEntries(), []);
                assert.equals(performance.getEntriesByName(), []);
                assert.equals(performance.getEntriesByType(), []);

                this.clock.uninstall();

                assert.equals(performance.getEntries(), ["foo"]);
                assert.equals(performance.getEntriesByName(), ["foo"]);
                assert.equals(performance.getEntriesByType(), ["foo"]);

                delete Performance.prototype.getEntries;
                delete Performance.prototype.getEntriesByName;
                delete Performance.prototype.getEntriesByTime;
            });
        }

        if (Object.getPrototypeOf(global)) {
            delete global.hasOwnPropertyTest;
            Object.getPrototypeOf(global).hasOwnPropertyTest = function() {};

            if (!global.hasOwnProperty("hasOwnPropertyTest")) {
                it("deletes global property on uninstall if it was inherited onto the global object", function() {
                    // Give the global object an inherited 'tick' method
                    delete global.tick;
                    Object.getPrototypeOf(global).tick = function() {};

                    this.clock = lolex.install({ now: 0, toFake: ["tick"] });
                    assert.isTrue(global.hasOwnProperty("tick"));
                    this.clock.uninstall();

                    assert.isFalse(global.hasOwnProperty("tick"));
                    delete Object.getPrototypeOf(global).tick;
                });
            }

            delete Object.getPrototypeOf(global).hasOwnPropertyTest;
        }

        it("uninstalls global property on uninstall if it is present on the global object itself", function() {
            // Directly give the global object a tick method
            global.tick = NOOP;

            this.clock = lolex.install({ now: 0, toFake: ["tick"] });
            assert.isTrue(global.hasOwnProperty("tick"));
            this.clock.uninstall();

            assert.isTrue(global.hasOwnProperty("tick"));
            delete global.tick;
        });

        it("fakes Date constructor", function() {
            this.clock = lolex.install({ now: 0 });
            var now = new Date();

            refute.same(Date, lolex.timers.Date);
            assert.equals(now.getTime(), 0);
        });

        it("fake Date constructor should mirror Date's properties", function() {
            this.clock = lolex.install({ now: 0 });

            assert(Boolean(Date.parse));
            assert(Boolean(Date.UTC));
        });

        it("decide on Date.now support at call-time when supported", function() {
            global.Date.now = NOOP;
            this.clock = lolex.install({ now: 0 });

            assert.equals(typeof Date.now, "function");
        });

        it("decide on Date.now support at call-time when unsupported", function() {
            global.Date.now = undefined;
            this.clock = lolex.install({ now: 0 });

            assert.isUndefined(Date.now);
        });

        it("mirrors custom Date properties", function() {
            var f = function() {
                return "";
            };
            global.Date.format = f;
            this.clock = lolex.install();

            assert.equals(Date.format, f);
        });

        it("uninstalls Date constructor", function() {
            this.clock = lolex.install({ now: 0 });
            this.clock.uninstall();

            assert.same(GlobalDate, lolex.timers.Date);
        });

        it("fakes provided methods", function() {
            this.clock = lolex.install({
                now: 0,
                toFake: ["setTimeout", "Date"]
            });

            refute.same(setTimeout, lolex.timers.setTimeout);
            refute.same(Date, lolex.timers.Date);
        });

        it("resets faked methods", function() {
            this.clock = lolex.install({
                now: 0,
                toFake: ["setTimeout", "Date"]
            });
            this.clock.uninstall();

            assert.same(setTimeout, lolex.timers.setTimeout);
            assert.same(Date, lolex.timers.Date);
        });

        it("does not fake methods not provided", function() {
            this.clock = lolex.install({
                now: 0,
                toFake: ["setTimeout", "Date"]
            });

            assert.same(clearTimeout, lolex.timers.clearTimeout);
            assert.same(setInterval, lolex.timers.setInterval);
            assert.same(clearInterval, lolex.timers.clearInterval);
        });
    });

    describe("shouldAdvanceTime", function() {
        it("should create an auto advancing timer", function(done) {
            var testDelay = 29;
            var date = new Date("2015-09-25");
            var clock = lolex.install({ now: date, shouldAdvanceTime: true });
            assert.same(Date.now(), 1443139200000);
            var timeoutStarted = Date.now();

            setTimeout(function() {
                var timeDifference = Date.now() - timeoutStarted;
                assert.same(timeDifference, testDelay);
                clock.uninstall();
                done();
            }, testDelay);
        });

        it("should test setImmediate", function(done) {
            if (!setImmediatePresent) {
                this.skip();
            }

            var date = new Date("2015-09-25");
            var clock = lolex.install({ now: date, shouldAdvanceTime: true });
            assert.same(Date.now(), 1443139200000);
            var timeoutStarted = Date.now();

            setImmediate(function() {
                var timeDifference = Date.now() - timeoutStarted;
                assert.same(timeDifference, 0);
                clock.uninstall();
                done();
            });
        });

        it("should test setInterval", function(done) {
            var interval = 20;
            var intervalsTriggered = 0;
            var cyclesToTrigger = 3;
            var date = new Date("2015-09-25");
            var clock = lolex.install({ now: date, shouldAdvanceTime: true });
            assert.same(Date.now(), 1443139200000);
            var timeoutStarted = Date.now();

            var intervalId = setInterval(function() {
                if (++intervalsTriggered === cyclesToTrigger) {
                    clearInterval(intervalId);
                    var timeDifference = Date.now() - timeoutStarted;
                    assert.same(timeDifference, interval * cyclesToTrigger);
                    clock.uninstall();
                    done();
                }
            }, interval);
        });
    });

    describe("requestAnimationFrame", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("throws if no arguments", function() {
            var clock = this.clock;

            assert.exception(function() {
                clock.requestAnimationFrame();
            });
        });

        it("returns numeric id or object with numeric id", function() {
            var result = this.clock.requestAnimationFrame(NOOP);

            assert.isNumber(result);
        });

        it("returns unique id", function() {
            var id1 = this.clock.requestAnimationFrame(NOOP);
            var id2 = this.clock.requestAnimationFrame(NOOP);

            refute.equals(id2, id1);
        });

        it("should run every 16ms", function() {
            var stub = sinon.stub();
            this.clock.requestAnimationFrame(stub);
            this.clock.tick(15);

            assert.equals(0, stub.callCount);

            this.clock.tick(1);

            assert.equals(1, stub.callCount);
        });

        it("should be called with current time", function() {
            var stub = sinon.stub();
            this.clock.requestAnimationFrame(stub);
            this.clock.tick(16);

            assert(stub.calledWith(16));
        });

        it("should call callback once", function() {
            var stub = sinon.stub();
            this.clock.requestAnimationFrame(stub);
            this.clock.tick(32);

            assert.equals(stub.callCount, 1);
        });

        it("should schedule two callbacks before the next frame at the same time", function() {
            var stub1 = sinon.stub();
            var stub2 = sinon.stub();

            this.clock.requestAnimationFrame(stub1);

            this.clock.tick(5);

            this.clock.requestAnimationFrame(stub2);

            this.clock.tick(11);

            assert(stub1.calledWith(16));
            assert(stub2.calledWith(16));
        });

        it("should properly schedule callback for 3rd frame", function() {
            var stub1 = sinon.stub();
            var stub2 = sinon.stub();

            this.clock.requestAnimationFrame(stub1);

            this.clock.tick(57);

            this.clock.requestAnimationFrame(stub2);

            this.clock.tick(10);

            assert(stub1.calledWith(16));
            assert(stub2.calledWith(64));
        });

        it("should schedule for next frame if on current frame", function() {
            var stub = sinon.stub();
            this.clock.tick(16);
            this.clock.requestAnimationFrame(stub);
            this.clock.tick(16);

            assert(stub.calledWith(32));
        });
    });

    describe("cancelAnimationFrame", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("removes animation frame", function() {
            var stub = sinon.stub();
            var id = this.clock.requestAnimationFrame(stub);
            this.clock.cancelAnimationFrame(id);
            this.clock.tick(16);

            assert.isFalse(stub.called);
        });

        it("does not remove timeout", function() {
            var stub = sinon.stub();
            var id = this.clock.setTimeout(stub, 50);
            assert.exception(
                function() {
                    this.clock.cancelAnimationFrame(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setTimeout() but cleared with cancelAnimationFrame()"
                }
            );
            this.clock.tick(50);

            assert.isTrue(stub.called);
        });

        it("does not remove interval", function() {
            var stub = sinon.stub();
            var id = this.clock.setInterval(stub, 50);
            assert.exception(
                function() {
                    this.clock.cancelAnimationFrame(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setInterval() but cleared with cancelAnimationFrame()"
                }
            );
            this.clock.tick(50);

            assert.isTrue(stub.called);
        });

        it("does not remove immediate", function() {
            if (!setImmediatePresent) {
                this.skip();
            }

            var stub = sinon.stub();
            var id = this.clock.setImmediate(stub);
            assert.exception(
                function() {
                    this.clock.cancelAnimationFrame(id);
                }.bind(this),
                {
                    message:
                        "Cannot clear timer: timer created with setImmediate() but cleared with cancelAnimationFrame()"
                }
            );
            this.clock.tick(50);

            assert.isTrue(stub.called);
        });

        it("ignores null argument", function() {
            this.clock.cancelAnimationFrame(null);
            assert(true); // doesn't fail
        });
    });

    describe("runToFrame", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("should tick next frame", function() {
            this.clock.runToFrame();

            assert.equals(this.clock.now, 16);

            this.clock.tick(3);
            this.clock.runToFrame();

            assert.equals(this.clock.now, 32);
        });
    });

    describe("performance.now()", function() {
        before(function() {
            if (!performanceNowPresent) {
                this.skip();
            }
        });

        it("should start at 0", function() {
            var clock = lolex.createClock(1001);
            var result = clock.performance.now();
            assert.same(result, 0);
        });

        it("should run along with clock.tick", function() {
            var clock = lolex.createClock(0);
            clock.tick(5001);
            var result = clock.performance.now();
            assert.same(result, 5001);
        });

        it("should listen to multiple ticks in performance.now", function() {
            var clock = lolex.createClock(0);
            for (var i = 0; i < 10; i++) {
                var next = clock.performance.now();
                assert.same(next, 1000 * i);
                clock.tick(1000);
            }
        });

        it("should run with ticks with timers set", function() {
            var clock = lolex.createClock(0);
            clock.setTimeout(function() {
                var result = clock.performance.now();
                assert.same(result, 2500);
            }, 2500);
            clock.tick(5000);
        });
    });

    describe("process.hrtime()", function() {
        before(function() {
            if (!hrtimePresent) {
                this.skip();
            }
        });

        afterEach(function() {
            if (this.clock) {
                this.clock.uninstall();
            }
        });

        it("should start at 0", function() {
            var clock = lolex.createClock(1001);
            var result = clock.hrtime();
            assert.same(result[0], 0);
            assert.same(result[1], 0);
        });

        it("should run along with clock.tick", function() {
            var clock = lolex.createClock(0);
            clock.tick(5001);
            var prev = clock.hrtime();
            clock.tick(5001);
            var result = clock.hrtime(prev);
            assert.same(result[0], 5);
            assert.same(result[1], 1000000);
        });

        it("should run along with clock.tick when timers set", function() {
            var clock = lolex.createClock(0);
            var prev = clock.hrtime();
            clock.setTimeout(function() {
                var result = clock.hrtime(prev);
                assert.same(result[0], 2);
                assert.same(result[1], 500000000);
            }, 2500);
            clock.tick(5000);
        });

        it("should not move with setSystemTime", function() {
            var clock = lolex.createClock(0);
            var prev = clock.hrtime();
            clock.setSystemTime(9000);
            clock.setSystemTime(50000);
            var result = clock.hrtime(prev);
            assert.same(result[0], 0);
            assert.same(result[1], 0);
        });

        it("should move with timeouts", function() {
            var clock = lolex.createClock();
            var result = clock.hrtime();
            assert.same(result[0], 0);
            assert.same(result[1], 0);
            clock.setTimeout(function() {}, 1000);
            clock.runAll();
            result = clock.hrtime();
            assert.same(result[0], 1);
            assert.same(result[1], 0);
        });

        it("should handle floating point", function() {
            var clock = lolex.createClock();
            clock.tick(1022.7791);
            var result = clock.hrtime([0, 20000000]);

            assert.equals(result, [1, 2779100]);
        });
    });

    describe("process.hrtime.bigint()", function() {
        before(function() {
            if (!hrtimeBigintPresent) {
                this.skip();
            }
        });

        afterEach(function() {
            if (this.clock) {
                this.clock.uninstall();
            }
        });

        it("should start at 0n", function() {
            var clock = lolex.createClock(1001);
            var result = clock.hrtime.bigint();
            assert.same(result, BigInt(0)); // eslint-disable-line
        });

        it("should run along with clock.tick", function() {
            var clock = lolex.createClock(0);
            clock.tick(5001);
            var result = clock.hrtime.bigint();
            assert.same(result, BigInt(5.001e9)); // eslint-disable-line
        });

        it("should run along with clock.tick when timers set", function() {
            var clock = lolex.createClock(0);
            clock.setTimeout(function() {
                var result = clock.hrtime.bigint();
                assert.same(result, BigInt(2.5e9)); // eslint-disable-line
            }, 2500);
            clock.tick(5000);
        });

        it("should not move with setSystemTime", function() {
            var clock = lolex.createClock(0);
            clock.setSystemTime(50000);
            var result = clock.hrtime.bigint();
            assert.same(result, BigInt(0)); // eslint-disable-line
        });

        it("should move with timeouts", function() {
            var clock = lolex.createClock();
            var result = clock.hrtime.bigint();
            assert.same(result, BigInt(0)); // eslint-disable-line
            clock.setTimeout(function() {}, 1000);
            clock.runAll();
            result = clock.hrtime.bigint();
            assert.same(result, BigInt(1e9)); // eslint-disable-line
        });
    });

    describe("queueMicrotask semantics", function() {
        // adapted from Node's tests
        var clock, called;
        before(function() {
            if (!queueMicrotaskPresent) {
                this.skip();
            }
        });
        beforeEach(function() {
            clock = lolex.createClock();
            called = false;
        });
        it("runs without timers", function() {
            clock.queueMicrotask(function() {
                called = true;
            });
            clock.runAll();
            assert(called);
        });
        it("runs when runMicrotasks is called on the clock", function() {
            clock.queueMicrotask(function() {
                called = true;
            });
            clock.runMicrotasks();
            assert(called);
        });
        it("runs with timers and before them", function() {
            var last = "";
            clock.queueMicrotask(function() {
                called = true;
                last = "tick";
            });
            clock.setTimeout(function() {
                last = "timeout";
            });
            clock.runAll();
            assert(called);
            assert.equals(last, "timeout");
        });
    });

    describe("nextTick semantics", function() {
        before(function() {
            if (!nextTickPresent) {
                this.skip();
            }
        });

        it("runs without timers", function() {
            var clock = lolex.createClock();
            var called = false;
            clock.nextTick(function() {
                called = true;
            });
            clock.runAll();
            assert(called);
        });

        it("runs when runMicrotasks is called on the clock", function() {
            var clock = lolex.createClock();
            var called = false;
            clock.nextTick(function() {
                called = true;
            });
            clock.runMicrotasks();
            assert(called);
        });

        it("respects loopLimit from below in runMicrotasks", function() {
            var clock = lolex.createClock(0, 100);
            var i;

            for (i = 0; i < 99; i++) {
                // eslint-disable-next-line no-loop-func,ie11/no-loop-func
                clock.nextTick(function() {
                    i--;
                });
            }
            clock.runMicrotasks();
            assert.equals(i, 0);
        });

        it("respects loopLimit from above in runMicrotasks", function() {
            var clock = lolex.createClock(0, 100);
            for (var i = 0; i < 120; i++) {
                // eslint-disable-next-line ie11/no-loop-func
                clock.nextTick(function() {});
            }
            assert.exception(function() {
                clock.runMicrotasks();
            });
        });

        it("detects infinite nextTick cycles", function() {
            var clock = lolex.createClock(0, 1000);
            clock.nextTick(function repeat() {
                clock.nextTick(repeat);
            });
            assert.exception(function() {
                clock.runMicrotasks();
            });
        });

        it("runs with timers - and before them", function() {
            var clock = lolex.createClock();
            var last = "";
            var called = false;
            clock.nextTick(function() {
                called = true;
                last = "tick";
            });
            clock.setTimeout(function() {
                last = "timeout";
            });
            clock.runAll();
            assert(called);
            assert.equals(last, "timeout");
        });

        it("runs when time is progressed", function() {
            var clock = lolex.createClock();
            var called = false;
            clock.nextTick(function() {
                called = true;
            });
            assert(!called);
            clock.tick(0);
            assert(called);
        });

        it("runs between timers", function() {
            var clock = lolex.createClock();
            var order = [];
            clock.setTimeout(function() {
                order.push("timer-1");
                clock.nextTick(function() {
                    order.push("tick");
                });
            });

            clock.setTimeout(function() {
                order.push("timer-2");
            });
            clock.runAll();
            assert.same(order[0], "timer-1");
            assert.same(order[1], "tick");
            assert.same(order[2], "timer-2");
        });

        it("installs with microticks", function() {
            var clock = lolex.install({ toFake: ["nextTick"] });
            var called = false;
            process.nextTick(function() {
                called = true;
            });
            clock.runAll();
            assert(called);
            clock.uninstall();
        });

        it("installs with microticks and timers in order", function() {
            var clock = lolex.install({ toFake: ["nextTick", "setTimeout"] });
            var order = [];
            setTimeout(function() {
                order.push("timer-1");
                process.nextTick(function() {
                    order.push("tick");
                });
            });
            setTimeout(function() {
                order.push("timer-2");
            });
            clock.runAll();
            assert.same(order[0], "timer-1");
            assert.same(order[1], "tick");
            assert.same(order[2], "timer-2");
            clock.uninstall();
        });

        it("uninstalls", function() {
            var clock = lolex.install({ toFake: ["nextTick"] });
            clock.uninstall();
            var called = false;
            process.nextTick(function() {
                called = true;
            });
            clock.runAll();
            assert(!called);
        });

        it("returns an empty list of timers on immediate uninstall", function() {
            var clock = lolex.install();
            var timers = clock.uninstall();
            assert.equals(timers, []);
        });

        it("returns a timer if uninstalling before it's called", function() {
            var clock = lolex.install();
            clock.setTimeout(function() {}, 100);
            var timers = clock.uninstall();
            assert.equals(timers.length, 1);
            assert.equals(timers[0].createdAt, clock.now);
            assert.equals(timers[0].callAt, clock.now + 100);
            assert(typeof timers[0].id !== "undefined");
        });

        it("does not return already executed timers on uninstall", function() {
            var clock = lolex.install();
            clock.setTimeout(function() {}, 100);
            clock.setTimeout(function() {}, 200);
            clock.tick(100);
            var timers = clock.uninstall();
            assert.equals(timers.length, 1);
            assert.equals(timers[0].createdAt, clock.now - 100);
            assert.equals(timers[0].callAt, clock.now + 100);
            assert(typeof timers[0].id !== "undefined");
        });

        it("returns multiple timers on uninstall if created", function() {
            var clock = lolex.install();
            var i;

            for (i = 0; i < 5; i++) {
                // yes, it's silly to create a function in a loop. This is a test, we can live with it
                // eslint-disable-next-line ie11/no-loop-func
                clock.setTimeout(function() {}, 100 * i);
            }
            var timers = clock.uninstall();
            assert.equals(timers.length, 5);
            for (i = 0; i < 5; i++) {
                assert.equals(timers[i].createdAt, clock.now);
                assert.equals(timers[i].callAt, clock.now + 100 * i);
            }
            assert(typeof timers[0].id !== "undefined");
        });

        it("passes arguments when installed - GitHub#122", function() {
            var clock = lolex.install({ toFake: ["nextTick"] });
            var called = false;
            process.nextTick(function(value) {
                called = value;
            }, true);
            clock.runAll();
            assert(called);
            clock.uninstall();
        });

        it("does not install by default - GitHub#126", function(done) {
            var clock = lolex.install();
            var spy = sinon.spy(clock, "nextTick");
            var called = false;
            process.nextTick(function(value) {
                called = value;
                assert(called);
                assert(!spy.called);
                clock.uninstall();
                done();
            }, true);
        });
    });

    describe("requestIdleCallback", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("throws if no arguments", function() {
            var clock = this.clock;

            assert.exception(function() {
                clock.requestIdleCallback();
            });
        });

        it("returns numeric id", function() {
            var result = this.clock.requestIdleCallback(NOOP);

            assert.isNumber(result);
        });

        it("returns unique id", function() {
            var id1 = this.clock.requestIdleCallback(NOOP);
            var id2 = this.clock.requestIdleCallback(NOOP);
            this.clock.runAll();

            refute.equals(id2, id1);
        });

        it("runs after all timers", function() {
            var spy = sinon.spy();
            this.clock.requestIdleCallback(spy);
            this.clock.runAll();

            assert(spy.called);
        });

        it("runs immediately with timeout option if there isn't any timer", function() {
            var spy = sinon.spy();
            this.clock.requestIdleCallback(spy, 20);
            this.clock.tick(1);

            assert(spy.called);
        });

        it("runs no later than timeout option even if there are any timers", function() {
            var spy = sinon.spy();
            this.clock.setTimeout(NOOP, 10);
            this.clock.setTimeout(NOOP, 30);
            this.clock.requestIdleCallback(spy, 20);
            this.clock.tick(20);

            assert(spy.called);
        });

        it("doesn't runs if there are any timers and no timeout option", function() {
            var spy = sinon.spy();
            this.clock.setTimeout(NOOP, 30);
            this.clock.requestIdleCallback(spy);
            this.clock.tick(35);

            assert.isFalse(spy.called);
        });
    });

    describe("cancelIdleCallback", function() {
        beforeEach(function() {
            this.clock = lolex.createClock();
        });

        it("removes idle callback", function() {
            var stub = sinon.stub();
            var callbackId = this.clock.requestIdleCallback(stub, 0);
            this.clock.cancelIdleCallback(callbackId);
            this.clock.runAll();

            assert.isFalse(stub.called);
        });
    });
});
