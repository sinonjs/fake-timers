export type TickMode = "nextAsync" | "manual" | "interval";
export type NextAsyncTickMode = {
    mode: "nextAsync";
};
export type ManualTickMode = {
    mode: "manual";
};
export type IntervalTickMode = {
    mode: "interval";
    delta?: number;
};
export type TimerTickMode = IntervalTickMode | NextAsyncTickMode | ManualTickMode;
export type TimeRemaining = () => number;
export type IdleDeadline = {
    didTimeout: boolean;
    timeRemaining: TimeRemaining;
};
export type RequestIdleCallbackCallback = (deadline: IdleDeadline) => any;
export type RequestIdleCallback = (callback: RequestIdleCallbackCallback, options?: {
    timeout: number;
}) => number;
export type FakeMethod = "setTimeout" | "clearTimeout" | "setImmediate" | "clearImmediate" | "setInterval" | "clearInterval" | "Date" | "nextTick" | "hrtime" | "requestAnimationFrame" | "cancelAnimationFrame" | "requestIdleCallback" | "cancelIdleCallback" | "performance" | "queueMicrotask";
export type TimerId = number | NodeImmediate | Timer;
export type NextTick = (callback: VoidVarArgsFunc, ...args: any) => void;
export type SetImmediate = (callback: VoidVarArgsFunc, ...args: any) => NodeImmediate;
export type SetTimeout = (callback: VoidVarArgsFunc, delay?: number, ...args: any) => TimerId;
export type ClearTimeout = (id?: TimerId) => void;
export type SetInterval = (callback: VoidVarArgsFunc, delay?: number, ...args: any) => TimerId;
export type ClearInterval = (id?: TimerId) => void;
export type QueueMicrotask = (callback: VoidVarArgsFunc) => void;
export type VoidVarArgsFunc = (...args: any) => void;
export type PerformanceNow = () => number;
export type Performance = {
    now: PerformanceNow;
    mark?: (name: string) => void;
    measure?: (name: string, start?: string, end?: string) => void;
    timeOrigin?: number;
};
export type AnimationFrameCallback = (time: number) => void;
export type RequestAnimationFrame = (callback: AnimationFrameCallback) => TimerId;
export type CancelAnimationFrame = (id: TimerId) => void;
export type CancelIdleCallback = (id: TimerId) => void;
export type ClearImmediate = (id: NodeImmediate) => void;
export type CountTimers = () => number;
export type RunMicrotasks = () => void;
export type Tick = (tickValue: string | number) => number;
export type TickAsync = (tickValue: string | number) => Promise<number>;
export type Next = () => number;
export type NextAsync = () => Promise<number>;
export type RunAll = () => number;
export type RunToFrame = () => number;
export type RunAllAsync = () => Promise<number>;
export type RunToLast = () => number;
export type RunToLastAsync = () => Promise<number>;
export type Reset = () => void;
export type SetSystemTime = (systemTime?: number | Date) => void;
export type Jump = (ms: number) => number;
export type Uninstall = () => void;
export type SetTickMode = (mode: TimerTickMode) => void;
export type Hrtime = (prevTime?: number[]) => number[];
export type WithGlobal = (globalObject: any) => FakeTimers;
export type Timers = {
    setTimeout: SetTimeout;
    clearTimeout: ClearTimeout;
    setInterval: SetInterval;
    clearInterval: ClearInterval;
    Date: Date;
    Intl?: typeof Intl;
    setImmediate?: SetImmediate;
    clearImmediate?: ClearImmediate;
    hrtime?: Hrtime;
    nextTick?: NextTick;
    performance?: Performance;
    requestAnimationFrame?: RequestAnimationFrame;
    queueMicrotask?: QueueMicrotask;
    cancelAnimationFrame?: CancelAnimationFrame;
    requestIdleCallback?: RequestIdleCallback;
    cancelIdleCallback?: CancelIdleCallback;
};
export type ClockState = {
    tickFrom: number;
    tickTo: number;
    previous?: number;
    oldNow?: number | null;
    timer?: Timer;
    firstException?: any;
    nanosTotal?: number;
    msFloat?: number;
    ms?: number;
};
export type TimerInitialProps = {
    func: VoidVarArgsFunc;
    args?: any[];
    type?: 'Timeout' | 'Interval' | 'Immediate' | 'AnimationFrame' | 'IdleCallback';
    delay?: number;
    callAt?: number;
    createdAt?: number;
    immediate?: boolean;
    id?: number;
    error?: Error;
    interval?: number;
    animation?: boolean;
    requestIdleCallback?: boolean;
    order?: number;
    heapIndex?: number;
};
export type CreateClockCallback = (start?: number | Date, loopLimit?: number) => Clock;
export type InstallCallback = (config?: Config) => Clock;
export type FakeTimers = {
    timers: Timers;
    createClock: CreateClockCallback;
    install: InstallCallback;
    withGlobal: WithGlobal;
};
export type Clock = {
    now: number;
    Date: typeof Date & {
        clock?: Clock;
    };
    loopLimit: number;
    requestIdleCallback: RequestIdleCallback;
    cancelIdleCallback: CancelIdleCallback;
    setTimeout: SetTimeout;
    clearTimeout: ClearTimeout;
    nextTick: NextTick;
    queueMicrotask: QueueMicrotask;
    setInterval: SetInterval;
    clearInterval: ClearInterval;
    setImmediate: SetImmediate;
    clearImmediate: ClearImmediate;
    countTimers: CountTimers;
    requestAnimationFrame: RequestAnimationFrame;
    cancelAnimationFrame: CancelAnimationFrame;
    runMicrotasks: RunMicrotasks;
    tick: Tick;
    tickAsync: TickAsync;
    next: Next;
    nextAsync: NextAsync;
    runAll: RunAll;
    runToFrame: RunToFrame;
    runAllAsync: RunAllAsync;
    runToLast: RunToLast;
    runToLastAsync: RunToLastAsync;
    reset: Reset;
    setSystemTime: SetSystemTime;
    jump: Jump;
    performance: Performance;
    hrtime: Hrtime;
    uninstall: Uninstall;
    methods: string[];
    shouldClearNativeTimers?: boolean;
    timersModuleMethods: {
        methodName: string;
        original: any;
    }[] | undefined;
    timersPromisesModuleMethods: {
        methodName: string;
        original: any;
    }[] | undefined;
    abortListenerMap: Map<VoidVarArgsFunc, AbortSignal>;
    setTickMode: SetTickMode;
    timers?: Map<number, Timer>;
    timerHeap?: any;
    duringTick?: boolean;
    isNearInfiniteLimit: boolean;
    attachedInterval?: any;
    tickMode?: any;
    jobs?: Timer[];
    Intl?: any;
};
export type Config = {
    now?: number | Date;
    toFake?: FakeMethod[];
    toNotFake?: FakeMethod[];
    loopLimit?: number;
    shouldAdvanceTime?: boolean;
    advanceTimeDelta?: number;
    shouldClearNativeTimers?: boolean;
    ignoreMissingTimers?: boolean;
    target?: object;
};
export type Timer = TimerInitialProps;
export type NodeImmediateHasRef = () => boolean;
export type NodeImmediateRef = () => NodeImmediate;
export type NodeImmediateUnref = () => NodeImmediate;
export type NodeImmediate = {
    hasRef: NodeImmediateHasRef;
    ref: NodeImmediateRef;
    unref: NodeImmediateUnref;
};
/**
 * @typedef {"nextAsync" | "manual" | "interval"} TickMode
 */
