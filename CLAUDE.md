# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a MagicMirror² module that displays school meal menus by fetching data from the LinqConnect API (formerly TitanSchools API at api.linqconnect.com). The module supports tracking multiple school menus simultaneously and can display breakfast and lunch items with configurable filtering.

## Common Commands

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with Jest directly
npx jest

# Run specific test file
npx jest test/unit/TitanSchoolsClient.test.js

# Run integration tests
npx jest test/integration/
```

## Architecture Overview

### Three-Component System

The module follows MagicMirror²'s standard architecture with three main components:

1. **MMM-TitanSchoolMealMenu.js** (Frontend Module)
   - Runs in the browser context
   - Manages the DOM rendering and UI state
   - Uses namespaced socket notifications to support multiple module instances
   - Instance identification: `${buildingId}_${districtId}` allows multiple schools to be tracked simultaneously
   - Handles loading states, error states, and retry logic with configurable delays

2. **node_helper.js** (Backend Helper)
   - Runs in Node.js context
   - Manages multiple `TitanSchoolsClient` instances (one per school being tracked)
   - Coordinates between frontend instances and their corresponding API clients
   - Calculates date ranges based on `displayCurrentWeek` and `weekStartsOnMonday` settings
   - Uses non-namespaced `TITANSCHOOLS_SET_CONFIG` notification for initial setup, then namespaced notifications thereafter

3. **TitanSchoolsClient.js** (API Client)
   - Lightweight client for LinqConnect API endpoint: `https://api.linqconnect.com/api/FamilyMenu`
   - Requires `buildingId` and `districtId` as mandatory parameters
   - Date format requirement: API expects dates as `m-d-Y` (e.g., `12-5-2021`)
   - Two-step data processing:
     - `extractMenusByDate()`: Normalizes raw API response into breakfast/lunch arrays
     - `processData()`: Filters out empty days and returns only the requested number of non-empty days, combining data with relative date labels (Today, Tomorrow, day names)

### Key Design Patterns

**Multi-Instance Support**: The notification system uses a namespacing pattern `TITANSCHOOLS_{ACTION}::{instanceName}` where instanceName combines buildingId and districtId. This allows multiple module instances to coexist without interference.

**Recipe Category Filtering**: `recipeCategoriesToInclude` (empty = all) and `recipeCategoriesToExclude` (default `["Milk", "Condiment"]`) filter API `RecipeCategories` by `CategoryName`, case-insensitively. See "Menu Parsing and Formatting" for how the remaining categories are laid out.

**Date Label Generation**: The `upcomingRelativeDates()` function generates human-friendly labels (Today, Tomorrow, or day of week) for the configured number of days to display.

**Empty Day Filtering**: When `bufferDays` > 0 (default: 7), the module automatically filters out days without menu data and shows only N non-empty days. When `bufferDays` = 0, it reverts to the old behavior of showing N consecutive calendar days. The `BUFFER_DAYS` constant (7) serves as the default fallback value.

**Error Handling**: API errors are categorized as 500-level (service unavailable) or 400-level (bad request/config issue). The module retries failed requests after `retryDelayMs`.

## Menu Parsing and Formatting

`TitanSchoolsClient` turns one day's `MenuMeals[]` into a structured menu and then formats it two ways (a per-line structure for the default `lines` layout, and a legacy sentence for `layout: "sentence"`).

### Stage 1: Parse MenuMeals by name — `parseMenuMeals(menuMeals)`

Since fall 2026 the API splits a day into several **named** MenuMeals, and the name carries the meaning. `classifyMenuMeal(name)` maps each to:

- **main** — anything not matched below (e.g. `"2-1 Elementary"`, `"1-4 MS"`, or an unnamed meal in older responses)
- **alternative** — `ALTERNATIVE_MEAL_PATTERN`: Choice 2–9/Two/Three/B–E, Grab & Go / Grab-N-Go, Box Lunch, Alternat… (e.g. `"2-1 Choice 2"`, `"2-3 Grab & Go 2"`). "Choice 1" is main.
- **shared** — `SHARED_SIDES_MEAL_PATTERN`: "Sides for All", "for all entrees", "shared sides" (e.g. `"Sides for All Entrees"`). A "shared" meal that contains an Entrees category is re-classified as main.

Within a meal, `categorizeRecipeCategory(categoryName)` maps each RecipeCategory to a role:

