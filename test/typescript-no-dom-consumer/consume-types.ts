import FakeTimers from "@sinonjs/fake-timers";

declare global {
    class AbortSignal {}
}

const timers = FakeTimers.timers;

if (timers.performance) {
    const now: number = timers.performance.now();
    now.toFixed();
}

// @ts-expect-error DOM globals should not be available in this consumer.
const windowRef: Window = {};
windowRef;
