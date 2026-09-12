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
  sidesText: "Steamed Broccoli, Fresh Veggies, and Fortune Cookie", // same, as one phrase for display
  text: "Mandarin Orange Chicken over Fluffy Brown Rice with sides of ... . Or Yogurt Parfait with Granola Packet."  // formatSentence(parsed)
}
```

`formatMealLine(meal, sidesLimit)`: entrees joined with `entreeJoiner` (or with "and" for legacy category-alternatives), then `over X`, then `with A, B, and more` where meal-specific sides are capped at `mealSidesLimit` (default 2; 0 hides them).

`formatSentence(parsed)`: the legacy one-sentence form. Entrees (+with/over) then `with sides of` / `with a side of` (or `, plus sides of` when the entree already has "with" items — "over" alone keeps "with sides of") listing meal-specific **and** shared sides uncapped, then each alternative as `Or ...` (the first alternative gets no "Or" when there is no main text), trailing period. `showCategoryLabels` swaps the prefixes for `Entrees:` / `Sides:`. `formatMenu(recipeCategories)` wraps a flat category list in one unnamed meal and returns this sentence (kept for tests/back-compat).

### Frontend rendering (MMM-TitanSchoolMealMenu.js)

`renderMeal()` keeps the existing DOM/CSS hooks (`.meal-description`, `.breakfast-description`, `.lunch-description`, `.meal-title`, `.meal-recipes`) so user `custom.css` keeps working. `renderMealParts()` fills `.meal-recipes` with a `.meal-main` part, one `.meal-alternative` part per alternative ("or …"; `alternativeLabel` replaces the "or"), and a `.meal-sides` part (`<span class="meal-sides-label">Sides: </span>` + `sidesText`, i.e. "a, b, and c" via `joinWithConjunction`; label from `sidesLabel`) when `showSides`. `layout: "lines"` emits them as `<div>`s; `layout: "sentence"` emits `<span>`s each ending in a period, flowing as one paragraph (the user's preferred form: everything for a day in one wrapped block, sides last). All parts share one bright, light-weight (300) style in module CSS (`.meal-main`, `.meal-alternative`, `.meal-sides`): the mirror has a photo wallpaper and both `dimmed` and weight-300 text were unreadable on it. The classes remain for `custom.css` overrides. Text is set via `textContent`, not `innerHTML`.

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
- `layout` (default: "lines") - "lines" (main / "or alternative" / "Sides:" on separate lines) or "sentence" (same parts as one flowing paragraph)
- `showAlternatives` (default: true), `showSides` (default: true), `sidesLabel` (default: "Sides:") - Show the "or …" alternatives and the trailing "Sides: …" part
- `mealSidesLimit` (default: 2) - Meal-specific sides attached to an entree before "and more"; 0 hides them
- `hideEverydaySides` (default: false) - Drop shared sides that appear on every fetched day
- `entreeJoiner` (default: " or "), `useOxfordComma` (default: true), `showCategoryLabels` (default: false, only affects the client's `text` field)
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

## Development, Review, and Deploy Workflow

This fork is the one that runs on the family's MagicMirror. Every change, however small, follows the same loop; keep it that way so the Pi and `main` never drift.

### Repos and remotes

- `origin` = **github.com/Techneaux/MMM-TitanSchoolMealMenu** — the user's fork. All branches, PRs, and merges go here. `gh` is authenticated as `Techneaux`.
- `upstream` = github.com/dathbe/MMM-TitanSchoolMealMenu — read-only reference; never open PRs there unless explicitly asked.
- The repo is **public**: never commit `config.js`, IDs paired with a family name, tokens, or backups.

### The loop

This repo's default branch is `main`. Other Techneaux modules differ (`master` on MMM-OpenWeatherForecast and MMM-SugarValue), so when working across modules check first: `gh repo view Techneaux/<module> --json defaultBranchRef --jq .defaultBranchRef.name`.

1. **Branch** from up-to-date `main`: `git checkout -b feature/<slug>` (or `fix/`, `docs/`).
2. **Verify against live data before changing formatting.** The district edits its menus by hand and the shape drifts; don't reason from the mocks alone. Fetch a week for both configured schools (buildingIds are in the Pi's `config.js`; districtId is shared) and print `MenuMealName` / `CategoryName` / `RecipeName`, then run the response through `new TitanSchoolsClient({...}).extractMenusByDate(json)` and eyeball `main` / `alternatives` / `sides` / `text` per day. The API returns 403 without a browser `User-Agent`. When the shape changes, trim a real capture (strip `Nutrients`) into `test/unit/mocks/` and test against it.
3. **Change + test**: `npx jest` must be green. Frontend changes have no unit tests — sanity-load the module with `new Function("Module", src)({ register: (n, o) => ... })` and read the DOM code carefully; the real check is the mirror.
4. **Docs in the same commit**: README options table, this file, and `package.json` version (patch for CSS/wording, minor for options or data-shape changes).
5. **Commit** with a body that says *why* (what the data looked like, what the mirror showed). End with the `Claude-Session:` line when working in Claude Code.
6. **PR to `origin main`**: `gh pr create --repo Techneaux/MMM-TitanSchoolMealMenu --base main ...`. For anything beyond CSS/wording, request a **GitHub Copilot code review** and fix the real findings before merging. Copilot cannot be requested by login (`gh pr edit --add-reviewer Copilot` fails to resolve the user, and the REST `requested_reviewers` endpoint returns 200 without adding anyone) — it is a Bot, so use the GraphQL mutation:

   ```bash
   PR=$(gh pr view <n> --repo Techneaux/MMM-TitanSchoolMealMenu --json id --jq .id)
   gh api graphql -f query='mutation($prId:ID!,$botIds:[ID!]){requestReviews(input:{pullRequestId:$prId,botIds:$botIds,union:true}){pullRequest{number}}}' \
     -F prId="$PR" -F botIds=BOT_kgDOCnlnWA
   ```

   `BOT_kgDOCnlnWA` is `copilot-pull-request-reviewer[bot]` (global, not per-repo; re-derive with `gh api '/users/copilot-pull-request-reviewer[bot]' --jq .node_id`). Don't confuse it with `copilot-swe-agent[bot]` (`BOT_kgDOC9w8XQ`, the coding agent — the only Copilot bot listed in `suggestedActors`). Passing a single `-F botIds=…` is fine even though the variable is `[ID!]`; GraphQL coerces it — ignore Copilot if it says otherwise. `copilot_work_started` appears in the PR timeline immediately and the review lands in 2–5 minutes; read it with `gh api /repos/Techneaux/MMM-TitanSchoolMealMenu/pulls/<n>/reviews --jq '.[] | "\(.user.login) \(.state)"'` (`.[-1].body` for the summary) and `.../pulls/<n>/comments --jq '.[] | "\(.path):\(.line)\n\(.body)"'`. Re-run the same mutation to re-review after pushing fixes. It reviews at "Lite" effort and leans to style nits but does catch real bugs — fix what's real, ignore the rest, don't argue in the thread. To stop requesting by hand, add a branch ruleset (Settings → Rulesets → **Automatically request Copilot code review**). Do not use Claude Code's `/code-review` skill on this repo.
7. **Merge**: `gh pr merge <n> --repo Techneaux/MMM-TitanSchoolMealMenu --squash --delete-branch`, then `git checkout main && git pull`.
8. **Deploy** (see below) and **look at the mirror** — the user judges legibility on the actual wall-mounted screen with a photo wallpaper, which no local render reproduces. Expect a round or two of "too dim / too bold / too much space" follow-ups; each one goes through steps 1–8 again, small.

### Deploying to the mirror

The mirror is a Raspberry Pi running MagicMirror² under pm2; the module directory there is a plain `git clone` of `origin` on `main`.

```bash
ssh jason@raspberrypi.local        # key auth from the user's Mac; use the .local name, the IP moves
cd ~/MagicMirror/modules/MMM-TitanSchoolMealMenu
git pull --ff-only                  # must be a fast-forward; the Pi never has local commits
npm install --omit=dev              # only needed if package.json deps changed
pm2 restart MagicMirror
pm2 logs MagicMirror --lines 60 --nostream | grep -iE "titan|TypeError|check_config"
```

Only run `npm install` inside the *module* directory. `~/MagicMirror` itself carries a hand-applied node-ical patch that any `npm install` there wipes; MM upgrades, that patch, and mmpm (a Python venv, not npm) are mirror-level procedures documented in the private runbook (§5a–5c), not here. MM is 2.37 as of Sept 2026.

`pm2 restart` reloads the Electron front end too, so a stale-JS "[object Object]" render is not a concern. Pre-existing, unrelated log noise: `[calendar] fetch failed` (Google Calendar timeouts) and `[updatenotification] Failed to retrieve repo info for MMM-TitanSchoolMealMenu` (its `git fetch --dry-run`); ignore both.

Headless-browser screenshots of `http://<pi>:8080` hang (MagicMirror keeps sockets open) and `.local` names don't resolve inside the sandboxed browser — don't burn time on it; ask the user for a phone photo instead. `curl http://<pi>:8080/modules/MMM-TitanSchoolMealMenu/MMM-TitanSchoolMealMenu.js | grep <newSymbol>` is enough to confirm the served build.