- `entrees` — contains "entree" or "main"
- `with` — category named "With" / "W/" (items served with the entree; **these used to be recipe-name prefixes**, see Stage 1b)
- `over` — category named "Over" (what the entree is served over)
- `sides` — contains "side"; meal-specific sides such as burger toppings
- `alternative` — legacy: a single category describing a whole alternative meal ("Choice 2 - includes fruit, vegetable & milk", "Box Lunch")
- `other` — everything else (Grain, Fruit, Vegetable, "Fruits & Vegetables", Milk, Dessert, Condiment); always treated as shared sides

Rules: categories in a **shared** meal, `other` categories in the **main** meal, and `sides` in the main meal *when the day has no shared meal* all go to `parsed.sharedSides`. Inside an **alternative** meal every non-entree category stays with that alternative (as its `sides`). Everything else attaches to its meal (`{ name, entrees, with, over, sides }`). After parsing: `with`/`over` are dropped from meals with no entrees (orphaned modifiers), content-less alternatives are removed, and if the main meal is empty the first alternative is promoted to main. Recipe names pass through `cleanRecipeName()` (strips leading `**` and trailing `-NEW!!` / `(NEW)` markers). Empty/missing `MenuMeals`, `RecipeCategories`, `Recipes` are tolerated (no old-shape `MenuMeals[0].RecipeCategories[0].Recipes[0]` guard).

Result shape: `{ main: Meal, alternatives: Meal[], sharedSides: [{ categoryName, recipes }] }`.

### Stage 1b: Merge legacy "with" recipe names — `mergeWithItems(recipes)`

Older data expressed accompaniments as recipe names starting with `"with "`, `"w/"` or `"over "`. These are folded into the preceding recipe in parentheses: `["Mixed Greens Salad", "with Dressing"]` → `["Mixed Greens Salad (with Dressing)"]`; consecutive items combine: `["Pizza", "with Sauce", "with Cheese"]` → `["Pizza (with Sauce and Cheese)"]`.

### Stage 2: Filtering

- `isCategoryIncluded(name, { allowModifiers })`: when `recipeCategoriesToInclude` is non-empty it alone decides (an explicit `"Milk"` beats the default exclude); otherwise anything not in `recipeCategoriesToExclude` (default `["Milk", "Condiment"]`) passes. Case-insensitive. `with`/`over` categories pass the include filter only inside main/alternative meals (`allowModifiers`), never in the shared meal.
- `hideEverydaySides` (default `false`): `removeEverydaySides()` drops shared sides that appear on every non-empty day of the fetched window (e.g. "Assorted Fruit Choices"). Needs ≥ `MIN_DAYS_FOR_EVERYDAY_SIDES` (3) non-empty days, otherwise it's a no-op. Runs per serving session before formatting.

### Stage 3: Format — `formatParsedMenu(parsed)`

Builds the object below, then returns `null` unless `mealHasContent(menu)` (main, alternatives, or sides non-empty) — the same predicate `processData` uses to skip empty days. Alternatives whose line formats to `""` are dropped.

```js
{
  main: "Mandarin Orange Chicken over Fluffy Brown Rice",       // formatMealLine(parsed.main)
  alternatives: [{ label: "", text: "Yogurt Parfait with Granola Packet" }],  // label = alternativeLabel with {categoryName} → meal name minus cycle prefix ("2-4 Choice 2" → "Choice 2")
  sides: ["Steamed Broccoli", "Fresh Veggies", "Fortune Cookie"], // shared sides, flat
  text: "Mandarin Orange Chicken over Fluffy Brown Rice with sides of ... . Or Yogurt Parfait with Granola Packet."  // formatSentence(parsed)
}
```

`formatMealLine(meal, sidesLimit)`: entrees joined with `entreeJoiner` (or with "and" for legacy category-alternatives), then `over X`, then `with A, B, and more` where meal-specific sides are capped at `mealSidesLimit` (default 2; 0 hides them).

`formatSentence(parsed)`: the legacy one-sentence form. Entrees (+with/over) then `with sides of` / `with a side of` (or `, plus sides of` when the entree already has "with" items — "over" alone keeps "with sides of") listing meal-specific **and** shared sides uncapped, then each alternative as `Or ...` (the first alternative gets no "Or" when there is no main text), trailing period. `showCategoryLabels` swaps the prefixes for `Entrees:` / `Sides:`. `formatMenu(recipeCategories)` wraps a flat category list in one unnamed meal and returns this sentence (kept for tests/back-compat).

### Frontend rendering (MMM-TitanSchoolMealMenu.js)