/**
 * @typedef {object} NextAsyncTickMode
 * @property {"nextAsync"} mode - runs timers one macrotask at a time
 */
/**
 * @typedef {object} ManualTickMode
 * @property {"manual"} mode - advances only when the caller explicitly ticks
 */
/**
 * @typedef {object} IntervalTickMode
 * @property {"interval"} mode - advances automatically on a native interval
 * @property {number} [delta] - interval duration in milliseconds
 */
/**
 * @typedef {IntervalTickMode | NextAsyncTickMode | ManualTickMode} TimerTickMode
 */
/**
 * @callback TimeRemaining
 * @returns {number}
 */
/**
 * @typedef {object} IdleDeadline
 * @property {boolean} didTimeout - whether or not the callback was called before reaching the optional timeout
 * @property {TimeRemaining} timeRemaining - a floating-point value providing an estimate of the number of milliseconds remaining in the current idle period
 */
/**
 * @callback RequestIdleCallbackCallback
 * @param {IdleDeadline} deadline
 */
/**
 * Queues a function to be called during a browser's idle periods
 * @callback RequestIdleCallback
 * @param {RequestIdleCallbackCallback} callback
 * @param {{timeout: number}} [options] - an options object
 * @returns {number} the id
 */
/**
 * @typedef {"setTimeout" | "clearTimeout" | "setImmediate" | "clearImmediate" | "setInterval" | "clearInterval" | "Date" | "nextTick" | "hrtime" | "requestAnimationFrame" | "cancelAnimationFrame" | "requestIdleCallback" | "cancelIdleCallback" | "performance" | "queueMicrotask"} FakeMethod
 */
