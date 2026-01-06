

**Objective**

Convert the existing app into one which uses a booru-style tagging system, whose **tagging and search system behaves identically to booru sites (e.g., Danbooru/Gelbooru)** rather than traditional category or filter-based libraries. This behavioral model is critical and non-negotiable.

---

### 1. Core Design Principle (Read First)

This system MUST implement a **booru-style, tag-expression-driven library**.

This is **NOT**:

* A category hierarchy
* A genre + subgenre tree
* A checkbox or filter-panel driven UI
* A “primary genre” model

Everything is expressed and resolved through **tags and tag expressions**.

---

### 2. Tag Model (Canonical Behavior)

#### 2.1 Atomic, Flat Tags

* Tags are flat, atomic, and reusable
* No enforced hierarchy
* A book may have hundreds of tags
* Tags are first-class entities

Examples:

```
fantasy
grimdark
political_intrigue
first_person
unreliable_narrator
dragon
```

---

#### 2.2 Typed Tags (Metadata Only)

Tags have a `type` used for validation, autocomplete, and UI grouping — **not for restricting search**.

Required tag types:

```
genre
theme
setting
tone
structure
character_trait
series
author
language
format
status
meta
```

Example:

```
fantasy            (genre)
grimdark           (tone)
first_person       (structure)
female_protagonist (character_trait)
book_3             (series)
epub               (format)
```

---

#### 2.3 User-Extensible Tags

* Users may create tags freely
* No whitelist
* Tags become globally available once created
* Tags may later be aliased, merged, or deprecated

---

### 3. Booru-Style Search Semantics (Critical)

#### 3.1 Search Is Expression-Based

Search uses **a single text input** supporting tag expressions.

Examples:

```
fantasy grimdark -romance
genre:fantasy tone:grimdark
(author:"Gene Wolfe" OR author:"Ursula Le Guin") -ya
```

#### 3.2 Query Rules

| Syntax           | Meaning                        |
| ---------------- | ------------------------------ |
| `tag`            | Include books with this tag    |
| `-tag`           | Exclude books with this tag    |
| `tag1 tag2`      | Logical AND (default)          |
| `tag1 OR tag2`   | Logical OR                     |
| `type:tag`       | Match tag with a specific type |
| `"quoted value"` | Multi-word tag                 |

---

#### 3.3 Absence Is Meaningful

* A missing tag is a valid state
* Example:

```
-finished
```

Returns all books not marked as finished.

---

### 4. Tag Normalization & Aliasing

* Tags stored as `snake_case`
* Displayed as human-friendly text
* Alias support is mandatory

Examples:

```
sci-fi → science_fiction
ya → young_adult
```

Search resolves aliases automatically.

---

### 5. Autocomplete & Discovery (Mandatory)

#### 5.1 Tag Autocomplete

Autocomplete must:

* Trigger while typing
* Show:

  * tag name
  * tag type
  * usage count

Example:

```
grimdark     (tone)     1,248
grimoire     (theme)      203
```

---

#### 5.2 Tag Pages

Each tag has a dedicated page showing:

* Description
* Aliases
* Related tags
* All books using the tag

---

### 6. Bulk & Power-User Features

The system must support **high-volume tagging workflows**:

* Bulk add/remove tags
* Copy tags between books
* Auto-tagging rules

Example auto-rules:

```
If language == "en" → add tag: english
If series != null → add tag: series
If format == "epub" → add tag: epub
```

---

### 7. Explicit Anti-Requirements (Do NOT Build)

DO NOT implement:

* Fixed category trees
* Checkbox filter panels
* One-tag-per-type restrictions
* Hidden or implicit tag logic
* “Primary genre” fields

All classification and search behavior must resolve through tags.

---

### 8. Internal Reference Data Model

Use a schema conceptually equivalent to:

```
Book
- id
- title
- metadata

Tag
- id
- name (unique, normalized)
- type
- description
- usage_count

BookTag
- book_id
- tag_id
- confidence (optional)
- source (manual | auto | import)

TagAlias
- alias
- canonical_tag_id
```

---

### 9. Performance & Scale Requirements

* Must scale to 20,000+ books and tens of thousands of tags
* Tag search must be indexed
* Query evaluation must be composable and fast
* No N+1 tag resolution
* Designed for future OPDS exposure

---

### 10. UX Expectations

* Desktop-first large-screen UI
* Mobile-friendly tag search and reading UI
* Search bar is the primary navigation surface
* Tag discovery is a core feature, not secondary

---

**End State**

The resulting system should feel immediately familiar to users of booru sites:
powerful, expressive, fast, and tag-centric — adapted for ebooks rather than images.

---

