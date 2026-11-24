---
name: break-test
description: Use when asked to break-test or mutation-test code, to find a mutation score or surviving mutants, or to check that tests can fail; when tests were never seen to fail, or an implementer reports that tests and code were written together; or when a workflow step requires a break-test of a package before review.
---

# Break-Test

## Overview

A test that nobody saw fail proves nothing. A break-test changes the code on purpose and looks for the test that fails.

It has two passes, and they find different problems:

| Pass            | Question                                   | Finds                         |
| --------------- | ------------------------------------------ | ----------------------------- |
| By mutation     | Does a test fail when this behavior breaks? | Behavior that no test checks  |
| By test         | Can this test fail at all?                 | Tests that cannot fail        |

Test-first work prevents most tests that cannot fail. It does not prevent behavior that no test checks. Do the two passes for each.

## Scope and limits

- One package or module for each run.
- One run at a time in a working tree. Each run changes source files, so two runs in one tree give wrong results.
- A commit hook or a push hook that lints the tree fails while a mutation is in place. Do not commit or push other work from that tree during a run.
- A mutation is temporary. A run commits test files only. A source file changes for good only to correct a real defect that a new test shows.
- The targets are all the things that the tests protect: source files, and also data files, configuration, and scripts in a package manifest when a requirement names them. A package with almost no logic has most of its mutations in its data.
- Run each command from the root of the repository. The path in `git checkout -- <path>` is relative to it.
- Time: one mutation costs one run of the tests. About 100 mutations of a package with a fast suite take about 30 minutes.

## Steps

1. **Read.** Read the requirements of the package (specifications, design, README), all of the source, and all of the tests.
2. **List the mutations before you run one.** Write one mutation for each behavior that a requirement or an explicit branch of the code stands for. Give each mutation an ID that does not change during the run, a file, and a short description. See "Mutations". If a mutation in the list is not valid, make it again and keep its ID. If you find a missed behavior later, add a mutation and say that it is outside the first list.
3. **Run each mutation.** See "One mutation". For more than about 10 mutations, write a script. See "Script".
4. **Record the first-pass totals.** Tried, killed, survived, for each source file. Do this before you change a test. These numbers are the measurement. A number that is taken after the tests change has no value.
5. **Make the inventory of the tests.** See "Inventory".
6. **Close the gaps.** See "Survivors".
7. **Finish.** Run the suite three times to find a test that fails some of the time. Run the checks of the repository. Confirm that `git status` shows test files only. Commit the tests.

## Mutations

A mutation is the smallest change that breaks exactly one behavior, of the kind that a real defect or a careless edit makes.

| Kind                      | Example                                                         |
| ------------------------- | --------------------------------------------------------------- |
| Limit                     | `>` to `>=`, 65535 to 65536, wait 50 ms to 0 ms                 |
| Removed check             | Accept an empty value, skip a type check                        |
| Wrong constant            | Status 200 to 201, a different event name, a different address  |
| Removed call              | No `clearTimeout`, no close of a watcher, no unsubscribe        |
| Wrong branch              | A warning becomes an error, an error returns success            |
| Stale value               | Return the first value and not the current value                |
| Wrong position            | The first item and not the item at the index                    |
| Missing wait              | A function does not wait for work that is running               |
| Wrong content of a result | A message that does not name the file, a path that is one level short |

Not a mutation: the removal of a full function, a syntax error, a changed export name, or a change that fails each test in the file.

## One mutation

1. Apply it. Confirm that the file changed: a replacement that matches nothing is not a mutation.
2. Confirm that it is valid. Code must compile: run the type check if the test runner does not. A data file must have correct syntax, for example JSON that parses. Data that has correct syntax and breaks a rule of the program is valid: the program must reject it, and that is the behavior under test. A mutation that is not valid is not a result. Discard it and make it again.
3. Run the full suite of the package. If the suite takes more than about 30 seconds, run only the test files that import the changed file, and say so in the report: a narrow run can hide a kill in a different file. If a test runs built output, build first. Use a reporter that gives the name of each test that fails.
4. Record the result:
   - **KILLED**: one or more tests fail by an assertion about the behavior. Record the name of each test that fails. For more than three, record three names and the number of the others.
   - **SURVIVED**: no test fails.
   - A timeout counts as a kill only when the behavior is "this never occurs". A failure in the setup of a test is not a kill.
5. Restore the file with `git checkout -- <path>`, with one literal path. Do this before the next mutation.

Never commit a mutation.

## Script

A script holds the list of mutations as data and does the same five steps for each one.

