// region MODULE_CONTRACT [DOMAIN(7): Testing; CONCEPT(9): AntiLoopProtocol, CounterManagement; TECH(8): TypeScript, vitest]
// ## @modulecontract
// ## @purpose To implement the Anti-Loop Protocol test infrastructure: track failed run counts via a JSON counter file, provide checklist output on repeated failures, and reset the counter only on 100% PASS.
// ## @scope Test session hooks for counter initialization and finalization, counter file I/O.
// ## @input None (uses process.cwd() for counter file path).
// ## @output Side-effect: manages .test_counter.json in the project root.
// ## @links [USES_API(7): fs, path; USES_CONCEPT: AntiLoopProtocol]
// ## @invariants
// ## - .test_counter.json is created if it does not exist.
// ## - Counter resets to 0 only when all tests pass.
// ## - On failures, counter increments and a checklist is printed.
// ## @rationale
// ## Q: Why a JSON file instead of an in-memory variable?
// ## A: Vitest runs each file in a separate worker process. A file on disk is the only reliable way to persist state across test files.
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial creation of Anti-Loop conftest]
// ## @modulemap
// ## FUNC 9[Gets or creates the test counter] => getTestCounter
// ## FUNC 8[Updates the counter with pass/fail result] => updateTestCounter
// ## @usecases
// ## - [Anti-Loop]: Test Runner → getTestCounter → run tests → updateTestCounter(passed) → repeat or reset
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: testing, Anti-Loop, conftest, test counter, .test_counter.json, checklist
// STRUCTURE: ▶ ┌.test_counter.json┐ → ○ getTestCounter: read file || {attempts:0} → ◇ updateTestCounter(passed): passed=TRUE → reset to 0 || passed=FALSE → increment → ⎋ print checklist

import fs from 'fs';
import path from 'path';

const COUNTER_FILE = path.join(process.cwd(), '.test_counter.json');

// region FUNC_getTestCounter [DOMAIN(7): Testing; CONCEPT(9): Persistence; TECH(6): JSON]
// ## @purpose To read the current attempt count from the JSON counter file, creating it with initial value 0 if it does not exist.
// ## @uses fs, path
// ## @io [] -> [number]
// ## @complexity 3
export function getTestCounter(): number {
    try {
        if (fs.existsSync(COUNTER_FILE)) {
            const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
            return data.attempts || 0;
        }
    } catch (error) {
        console.error(`[IMP:7][getTestCounter] Error reading counter file: ${error} [IO]`);
    }
    // Create with default
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ attempts: 0 }), 'utf-8');
    return 0;
}
// endregion FUNC_getTestCounter

// region FUNC_updateTestCounter [DOMAIN(7): Testing; CONCEPT(9): StateManagement; TECH(6): JSON]
// ## @purpose To update the attempt counter: reset to 0 if tests passed, increment by 1 if they failed. Prints a checklist on failures for rapid debugging.
// ## @uses fs, path
// ## @io [boolean] -> [void]
// ## @complexity 4
export function updateTestCounter(passed: boolean): void {
    let attempts = getTestCounter();

    if (passed) {
        attempts = 0;
        console.log(`[IMP:9][Anti-Loop] All tests PASSED. Counter reset to 0. [BUSINESS]`);
    } else {
        attempts += 1;
        console.log(`[IMP:9][Anti-Loop] Tests FAILED. Attempt #${attempts} [BUSINESS]`);

        // Print checklist based on attempt count
        console.log(`\n========== ANTI-LOOP CHECKLIST (Attempt #${attempts}) ==========`);
        console.log(`1. Check that createDb(':memory:') is used for test isolation.`);
        console.log(`2. Verify ExpenseService methods handle null/undefined inputs.`);
        console.log(`3. Ensure supertest is making requests to the correct route path (mount at /api).`);
        console.log(`4. Check that all service methods have try-catch with proper error re-throw.`);
        console.log(`5. Verify that row.changes > 0 works for delete detection.`);

        if (attempts >= 2) {
            console.log(`6. Check TypeScript types: Expense interface fields match DB schema.`);
            console.log(`7. Ensure vitest.config.ts or vite.config.ts includes test configuration.`);
        }

        if (attempts >= 3) {
            console.log(`8. Use MCP tavily or Context 7 to find a solution online.`);
        }

        if (attempts >= 4) {
            console.log(`9. WARNING: Looping risk! Pause and reflect. Are you repeating a failed strategy? Consider alternatives (Superposition).`);
        }

        if (attempts >= 5) {
            console.log(`10. CRITICAL ERROR: Agent looping detected. STOP. Formulate a help request for an operator.`);
        }
        console.log(`============================================================\n`);
    }

    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ attempts }), 'utf-8');
}
// endregion FUNC_updateTestCounter

// region VITEST_SETUP [DOMAIN(7): Testing; CONCEPT(9): Hooks; TECH(7): vitest]
// ## @purpose To hook into vitest session lifecycle for automatic counter management.
// ## @uses vitest hooks
// Using vitest setup file pattern — we export beforeAll/afterAll

import { beforeAll, afterAll } from 'vitest';

let sessionAttempts = 0;

beforeAll(() => {
    sessionAttempts = getTestCounter();
    console.log(`[IMP:6][TestSession] Starting test session, previous attempts: ${sessionAttempts} [FLOW]`);
});

afterAll(() => {
    // We cannot know pass/fail here directly; the counter is updated in individual test files
    console.log(`[IMP:6][TestSession] Test session completed [FLOW]`);
});
// endregion VITEST_SETUP
