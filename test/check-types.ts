/*
 * The sole purpose of this file is to expose consumer-side issues
 * with our exported definition files
 */
import * as FakeTimers from "../src/fake-timers-src";

// install()
FakeTimers.install();
FakeTimers.install({
    shouldAdvanceTime: true,
    advanceTimeDelta: 40,
});
// #382
FakeTimers.install({ now: 1 });

// createClock()
const clock1 = FakeTimers.createClock(1);
FakeTimers.createClock(new Date());
FakeTimers.createClock();
FakeTimers.createClock(new Date(), 10);
clock1.uninstall();

// timers
FakeTimers.timers.setInterval(
    () => {
        return 42;
    },
    10,
    1,
    2,
    3,
    4
);

// withContext
const clock2 = FakeTimers.withGlobal({}).install();
clock2.uninstall();

// clock.*
clock1.runToLast();
async () => await clock1.runToLastAsync();
clock1.runToFrame();
clock1.setInterval((myArg) => myArg, 42, 100000);