```js
// One entry: the ID, the file, the exact text to find, the replacement, a note.
const mutations = [
  { id: 'S1', file: 'pkg/src/server.ts', find: 'writeHead(200', replace: 'writeHead(201', note: 'status of /snapshot' },
]

for (const m of mutations) {
  const before = readFileSync(m.file, 'utf8')
  const after = before.replace(m.find, m.replace)
  if (after === before) { record(m, 'NOT APPLIED'); continue }
  writeFileSync(m.file, after)
  const valid = isValid(m.file)            // type check, or a parse of a data file
  const failed = valid ? runTests() : []   // names of the tests that fail
  record(m, !valid ? 'NOT VALID' : failed.length > 0 ? 'KILLED' : 'SURVIVED', failed)
  execFileSync('git', ['checkout', '--', m.file]) // m.file comes from the fixed list above
}
```

- `NOT APPLIED` and `NOT VALID` are not results. Correct the entry and run it again.
- Keep the full record of each mutation and each test that failed. The inventory uses it.
- Keep the script out of the repository.

## Inventory

For each test, and for each row of a test with a table of cases:

1. Find one mutation that makes this test fail by an assertion about what its name says. Use the recorded results first. Run a new mutation for each test that no recorded mutation proves.
2. Classify the test in its first-pass state:
   - **PROVEN**: a mutation of the behavior in its name makes it fail.
   - **WEAK**: it fails only for a different behavior, or its assertions are much looser than its name.
   - **CANNOT FAIL**: no meaningful mutation makes it fail.

A test with many assertions can be PROVEN and still give a poor signal: it fails for almost each mutation, and its name does not show which behavior broke. Say so in the report when one test kills most of the mutations.

Then examine the helpers and the fixtures. One bad helper makes many tests unable to fail:

- A helper that waits for a condition must throw when the condition does not occur.
- The time limit of a helper must be less than the time limit of the test. If the two are equal, the message of the helper is lost.
- A fixture must not make a test pass with no behavior.

Signs of a test that is weak or cannot fail:

| Sign                                                              | Why it passes                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| It acts immediately after the start                               | A different mechanism, such as a reload at the start, does the work |
| It asserts on a constant or on a value that the test set          | The code is not in the path                                |
| It asserts that text is absent                                    | It also passes when the program prints nothing             |
| It reads only the first item of a list, or uses "some item matches" | Extra items and wrong items pass                         |
| It accepts one of two results                                     | The wrong result is one of the two                         |
| It asserts only when a condition of the environment is true       | It asserts nothing in the other case                       |

## Survivors

For each mutation that survived:

1. Decide if the behavior is required: by a requirement, by the design, or by what a reasonable user expects.
2. Required: write a test. Prove it: apply the mutation, see the test fail, restore, see the test pass.
3. Not required, or not possible to see from outside the code: record an accepted survivor with the reason. Usual reasons: the mutation gives the same result (for example cleanup of an object that nothing can reach), or it changes only the words of a message that no requirement fixes.
4. If a new test fails with no mutation in place, the code has a real defect. Make the smallest correction. Report it apart from the test gaps.
5. Say which cause each survivor has: a behavior that nobody wrote a test for, or a test that exists but is too loose.

Then rework each WEAK test and each CANNOT FAIL test so that it checks what its name says, and prove it. Delete a test only when its behavior is not worth a test, or a different test already proves it.

## Report

1. First-pass totals of the mutations: tried, killed, survived, and the rate, for each file.
2. First-pass totals of the tests: PROVEN, WEAK, CANNOT FAIL.
3. Each mutation: the ID, the file and the line (or the place in a data file), the change, the result, and the tests that kill it.
4. Each test: the mutation that makes it fail, and its class.
5. Each survivor: required or not, its cause (no test, or a loose test), and the new test or the reason that it is accepted.
6. Each thing that a requirement names and that the run did not mutate, with the reason.
7. Each real defect, with the correction.
8. Each test that was reworked or deleted, with the cause.
9. The three runs of the suite, the checks of the repository, and the commit.

A run that stops after the measurement gives items 1 to 6.

## When you give the run to a subagent

- Give it the path of this skill, the path of the package, and the paths of the requirements.
- Tell it to record the first-pass totals before it changes a test.
- Use a model of the middle tier. The work is long and methodical.
- Start one run for each package, one at a time in a working tree.
- Do not commit, push, or run other tests in that tree until the subagent reports.

## Common mistakes

| Mistake                                              | Correction                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| Add tests before the first-pass totals are recorded  | Record first. The totals are the measurement.                 |
| Do only the pass by mutation                         | It does not show a test that never fails. Do the inventory.   |
| Count a timeout or a setup failure as a kill         | A kill is an assertion about the behavior.                    |
| Write mutations after you read the test names        | List them from the requirements and the code, before you run one. |
| Leave a mutation in place                            | Restore after each one. Confirm with `git status` at the end. |
| Write a test for each survivor                       | A mutation with the same result is an accepted survivor.      |
| Change the source to make a test easier              | Change the source only for a real defect.                     |
