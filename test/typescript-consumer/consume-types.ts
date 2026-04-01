import FakeTimers from "@sinonjs/fake-timers";

const clock = FakeTimers.createClock();
clock.tick(10);
clock.tickAsync(10).then((now: number) => console.log(now));

const installedClock = FakeTimers.install({
    now: new Date(),
    toFake: ["setTimeout", "clearTimeout"],
    loopLimit: 100
});

const id = installedClock.setTimeout(() => {}, 10);
installedClock.clearTimeout(id);

installedClock.setTickMode({ mode: "nextAsync" });
installedClock.setTickMode({ mode: "manual" });
installedClock.setTickMode({ mode: "interval", delta: 50 });

installedClock.uninstall();

const withGlobal = FakeTimers.withGlobal({});
const anotherClock = withGlobal.createClock(1000);
anotherClock.next();
anotherClock.nextAsync().then((now: number) => console.log(now));

anotherClock.runAll();
anotherClock.runAllAsync().then((now: number) => console.log(now));

anotherClock.runToFrame();
anotherClock.runToLast();
anotherClock.runToLastAsync().then((now: number) => console.log(now));

anotherClock.reset();
anotherClock.setSystemTime(new Date());
anotherClock.jump(500);

const now: number = anotherClock.performance.now();
const hr: number[] = anotherClock.hrtime([1, 1]);

anotherClock.countTimers();
anotherClock.runMicrotasks();
anotherClock.cancelIdleCallback(anotherClock.requestIdleCallback(() => {}));
anotherClock.cancelAnimationFrame(anotherClock.requestAnimationFrame(() => {}));
anotherClock.clearImmediate(anotherClock.setImmediate(() => {}));
const intervalId = anotherClock.setInterval(() => {}, 10);
anotherClock.clearInterval(intervalId);

const timers = withGlobal.timers;
timers.setTimeout(() => {}, 10);
timers.clearTimeout(1);
timers.setInterval(() => {}, 10);
timers.clearInterval(1);
if (timers.setImmediate) {
    const immediateId = timers.setImmediate(() => {});
    if (timers.clearImmediate) {
        timers.clearImmediate(immediateId);
    }
}
if (timers.hrtime) {
    timers.hrtime([1, 1]);
}
if (timers.nextTick) {
    timers.nextTick(() => {});
}
if (timers.performance) {
    timers.performance.now();
}
if (timers.requestAnimationFrame) {
    const rafId = timers.requestAnimationFrame(() => {});
    if (timers.cancelAnimationFrame) {
        timers.cancelAnimationFrame(rafId);
    }
}
if (timers.requestIdleCallback) {
    const ricId = timers.requestIdleCallback(() => {});
    if (timers.cancelIdleCallback) {
        timers.cancelIdleCallback(ricId);
    }
}
if (timers.queueMicrotask) {
    timers.queueMicrotask(() => {}); 
}
