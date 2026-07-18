# RC1 PRODUCT BACKLOG

This document is the official Product Backlog for Metaprom.

Its purpose is to capture product improvements discovered during real product usage without interrupting the current sprint.

**From now on:** Every issue discovered during testing must first enter this backlog. The current task is never interrupted.

---

## P0 — Critical Product Improvements

Issues affecting user experience or launch quality.

### P0-001 — Early Validation Before AI Generation

| Field | Value |
|-------|-------|
| **ID** | P0-001 |
| **Status** | OPEN |
| **Priority** | P0 |
| **Discovered During** | Share Validation |

**Problem:**

If Vertex/OpenAI will reject an image (copyright, trademarks, protected content, children, policy restrictions, etc.), the user currently waits several minutes before receiving a generic error.

**Expected Behavior:**

Perform validation BEFORE starting generation whenever possible. Recoverable errors should happen immediately — never after several minutes of waiting.

---

### P0-002 — Prevent Preview Download

| Field | Value |
|-------|-------|
| **ID** | P0-002 |
| **Status** | OPEN |
| **Priority** | P0 |
| **Discovered During** | Share Validation |

**Problem:**

The Preview can still be downloaded using browser interactions (e.g. right click / Save video as). This breaks the official product philosophy: Preview belongs to Metaprom.

**Expected Behavior:**

The Preview should remain viewable and shareable, but should not expose an easy direct download path through the UI.

---

## P1 — Important Improvements

Important improvements that should be completed after launch.

### P1-001 — Biblioteca Access with Different Google Account

| Field | Value |
|-------|-------|
| **ID** | P1-001 |
| **Status** | OPEN |
| **Priority** | P1 |
| **Discovered During** | Share Validation |

**Problem:**

Logging in with a different Google account does not correctly open Biblioteca. The navigation link to Biblioteca also fails in this scenario.

**Expected Behavior:**

Every authenticated user should reach their own Biblioteca correctly, and navigation should work consistently regardless of the Google account used.

---

## P2 — Future Improvements

Ideas, polish and optimizations.

_No items yet._

---

## Rules

1. **Adding an item to this backlog does NOT interrupt the active task.**
2. **Only one backlog item may become Active at any given time.**
3. **Items are removed from this backlog only after they have been fully verified.**
