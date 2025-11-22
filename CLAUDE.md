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

**Error Handling**: API errors are categorized as 500-level (service unavailable) or 400-level (bad request/config issue). The module retries failed requests after `retryDelayMs`.

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
- `numberOfDaysToDisplay` (default: 3) - How many days with menu data to display (automatically skips empty days)
- `recipeCategoriesToInclude` (default: ["Entrees", "Grain"]) - Which food categories to display
- `updateIntervalMs` (default: 3600000) - How often to refresh data
- `displayCurrentWeek` (default: false) - Start from beginning of week instead of today
- `hideEmptyDays` / `hideEmptyMeals` (default: false) - Control visibility of days/meals without data
- `debug` (default: false) - Enable verbose logging

## Testing

Tests are organized into:
- `test/unit/` - Unit tests for TitanSchoolsClient data processing
- `test/integration/` - Tests verifying API response shape
- `test/unit/mocks/mockApiResponse.js` - Mock data for testing without API calls

The `TitanSchoolsClient` has a `fetchMockMenu()` method that uses mock data for testing.

## Finding buildingId and districtId

Users need to inspect network requests on linqconnect.com to find their school's IDs in the query string parameters of requests to `/FamilyMenu`. These UUIDs are required for the module to function.
