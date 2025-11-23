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

**Recipe Category Filtering**: The API returns meals organized by `RecipeCategories` (Entrees, Grain, Fruit, Vegetable, Milk, Condiment, Extra). The `recipeCategoriesToInclude` config controls which categories are displayed. Empty array means show all categories.

**Date Label Generation**: The `upcomingRelativeDates()` function generates human-friendly labels (Today, Tomorrow, or day of week) for the configured number of days to display.

**Empty Day Filtering**: When `bufferDays` > 0 (default: 7), the module automatically filters out days without menu data and shows only N non-empty days. When `bufferDays` = 0, it reverts to the old behavior of showing N consecutive calendar days. The `BUFFER_DAYS` constant (7) serves as the default fallback value.

**Error Handling**: API errors are categorized as 500-level (service unavailable) or 400-level (bad request/config issue). The module retries failed requests after `retryDelayMs`.

## Smart Natural Language Formatting System

The module uses a sophisticated three-stage formatting system to convert raw API recipe data into readable, grammatically correct menu descriptions:

### Stage 1: Merge "with" Items

The `mergeWithItems()` method (TitanSchoolsClient.js) detects recipes whose names start with "with " (case-insensitive) and merges them with the preceding recipe:

```javascript
["Cheese Tortellini", "with Marinara Sauce", "Chicken Smackers"]
→ ["Cheese Tortellini with Marinara Sauce", "Chicken Smackers"]
```

This fixes awkward API data like "Tortellini or with Marinara Sauce" and transforms it into natural language: "Tortellini with Marinara Sauce".

### Stage 2: Categorize Recipe Categories

The `categorizeRecipeCategory()` method auto-detects the type of each RecipeCategory:

- **Entrees**: Categories containing "entree" or "main" (e.g., "Main Entrees")
- **Sides**: All other categories except alternatives (e.g., "Sides", "Grain", "Fruit", "Vegetable")
- **Alternatives**: Categories for complete alternative meals:
  - Contains "box lunch" or "choice 2" or "choice two"
  - Contains "includes fruit" (common pattern for alternative meal descriptions)

### Stage 3: Format with Grammar Rules

The `formatMenu()` method applies different grammar rules based on category type:

**Entrees:**
- Multiple entrees are joined with `entreeJoiner` (default: " or ")
- Example: `"Cheeseburger or Hamburger or Spicy Chicken Sandwich"`

**Sides:**
- 2 items: joined with `sideJoiner` (default: ", ")
- 3+ items: uses `joinWithConjunction()` with "and" + Oxford comma (if enabled)
- Prefixed with "with " when there are entrees
- Example: `"with Macaroni & Cheese, Green Beans, and Fresh Veggies"`

**Alternatives:**
- Separated from main meal with a period
- Label controlled by `alternativeLabel` config (default: "" shows just "Or {items}")
- Supports `{categoryName}` placeholder to display full category name
- Example (default): `"Or PBJ Uncrustable, String Cheese, Baked Chips"`
- Example (with label): `"Or Choice 2 - includes fruit, vegetable & milk: PBJ Uncrustable..."`

**Trailing Period:**
- ALL menu descriptions get a trailing period
- Without alternatives: `"Chicken Tenders with sides."`
- With alternatives: `"Main meal. Or alternative."`

### Formatting Methods

- `mergeWithItems(recipes[])` - Merges "with" items with preceding recipes
- `categorizeRecipeCategory(categoryName)` - Returns 'entrees', 'sides', or 'alternative'
- `joinWithConjunction(items[], finalConjunction)` - Grammatically joins items with commas and conjunction
- `formatMenu(recipeCategories[])` - Main orchestrator that applies all formatting rules

## API Response Structure

The LinqConnect API returns data in this shape:
- `FamilyMenuSessions[]` - Contains separate sessions for breakfast and lunch
  - `ServingSession` - String matching "breakfast" or "lunch" (case-insensitive)
  - `MenuPlans[0].Days[]` - Array of daily menus
    - `Date` - Date string
    - `MenuMeals[].RecipeCategories[].Recipes[]` - Nested structure of meal items
      - `CategoryName` - Used for filtering (Entrees, Grain, etc.)
      - `RecipeName` - Actual food item name

## Configuration

Required fields: `buildingId`, `districtId`

Optional but commonly customized:
- `numberOfDaysToDisplay` (default: 3) - How many days to display. Meaning depends on `bufferDays`:
  - If `bufferDays` > 0: Shows N days with menu data (skips empty days like weekends)
  - If `bufferDays` = 0: Shows N consecutive calendar days (old behavior)
- `bufferDays` (default: 7) - Number of extra days to fetch as buffer for filtering. Set to 0 to disable filtering and show consecutive days instead. Increase to 14-21 for extended holiday breaks.
- `recipeCategoriesToInclude` (default: ["Entrees", "Grain"]) - Which food categories to display
- `updateIntervalMs` (default: 3600000) - How often to refresh data
- `displayCurrentWeek` (default: false) - Start from beginning of week instead of today
- `hideEmptyDays` / `hideEmptyMeals` (default: false) - Control visibility of days/meals without data. Note: When `bufferDays` > 0, empty days are already filtered at the data level, making `hideEmptyDays` redundant.
- `debug` (default: false) - Enable verbose logging

**Formatting Options** (added in smart natural language formatting system):
- `entreeJoiner` (default: " or ") - Text used to join multiple entree items
  - Example: Set to ", " for "Cheeseburger, Hamburger, Spicy Chicken" instead of "Cheeseburger or Hamburger or Spicy Chicken"
- `sideJoiner` (default: ", ") - Text used to join side items
  - Example: Set to "; " for semicolon separation
- `showCategoryLabels` (default: false) - Display category labels (e.g., "Entrees:", "Sides:") before menu items
- `useOxfordComma` (default: true) - Use Oxford comma before final "and" in lists of 3+ items
  - true: "item1, item2, and item3"
  - false: "item1, item2 and item3"
- `alternativeLabel` (default: "") - Label shown before alternative meal options (like "Box Lunch" or "Choice 2")
  - Empty string (default): Shows "Or {items}" without category name
  - Supports `{categoryName}` placeholder: "Or {categoryName}:" displays full category name
  - Custom text: "Alternative:" or any other prefix you prefer
  - Examples:
    - `""` → "Or PBJ Uncrustable, String Cheese, Baked Chips"
    - `"Or {categoryName}:"` → "Or Choice 2 - includes fruit, vegetable & milk: PBJ Uncrustable..."
    - `"Alternative:"` → "Alternative: PBJ Uncrustable, String Cheese, Baked Chips"

## Testing

Tests are organized into:
- `test/unit/` - Unit tests for TitanSchoolsClient data processing
- `test/integration/` - Tests verifying API response shape
- `test/unit/mocks/mockApiResponse.js` - Mock data for testing without API calls

The `TitanSchoolsClient` has a `fetchMockMenu()` method that uses mock data for testing.

## Finding buildingId and districtId

Users need to inspect network requests on linqconnect.com to find their school's IDs in the query string parameters of requests to `/FamilyMenu`. These UUIDs are required for the module to function.