/**
 * @typedef {number | NodeImmediate | Timer} TimerId
 */
/**
 * @callback NextTick
 * @param {VoidVarArgsFunc} callback - the callback to run
 * @param {...*} args - optional arguments to call the callback with
 * @returns {void}
 */
/**
 * @callback SetImmediate
 * @param {VoidVarArgsFunc} callback - the callback to run
 * @param {...*} args - optional arguments to call the callback with
 * @returns {NodeImmediate}
 */
/**
 * @callback SetTimeout
 * @param {VoidVarArgsFunc} callback - the callback to run
 * @param {number} [delay] - optional delay in milliseconds
 * @param {...*} args - optional arguments to call the callback with
 * @returns {TimerId} - the timeout identifier
 */
/**
 * @callback ClearTimeout
 * @param {TimerId} [id] - the timeout identifier to clear
 * @returns {void}
 */
/**
 * @callback SetInterval
 * @param {VoidVarArgsFunc} callback - the callback to run
 * @param {number} [delay] - optional delay in milliseconds
 * @param {...*} args - optional arguments to call the callback with
 * @returns {TimerId} - the interval identifier
 */
/**
 * @callback ClearInterval
 * @param {TimerId} [id] - the interval identifier to clear
 * @returns {void}
 */
/**
 * @callback QueueMicrotask
 * @param {VoidVarArgsFunc} callback - the callback to run
 * @returns {void}
 */
/**
 * @callback VoidVarArgsFunc
 * @param {...*} args - optional arguments to call the callback with
 * @returns {void}
 */
/**
 * @callback PerformanceNow
 * @returns {number}
 */
/**
 * @typedef Performance
 * @property {PerformanceNow} now - returns the current high-resolution time
 * @property {(name: string) => void} [mark] - adds a mark
 * @property {(name: string, start?: string, end?: string) => void} [measure] - adds a measure
 * @property {number} [timeOrigin] - the time origin
 */
/**
 * @callback AnimationFrameCallback
 * @param {number} time - the current time
 * @returns {void}
 */
/**
 * @callback RequestAnimationFrame
 * @param {AnimationFrameCallback} callback - schedules a frame callback
 * @returns {TimerId} - the request id
 */
/**
 * @callback CancelAnimationFrame
 * @param {TimerId} id - cancels a frame callback
 * @returns {void}
 */
/**
 * @callback CancelIdleCallback
 * @param {TimerId} id - cancels a scheduled idle callback
 * @returns {void}
 */
/**
 * @callback ClearImmediate
 * @param {NodeImmediate} id - faked `clearImmediate`
 * @returns {void}
 */
/**
 * @callback CountTimers
 * @returns {number}
 */
/**
 * @callback RunMicrotasks
 * @returns {void}
 */
/**
 * @callback Tick
 * @param {string | number} tickValue - advancement in milliseconds or a string
 * @returns {number}
 */
/**
 * @callback TickAsync
 * @param {string | number} tickValue - advancement in milliseconds or a string
 * @returns {Promise<number>}
 */
/**
 * @callback Next
 * @returns {number}
 */
/**
 * @callback NextAsync
 * @returns {Promise<number>}
 */
/**
 * @callback RunAll
 * @returns {number}
 */
/**
 * @callback RunToFrame
 * @returns {number}
 */
/**
 * @callback RunAllAsync
 * @returns {Promise<number>}
 */
/**
 * @callback RunToLast
 * @returns {number}
 */
/**
 * @callback RunToLastAsync
 * @returns {Promise<number>}
 */
/**
 * @callback Reset
 * @returns {void}
 */
/**
 * @callback SetSystemTime
 * @param {number | Date} [systemTime] - the time to set
 * @returns {void}
 */
/**
 * @callback Jump
 * @param {number} ms - advancement in milliseconds
 * @returns {number}
 */
/**
 * @callback Uninstall
 * @returns {void}
 */
/**
 * @callback SetTickMode
 * @param {TimerTickMode} mode - the new tick mode
 * @returns {void}
 */
/**
 * @callback Hrtime
 * @param {number[]} [prevTime] - previous high-resolution time
 * @returns {number[]}
 */
/**
 * @callback WithGlobal
 * @param {*} globalObject - the global object to mock
 * @returns {FakeTimers}
 */