`renderMeal()` keeps the existing DOM/CSS hooks (`.meal-description`, `.breakfast-description`, `.lunch-description`, `.meal-title`, `.meal-recipes`) so user `custom.css` keeps working. Inside `.meal-recipes`, `layout: "lines"` emits `<div class="meal-main">`, `<div class="meal-alternative dimmed">or …</div>` per alternative (when `showAlternatives`), and `<div class="meal-sides dimmed">a · b · c</div>` (when `showSides`). `layout: "sentence"` emits `menu.text`. Text is set via `textContent`, not `innerHTML`.

`node_helper.js` passes the whole module config to `TitanSchoolsClient`, so every formatting option in `defaults` reaches the client.

## API Response Structure

The LinqConnect API returns data in this shape:
- `FamilyMenuSessions[]` - Contains separate sessions for breakfast and lunch
  - `ServingSession` - String matching "breakfast" or "lunch" (case-insensitive)
  - `MenuPlans[0].Days[]` - Array of daily menus
    - `Date` - Date string (`"9/14/2026"`)
    - `MenuMeals[]` - One per meal grouping. `MenuMealName` (may be absent in old data) is e.g. `"2-1 Elementary"`, `"2-1 Choice 2"`, `"Sides for All Entrees"`
      - `RecipeCategories[]` - `CategoryName` is e.g. Entrees, With, Over, Sides, Fruits & Vegetables, Dessert, Milk
        - `Recipes[]` - `RecipeName` is the food item name (may contain data-entry noise like `**` or `-NEW!!`)

Two mocks live in `test/unit/mocks/`: `mockApiResponse.js` (2023, single unnamed MenuMeal per day) and `mockApiResponseNamedMeals.js` (Sept 2026, named MenuMeals, nutrition stripped). To look at live data for a school, hit `https://api.linqconnect.com/api/FamilyMenu?buildingId=…&districtId=…&startDate=m-d-Y&endDate=m-d-Y` with a browser User-Agent header (the API 403s without one).

## Configuration

Required fields: `buildingId`, `districtId`

Optional but commonly customized:
- `numberOfDaysToDisplay` (default: 3) - How many days to display. Meaning depends on `bufferDays`:
  - If `bufferDays` > 0: Shows N days with menu data (skips empty days like weekends)
  - If `bufferDays` = 0: Shows N consecutive calendar days (old behavior)
- `bufferDays` (default: 7) - Number of extra days to fetch as buffer for filtering. Set to 0 to disable filtering and show consecutive days instead. Increase to 14-21 for extended holiday breaks.
- `recipeCategoriesToInclude` (default: []) - Restrict to these categories; empty = all. "With"/"Over" always pass.
- `recipeCategoriesToExclude` (default: ["Milk", "Condiment"]) - Hide these categories.
- `updateIntervalMs` (default: 3600000) - How often to refresh data
- `displayCurrentWeek` (default: false) - Start from beginning of week instead of today
- `hideEmptyDays` / `hideEmptyMeals` (default: false) - Control visibility of days/meals without data. Note: When `bufferDays` > 0, empty days are already filtered at the data level, making `hideEmptyDays` redundant.
- `debug` (default: false) - Enable verbose logging

**Display options:**
- `layout` (default: "lines") - "lines" (entree / "or alternative" / sides on separate lines) or "sentence" (legacy one-sentence form)
- `showAlternatives` (default: true), `showSides` (default: true) - Toggle the alternative and shared-sides lines in the lines layout
- `mealSidesLimit` (default: 2) - Meal-specific sides attached to an entree before "and more"; 0 hides them
- `hideEverydaySides` (default: false) - Drop shared sides that appear on every fetched day
- `entreeJoiner` (default: " or "), `useOxfordComma` (default: true), `showCategoryLabels` (default: false, sentence layout only)
- `alternativeLabel` (default: "") - Prefix for alternative meals; `{categoryName}` is replaced by the meal name minus its cycle prefix ("Choice 2", "Grab & Go"). Empty means "or"/"Or".

## Testing

Tests are organized into:
- `test/unit/` - Unit tests for TitanSchoolsClient data processing
- `test/integration/` - Tests verifying API response shape
- `test/unit/mocks/mockApiResponse.js` - 2023-shape mock (single unnamed MenuMeal per day)
- `test/unit/mocks/mockApiResponseNamedMeals.js` - 2026-shape mock (named MenuMeals: main / Choice 2 / Sides for All Entrees)

The `TitanSchoolsClient` has a `fetchMockMenu()` method that uses mock data for testing.

## Finding buildingId and districtId

Users need to inspect network requests on linqconnect.com to find their school's IDs in the query string parameters of requests to `/FamilyMenu`. These UUIDs are required for the module to function.
