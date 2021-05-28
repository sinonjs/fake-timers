/*
 * The sole purpose of this file is to expose consumer-side issues
 * with our exported definition files
 */
import * as FakeTimers from "../src/fake-timers-src";

// #382
FakeTimers.install({ now: 1 });