/**
 * @typedef {object} Timers
 * @property {SetTimeout} setTimeout - native `setTimeout`
 * @property {ClearTimeout} clearTimeout - native `clearTimeout`
 * @property {SetInterval} setInterval - native `setInterval`
 * @property {ClearInterval} clearInterval - native `clearInterval`
 * @property {Date} Date - native `Date`
 * @property {typeof Intl} [Intl] - native `Intl`
 * @property {SetImmediate} [setImmediate] - native `setImmediate`, if available
 * @property {ClearImmediate} [clearImmediate] - native `clearImmediate`, if available
 * @property {Hrtime} [hrtime] - native `process.hrtime`, if available
 * @property {NextTick} [nextTick] - native `process.nextTick`, if available
 * @property {Performance} [performance] - native `performance`, if available
 * @property {RequestAnimationFrame} [requestAnimationFrame] - native `requestAnimationFrame`, if available
 * @property {QueueMicrotask} [queueMicrotask] - whether `queueMicrotask` exists
 * @property {CancelAnimationFrame} [cancelAnimationFrame] - native `cancelAnimationFrame`, if available
 * @property {RequestIdleCallback} [requestIdleCallback] - native `requestIdleCallback`, if available
 * @property {CancelIdleCallback} [cancelIdleCallback] - native `cancelIdleCallback`, if available
 */
/**
 * @typedef {object} ClockState
 * @property {number} tickFrom - lower bound of the current tick range
 * @property {number} tickTo - upper bound of the current tick range
 * @property {number} [previous] - previous timer time used during ticking
 * @property {number | null} [oldNow] - previous value of `now`
 * @property {Timer} [timer] - timer currently being processed
 * @property {any} [firstException] - first exception raised while processing timers
 * @property {number} [nanosTotal] - accumulated nanoseconds from fractional ticks
 * @property {number} [msFloat] - accumulated fractional milliseconds
 * @property {number} [ms] - accumulated whole milliseconds
 */
/**
 * @typedef {object} TimerInitialProps
 * @property {VoidVarArgsFunc} func - callback or string to execute
 * @property {*[]} [args] - arguments passed to the callback
 * @property {'Timeout' | 'Interval' | 'Immediate' | 'AnimationFrame' | 'IdleCallback'} [type] - timer kind
 * @property {number} [delay] - requested delay in milliseconds
 * @property {number} [callAt] - scheduled execution time
 * @property {number} [createdAt] - time at which the timer was created
 * @property {boolean} [immediate] - whether this timer should run before non-immediate timers at the same time
 * @property {number} [id] - unique timer identifier
 * @property {Error} [error] - captured stack for loop diagnostics
 * @property {number} [interval] - interval for repeated timers
 * @property {boolean} [animation] - whether this is an animation frame timer
 * @property {boolean} [requestIdleCallback] - whether this is an idle callback timer
 * @property {number} [order] - execution order for timers at the same time
 * @property {number} [heapIndex] - index in the timer heap
 */
/**
 * @callback CreateClockCallback
 * @param {number|Date} [start] initial mocked time, as milliseconds since epoch or a Date
 * @param {number} [loopLimit] maximum number of timers run before aborting with an infinite-loop error
 * @returns {Clock}
 */
/**
 * @callback InstallCallback
 * @param {Config} [config] Optional config
 * @returns {Clock}
 */
/**
 * @typedef {object} FakeTimers
 * @property {Timers} timers - the native timer APIs saved for later restoration
 * @property {CreateClockCallback} createClock - creates a new fake clock
 * @property {InstallCallback} install - installs the fake timers onto the default global object
 * @property {WithGlobal} withGlobal - creates a fake-timers instance for a provided global object
 */
