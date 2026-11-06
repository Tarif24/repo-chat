# RepoChat QA

Quality assurance work for **RepoChat**, a full-stack app that ingests a GitHub repository and lets you chat with it. This folder holds the test plan, test cases, bug reports, exploratory testing notes, and Jira evidence.

## Summary

|                       |                                                           |
| --------------------- | --------------------------------------------------------- |
| Automated tests       | 131 (104 unit, 21 integration, 6 end-to-end), all passing |
| Manual test cases     | 25 (TC-132 to TC-156), targeting gaps in the automation   |
| Manual cases executed | [X] of 25 (Pass: [X], Fail: [X], Blocked: [X])            |
| Defects found         | [X] ([X] high, [X] medium, [X] low), all logged in Jira   |
| Exploratory sessions  | [X] ([X] minutes)                                         |

## Approach

1. **Automated first.** I built RepoChat with Jest (unit and integration) and Playwright (end-to-end) tests covering ingestion, querying, caching, and storage management.
2. **Document and audit.** I wrote a test plan and documented every automated test as a traceable test case, grouped into functional areas. This showed where the automation was thin.
3. **Manual testing for the gaps.** I wrote and executed manual cases for areas the suite does not cover: chat input edge cases, UI state transitions, error handling in the real UI, loading states, repository variety, cross-browser and responsive layout, concurrency, security, accessibility, and behavior against real services.
4. **Exploratory testing.** I ran a time-boxed session guided by a written charter to find issues no scripted case anticipated.
5. **Defect tracking.** Every failure was logged in Jira as a Bug with steps to reproduce, expected vs actual results, and evidence.

## Contents

| File                                                 | What it is                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`test-plan.md`](./test-plan.md)                     | Objective, scope, test levels, test areas with techniques, environment, entry and exit criteria, risks, and coverage gaps |
| [`test-cases.csv`](./test-cases.csv)                 | All 156 test cases (131 automated, 25 manual) with priority, steps, expected and actual results, status, and bug links    |
| [`bug-reports/`](./bug-reports)                      | Written defect reports (also tracked in Jira)                                                                             |
| [`exploratory-session.md`](./exploratory-session.md) | Charter, notes, and findings from the exploratory session                                                                 |
| [`screenshots/`](./screenshots)                      | Jira board, bug list, and dashboard                                                                                       |

## Test design techniques used

- **Equivalence partitioning:** valid, invalid, private, and nonexistent repository URLs; relevant vs irrelevant questions
- **Boundary value analysis:** score thresholds, storage limits, topK, and message length
- **Decision tables:** combinations such as cache hit or miss, embedding present, and filter result
- **State transition testing:** ingestion stages, chat states, and page flow
- **Negative and error-guessing tests:** provider failures, offline use, unusual input
- **Exploratory testing:** charter-based sessions

## Tools

| Purpose                    | Tool                                |
| -------------------------- | ----------------------------------- |
| Unit and integration tests | Jest, TypeScript, in-memory MongoDB |
| End-to-end tests           | Playwright (Chromium)               |
| Defect and task tracking   | Jira                                |
| Test case management       | Markdown and CSV in this repository |

## Jira setup

Work is tracked in a single Jira project. Defects use the **Bug** issue type, system layers use **components** (Frontend, Backend, Database, DevOps), and feature areas use **labels** (`repo-ingestion`, `rag-query`, `semantic-cache`). Useful filters:

- All open bugs: `project = [KEY] AND issuetype = Bug AND status != Done ORDER BY priority DESC`
- Bugs by layer: `project = [KEY] AND issuetype = Bug AND component = Backend`
- Bugs by feature: `project = [KEY] AND issuetype = Bug AND labels = repo-ingestion`

## Highlights

- **[Bug title]** ([KEY]-[N], [severity]): [one-line description of the impact and how it was found]
- **[Bug title]** ([KEY]-[N], [severity]): [one-line description]
- **[Bug title]** ([KEY]-[N], [severity]): [one-line description]

## Known gaps and next steps

- Only Chromium is covered by automation, so cross-browser checks are manual.
- Many automated tests use mocks, so real-provider behavior is checked manually (TC-155 and TC-156).
- Code coverage has not been measured. Adding Jest coverage reporting is a possible next step.
- The best manual cases to automate next with Playwright: TC-132 (empty message), TC-135 (double-click send), TC-138 and TC-139 (private and nonexistent repo errors), TC-140 (offline send), and TC-150 (script tag as a message).

## How to run the automated tests

```bash
# Unit and integration tests
npm test

# End-to-end tests (frontend and backend running)
npx playwright test
```

_Update the commands above to match your project's scripts._