### Editing the mirror's config

`~/MagicMirror/config/config.js` on the Pi holds two `MMM-TitanSchoolMealMenu` instances (Eastview, Century; same district, `position: "top_right"`, `classes: "page0"` for MMM-pages). Current non-default settings there: `size: "small"`, `numberOfDaysToDisplay: 2`, `hideEmptyDays`/`hideEmptyMeals: true`, `recipeCategoriesToInclude: []`, `hideEverydaySides: true`, `layout: "sentence"`.

Always: `cp config.js config.js.bak-$(date +%Y%m%d-%H%M%S)` first, edit with `sed` or a heredoc, then validate with `node -e 'require("./config.js")'` (MagicMirror also runs `check_config` on start — look for "doesn't contain syntax errors" in the pm2 log) before `pm2 restart`. Prefer changing module defaults over adding config keys when the change is what every user would want; prefer config keys for family taste (layout, hideEverydaySides).

The Pi's `~/MagicMirror/config/custom.css` (MM 2.37 moved it out of `css/`) hides `.meal-title` and `.breakfast-description` for this module and sets `max-width: 450px` / `li { font-size: 16px }` — keep those CSS hooks stable, and remember lines wrap at 450px when judging length. Back both files up (runbook §7 "Take a new backup") after changing either.

### Backups and the private runbook

The user keeps a private MagicMirror docs root on their Mac at `~/data/docs/personal/magicmirror/`: `README.md` is the full runbook (host details, cron schedule, this workflow, requesting Copilot reviews, MM/mmpm upgrades, the node-ical patch, how to take a new config backup, rebuild steps), `backups/<YYYY-MM-DD>/` holds config-only snapshots of the Pi (config.js, custom.css, mm.sh, pm2 dump, crontab, module list, patches), and `patches/` mirrors `~/MagicMirror-patches/` on the Pi. The newest snapshot contains real secrets — never copy it into this repo or anywhere synced. There is no SD-card image. When the workflow in this section changes, update the runbook too.