/**
 * @typedef {object} Clock
 * @property {number} now - current mocked time in milliseconds
 * @property {typeof Date & {clock?: Clock}} Date - fake Date constructor bound to this clock
 * @property {number} loopLimit - maximum number of timers before assuming an infinite loop
 * @property {RequestIdleCallback} requestIdleCallback - schedules an idle callback
 * @property {CancelIdleCallback} cancelIdleCallback - cancels a scheduled idle callback
 * @property {SetTimeout} setTimeout - faked `setTimeout`
 * @property {ClearTimeout} clearTimeout - faked `clearTimeout`
 * @property {NextTick} nextTick - faked `process.nextTick`
 * @property {QueueMicrotask} queueMicrotask - faked `queueMicrotask`
 * @property {SetInterval} setInterval - faked `setInterval`
 * @property {ClearInterval} clearInterval - faked `clearInterval`
 * @property {SetImmediate} setImmediate - faked `setImmediate`
 * @property {ClearImmediate} clearImmediate - faked `clearImmediate`
 * @property {CountTimers} countTimers - counts scheduled timers
 * @property {RequestAnimationFrame} requestAnimationFrame - schedules a frame callback
 * @property {CancelAnimationFrame} cancelAnimationFrame - cancels a frame callback
 * @property {RunMicrotasks} runMicrotasks - drains microtasks
 * @property {Tick} tick - advances fake time synchronously
 * @property {TickAsync} tickAsync - advances fake time asynchronously
 * @property {Next} next - runs the next scheduled timer
 * @property {NextAsync} nextAsync - runs the next scheduled timer asynchronously
 * @property {RunAll} runAll - runs all scheduled timers
 * @property {RunToFrame} runToFrame - runs timers up to the next animation frame
 * @property {RunAllAsync} runAllAsync - runs all scheduled timers asynchronously
 * @property {RunToLast} runToLast - runs timers up to the last scheduled timer
 * @property {RunToLastAsync} runToLastAsync - runs timers up to the last scheduled timer asynchronously
 * @property {Reset} reset - clears all timers and resets the clock
 * @property {SetSystemTime} setSystemTime - sets the clock to a specific wall-clock time
 * @property {Jump} jump - advances time and returns the new `now`
 * @property {Performance} performance - fake performance object
 * @property {Hrtime} hrtime - faked `process.hrtime`
 * @property {Uninstall} uninstall - restores native timers
 * @property {string[]} methods - names of faked methods
 * @property {boolean} [shouldClearNativeTimers] - inherited from config
 * @property {{methodName:string, original:any}[] | undefined} timersModuleMethods - saved Node timers module methods
 * @property {{methodName:string, original:any}[] | undefined} timersPromisesModuleMethods - saved Node timers/promises methods
 * @property {Map<VoidVarArgsFunc, AbortSignal>} abortListenerMap - active abort listeners
 * @property {SetTickMode} setTickMode - switches the auto-tick mode
 * @property {Map<number, Timer>} [timers] - internal timer storage
 * @property {any} [timerHeap] - internal timer heap
 * @property {boolean} [duringTick] - internal flag
 * @property {boolean} isNearInfiniteLimit - internal flag indicating the loop limit is nearly reached
 * @property {any} [attachedInterval] - internal flag
 * @property {any} [tickMode] - internal flag
 * @property {Timer[]} [jobs] - internal flag
 * @property {any} [Intl] - fake Intl object
 */
/**
 * Configuration object for the `install` method.
 * @typedef {object} Config
 * @property {number|Date} [now] initial mocked time, as milliseconds since epoch or a Date
 * @property {FakeMethod[]} [toFake] method names that should be faked
 * @property {FakeMethod[]} [toNotFake] method names that should remain native
 * @property {number} [loopLimit] maximum number of timers run before aborting with an infinite-loop error
 * @property {boolean} [shouldAdvanceTime] automatically increments mocked time while the clock is installed
 * @property {number} [advanceTimeDelta] interval in milliseconds used when `shouldAdvanceTime` is enabled
 * @property {boolean} [shouldClearNativeTimers] forwards clear calls to native methods when the timer is not fake
 * @property {boolean} [ignoreMissingTimers] suppresses errors when a requested timer is missing from the global object
 * @property {object} [target] global object to install onto
 */
/**
 * The internal structure to describe a scheduled fake timer
 * @typedef {TimerInitialProps} Timer
 * @property {*[]} args - arguments passed to the callback
 * @property {number} callAt - scheduled execution time
 * @property {number} createdAt - time at which the timer was created
 * @property {number} id - unique timer identifier
 * @property {'Timeout' | 'Interval' | 'Immediate' | 'AnimationFrame' | 'IdleCallback'} type - timer kind
 */
/**
 * @callback NodeImmediateHasRef
 * @returns {boolean}
 */
/**
 * @callback NodeImmediateRef
 * @returns {NodeImmediate}
 */
/**
 * @callback NodeImmediateUnref
 * @returns {NodeImmediate}
 */
/**
 * A Node timer
 * @typedef {object} NodeImmediate
 * @property {NodeImmediateHasRef} hasRef - reports whether the timer keeps the event loop alive
 * @property {NodeImmediateRef} ref - marks the timer as referenced
 * @property {NodeImmediateUnref} unref - marks the timer as unreferenced
 */
/**
 * Mocks available features in the specified global namespace.
 * @param {*} _global Namespace to mock (e.g. `window`)
 * @returns {FakeTimers}
 */
declare function withGlobal(_global: any): FakeTimers;
export declare var timers: Timers;
export declare var createClock: CreateClockCallback;
export declare var install: InstallCallback;
export declare var withGlobal: typeof withGlobal;
