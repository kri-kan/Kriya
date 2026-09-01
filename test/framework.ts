/**
 * Lightweight, robust TypeScript test harness for TaskMaster Pro.
 * Provides assertion helpers, test grouping, execution timing, and structured reporting
 * compatible with both CLI execution and Web API consumption.
 */

export interface TestResult {
  title: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  assertions: number;
}

export interface TestSuiteResult {
  name: string;
  category: 'core' | 'database' | 'migrations' | 'schema' | 'installer' | 'portability' | 'mcp' | 'api' | 'utils' | 'security';
  description: string;
  tests: TestResult[];
  passed: boolean;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
}

export interface TestRunSummary {
  timestamp: string;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  success: boolean;
  suites: TestSuiteResult[];
}

export class Expectation<T> {
  private actual: T;
  private isNot: boolean = false;
  private static assertionCounter = 0;

  constructor(actual: T, isNot: boolean = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  static resetAssertionCount(): void {
    Expectation.assertionCounter = 0;
  }

  static getAssertionCount(): number {
    return Expectation.assertionCounter;
  }

  get not(): Expectation<T> {
    return new Expectation(this.actual, !this.isNot);
  }

  toBe(expected: T): void {
    Expectation.assertionCounter++;
    const matches = Object.is(this.actual, expected);
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`);
    }
  }

  toEqual(expected: any): void {
    Expectation.assertionCounter++;
    const actualStr = JSON.stringify(this.actual);
    const expectedStr = JSON.stringify(expected);
    const matches = actualStr === expectedStr;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${actualStr} ${this.isNot ? 'NOT to equal' : 'to equal'} ${expectedStr}`);
    }
  }

  toBeTruthy(): void {
    Expectation.assertionCounter++;
    const matches = Boolean(this.actual);
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be truthy' : 'to be truthy'}`);
    }
  }

  toBeFalsy(): void {
    Expectation.assertionCounter++;
    const matches = !Boolean(this.actual);
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be falsy' : 'to be falsy'}`);
    }
  }

  toBeGreaterThan(expected: number): void {
    Expectation.assertionCounter++;
    const matches = typeof this.actual === 'number' && this.actual > expected;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT to be >' : 'to be >'} ${expected}`);
    }
  }

  toBeGreaterThanOrEqual(expected: number): void {
    Expectation.assertionCounter++;
    const matches = typeof this.actual === 'number' && this.actual >= expected;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT to be >=' : 'to be >='} ${expected}`);
    }
  }

  toBeLessThan(expected: number): void {
    Expectation.assertionCounter++;
    const matches = typeof this.actual === 'number' && this.actual < expected;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT to be <' : 'to be <'} ${expected}`);
    }
  }

  toContain(expected: any): void {
    Expectation.assertionCounter++;
    let matches = false;
    if (typeof this.actual === 'string' && typeof expected === 'string') {
      matches = this.actual.includes(expected);
    } else if (Array.isArray(this.actual)) {
      matches = this.actual.includes(expected);
    } else if (this.actual && typeof this.actual === 'object') {
      matches = expected in (this.actual as Record<string, any>);
    }
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to contain' : 'to contain'} ${JSON.stringify(expected)}`);
    }
  }

  toBeDefined(): void {
    Expectation.assertionCounter++;
    const matches = this.actual !== undefined;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected value ${this.isNot ? 'NOT to be defined' : 'to be defined'}`);
    }
  }

  toBeUndefined(): void {
    Expectation.assertionCounter++;
    const matches = this.actual === undefined;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected value ${this.isNot ? 'NOT to be undefined' : 'to be undefined'}, received ${JSON.stringify(this.actual)}`);
    }
  }

  toBeNull(): void {
    Expectation.assertionCounter++;
    const matches = this.actual === null;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be null' : 'to be null'}`);
    }
  }

  toThrow(expectedError?: string | RegExp): void {
    Expectation.assertionCounter++;
    if (typeof this.actual !== 'function') {
      throw new Error(`Expected a function to test for throws, received ${typeof this.actual}`);
    }
    let threw = false;
    let thrownError: any = null;
    try {
      (this.actual as Function)();
    } catch (err) {
      threw = true;
      thrownError = err;
    }

    if (this.isNot ? threw : !threw) {
      throw new Error(`Expected function ${this.isNot ? 'NOT to throw' : 'to throw'}, but it ${threw ? 'threw: ' + thrownError?.message : 'did not throw'}`);
    }

    if (threw && expectedError) {
      const msg = thrownError?.message || String(thrownError);
      if (typeof expectedError === 'string' && !msg.includes(expectedError)) {
        throw new Error(`Expected thrown error message to contain "${expectedError}", received "${msg}"`);
      } else if (expectedError instanceof RegExp && !expectedError.test(msg)) {
        throw new Error(`Expected thrown error message to match ${expectedError}, received "${msg}"`);
      }
    }
  }
}

export function expect<T>(actual: T): Expectation<T> {
  return new Expectation(actual);
}

export type TestFn = () => void | Promise<void>;

export class TestSuiteBuilder {
  name: string;
  category: TestSuiteResult['category'];
  description: string;
  tests: { title: string; fn: TestFn }[] = [];
  beforeHooks: (() => void | Promise<void>)[] = [];
  afterHooks: (() => void | Promise<void>)[] = [];

  constructor(name: string, category: TestSuiteResult['category'], description: string) {
    this.name = name;
    this.category = category;
    this.description = description;
  }

  beforeEach(fn: () => void | Promise<void>): this {
    this.beforeHooks.push(fn);
    return this;
  }

  afterEach(fn: () => void | Promise<void>): this {
    this.afterHooks.push(fn);
    return this;
  }

  it(title: string, fn: TestFn): this {
    this.tests.push({ title, fn });
    return this;
  }

  async run(): Promise<TestSuiteResult> {
    const results: TestResult[] = [];
    const suiteStart = Date.now();
    let passedCount = 0;
    let failedCount = 0;

    for (const test of this.tests) {
      Expectation.resetAssertionCount();
      const testStart = Date.now();
      try {
        for (const hook of this.beforeHooks) {
          await hook();
        }

        await test.fn();

        for (const hook of this.afterHooks) {
          await hook();
        }

        const durationMs = Date.now() - testStart;
        results.push({
          title: test.title,
          passed: true,
          durationMs,
          assertions: Expectation.getAssertionCount(),
        });
        passedCount++;
      } catch (err: any) {
        const durationMs = Date.now() - testStart;
        results.push({
          title: test.title,
          passed: false,
          durationMs,
          error: err?.message || String(err),
          assertions: Expectation.getAssertionCount(),
        });
        failedCount++;
      }
    }

    const totalDurationMs = Date.now() - suiteStart;
    return {
      name: this.name,
      category: this.category,
      description: this.description,
      tests: results,
      passed: failedCount === 0,
      passedCount,
      failedCount,
      totalDurationMs,
    };
  }
}

export function createSuite(
  name: string,
  category: TestSuiteResult['category'],
  description: string,
  definer: (suite: TestSuiteBuilder) => void
): TestSuiteBuilder {
  const suite = new TestSuiteBuilder(name, category, description);
  definer(suite);
  return suite;
}
