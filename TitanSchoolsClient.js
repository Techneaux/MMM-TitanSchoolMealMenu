const axios = require("axios").default;

/**
 * Number of extra days to request from the API as a buffer
 * to ensure we have enough non-empty days to display
 */
const BUFFER_DAYS = 7;

/**
 * MenuMeal names (from the API) that hold a complete alternative meal,
 * e.g. "2-1 Choice 2", "2-3 Grab & Go 2", "Box Lunch"
 */
const ALTERNATIVE_MEAL_PATTERN = /choice\s*(?:[2-9]|two|three|[b-e])\b|grab\W*(?:n|and)?\W*go|box\s*lunch|alternat/i;

/**
 * MenuMeal names that hold sides shared by every entree, e.g. "Sides for All Entrees"
 */
const SHARED_SIDES_MEAL_PATTERN = /sides?\s+for\s+all|for\s+all\s+(?:entrees|meals|choices)|all\s+entrees|shared\s+sides?/i;

/**
 * hideEverydaySides only kicks in once at least this many non-empty days were fetched
 */
const MIN_DAYS_FOR_EVERYDAY_SIDES = 3;

/**
 * Menu-cycle prefixes that districts put in front of MenuMeal names, e.g. the "2-1 " in "2-1 Choice 2"
 */
const MEAL_NAME_CYCLE_PREFIX = /^\d+\s*-\s*\d+\s+/;

/**
 * A _very_ lightweight client for the TitanSchools API.
 */
class TitanSchoolsClient {
  constructor(config = {}) {
    if (typeof config.buildingId === "undefined") {
      throw new Error(
        "TitanSchools API client needs a buildingId config value"
      );
    }
    if (typeof config.districtId === "undefined") {
      throw new Error(
        "TitanSchools API client needs a districtId config value"
      );
    }

    this.debug = config.debug === true;

    this.requestParams = {
      buildingId: config.buildingId,
      districtId: config.districtId,
    };

    this.numberOfDaysToDisplay = config.numberOfDaysToDisplay;
    this.bufferDays = config.bufferDays ?? BUFFER_DAYS;

    // Category filtering. An empty include list means "everything" (except the excluded categories).
    // Categories that modify an entree ("With", "Over") always ride along with the entree.
    this.recipeCategoriesToInclude = config.recipeCategoriesToInclude ?? [];
    this.recipeCategoriesToExclude = config.recipeCategoriesToExclude ?? ["Milk", "Condiment"];

    // How many meal-specific sides (burger toppings, etc.) to attach to an entree before saying "and more".
    // 0 hides them entirely.
    this.mealSidesLimit = config.mealSidesLimit ?? 2;

    // Drop shared sides that show up on every fetched day (e.g. "Assorted Fruit Choices"), since they carry no information.
    this.hideEverydaySides = config.hideEverydaySides ?? false;

    // Formatting options for menu display
    this.entreeJoiner = config.entreeJoiner ?? " or ";
    this.showCategoryLabels = config.showCategoryLabels ?? false;
    this.useOxfordComma = config.useOxfordComma ?? true;
    this.alternativeLabel = config.alternativeLabel ?? ""; // Support {categoryName} placeholder

    this.client = axios.create({
      baseURL: "https://api.linqconnect.com/api/",
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
  }

  async fetchMockMenu() {
    const data = require("./test/unit/mocks/mockApiResponse");
    return this.processData(data);
  }

  /**
   * Fetches menu data from the TitanSchools API and formats it as shown below
   *
   * @param Date startDate A Date object that specifies which day the menu should start on
   * @param Date endDate A Date object that specifies which day the menu should end on
   * @throws Error If the TitanSchools API responds with a 400- or 500-level HTTP status
   *
   * @returns An array of days shaped like this (starting on {startDate} and including {config.numberOfDaysToDisplay} days).
   * A meal is `null` when there is nothing to show for it.
   * [
   *   { "date": "9-6-2021", "label": "Today", "breakfast": null, "lunch": null },
   *   {
   *     "date": "9-7-2021",
   *     "label": "Tomorrow",
   *     "breakfast": {
   *       "main": "Banana Muffin or Maple Waffle Snaps",
   *       "alternatives": [],
   *       "sides": ["Breakfast Protein Item", "Assorted Fruit Choices"],
   *       "sidesText": "Breakfast Protein Item and Assorted Fruit Choices",
   *       "text": "Banana Muffin or Maple Waffle Snaps with sides of Breakfast Protein Item and Assorted Fruit Choices."
   *     },
   *     "lunch": {
   *       "main": "Mandarin Orange Chicken over Fluffy Brown Rice",
   *       "alternatives": [{ "label": "", "text": "Yogurt Parfait with Granola Packet" }],
   *       "sides": ["Steamed Broccoli", "Fresh Veggies", "Assorted Fruit Choices", "Fortune Cookie"],
   *       "sidesText": "Steamed Broccoli, Fresh Veggies, Assorted Fruit Choices, and Fortune Cookie",
   *       "text": "Mandarin Orange Chicken over Fluffy Brown Rice with sides of Steamed Broccoli, Fresh Veggies, Assorted Fruit Choices, and Fortune Cookie. Or Yogurt Parfait with Granola Packet."
   *     }
   *   }
   * ]
   */
  async fetchMenu(startDate, endDate) {
    let params = {
      ...this.requestParams,
      // API requires dates to be formatted as: m-d-Y (i.e. 12-5-2021)
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    };

    if (this.debug) {
      console.debug(`Using ${params.startDate} as startDate, ${params.endDate} as endDate`);

      // Log the outbound API request
      this.client.interceptors.request.use((request) => {
        console.debug(
          `Sending API request: ${JSON.stringify({
            url: request.url,
            params: request.params,
          })}`
        );
        return request;
      });
    }

    try {
      const axiosResponse = await this.client.get("/FamilyMenu", {
        params,
      });

      return this.processData(axiosResponse.data);
    } catch (error) {
      if (error.response?.status && error.response.status >= 500) {
        throw new Error(
          `The TitanSchools API is unavailable: ${error.response.data?.error_description}`
        );
      } else if (error.response?.status && error.response.status >= 400) {
        throw new Error(
          `The TitanSchools API sure didn't like the request we sent and responded with: ${
            error.response.data?.error_description || error.response.status
          }. Maybe double check your config values.`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   *
   * @param Date dateObject A Date object
   * @returns string A date string formatted as m-d-Y (1-9-2023)
   */
  formatDate(dateObject) {
    return `${
      dateObject.getMonth() + 1 // javascript month is 0-indexed :facepalm:
    }-${dateObject.getDate()}-${dateObject.getFullYear()}`;
  }

  /**
   * Takes in a raw response body from the TitanSchools API and outputs a normalized array of menus by date.
   * Since the TitanSchools API has the potential to change without warning, this function will isolate breaking
   * API changes and output normalized data that the rest of the functions can assume to be correct.
   *
   * @param Object apiResponse The response body from the TitanSchools API.
   * @returns Array One array per serving session (breakfast, lunch), each holding
   *   `{ date, breakfastOrLunch, menu }` per day, where `menu` is the object described on fetchMenu() or `null`.
   */
  extractMenusByDate(apiResponse) {
    if (!Object.hasOwnProperty.call(apiResponse, "FamilyMenuSessions")) {
      if (this.debug) {
        console.log(
          `TitanSchools API response did not contain the expected data: ${apiResponse}`
        );
      } else {
        console.log(
          `TitanSchools API response did not contain the expected data. Set 'debug: true' in the modules.MMM-TitanSchoolMealMenu section of config.json file for verbose logs`
        );
      }
      return [];
    }
    const menus = apiResponse.FamilyMenuSessions.map((menuSession) => {
      // The titank12 API has several possible values for the ServingSession,
      // including "Breakfast", "Lunch", "Seamless Summer Lunch", "Seamless Summer Breakfast".
      const breakfastOrLunch = menuSession.ServingSession.match(/breakfast/i)
        ? "breakfast"
        : "lunch";

      const days = (menuSession.MenuPlans?.[0]?.Days ?? []).map((menuForThisDate) => ({
        date: menuForThisDate.Date,
        breakfastOrLunch,
        parsed: this.parseMenuMeals(menuForThisDate.MenuMeals, `${breakfastOrLunch} menu for ${menuForThisDate.Date}`),
      }));

      if (this.hideEverydaySides) {
        this.removeEverydaySides(days);
      }

      return days.map(({ date, parsed }) => ({
        date,
        breakfastOrLunch,
        menu: this.formatParsedMenu(parsed),
      }));
    });

    if (this.debug) {
      console.debug(
        `Menus extracted from the TitanSchools API response: ${JSON.stringify(
          menus
        )}`
      );
    }

    return menus;
  }

  /**
   * Parses one day's MenuMeals[] into a structured menu.
   *
   * The API groups a day into several MenuMeals whose *names* carry the meaning:
   *   "2-1 Elementary"        → the main meal (Entrees, plus With/Over/Sides categories that belong to the entree)
   *   "2-1 Choice 2"          → an alternative complete meal (also "Grab & Go", "Box Lunch")
   *   "Sides for All Entrees" → sides shared by every choice (Fruits & Vegetables, Milk, Dessert)
   * Older responses have a single unnamed MenuMeal, which is treated as the main meal.
   *
   * @param {Array} menuMeals - MenuMeals[] for one day
   * @param {string} logLabel - Used in debug logs only
   * @returns {{ main: Object, alternatives: Array, sharedSides: Array }}
   */
  parseMenuMeals(menuMeals, logLabel = "menu") {
    const parsed = {
      main: this.emptyMeal(""),
      alternatives: [],
      sharedSides: [], // [{ categoryName, recipes: [] }]
    };
    // Just for logging/troubleshooting, keep track of all the categories in this menu and note which ones get
    // intentionally filtered out.
    const categoriesToLog = { all: [], filteredOut: [] };

    // When the district splits shared sides into their own MenuMeal, a "Sides" category inside the main meal is
    // specific to that entree (burger toppings, etc.). Without that split, "Sides" are the sides for the whole day.
    const hasSharedSidesMeal = (menuMeals ?? []).some(
      (menuMeal) => this.classifyMenuMeal(menuMeal.MenuMealName) === "shared"
    );

    (menuMeals ?? []).forEach((menuMeal) => {
      const mealName = menuMeal.MenuMealName ?? "";
      const recipeCategories = menuMeal.RecipeCategories ?? [];
      let mealType = this.classifyMenuMeal(mealName);

      // A "shared sides" meal that has its own entrees isn't shared sides after all (e.g. "Lunch for All Grades")
      if (
        mealType === "shared" &&
        recipeCategories.some((recipeCategory) => this.categorizeRecipeCategory(recipeCategory.CategoryName) === "entrees")
      ) {
        mealType = "main";
      }

      let target = parsed.main;
      if (mealType === "alternative") {
        target = this.emptyMeal(mealName);
        parsed.alternatives.push(target);
      }

      recipeCategories.forEach((recipeCategory) => {
        const categoryName = recipeCategory.CategoryName ?? "";
        if (!categoriesToLog.all.includes(categoryName)) {
          categoriesToLog.all.push(categoryName);
        }
        // "With"/"Over" only ride along with an entree, so they only bypass the include filter inside a real meal
        if (!this.isCategoryIncluded(categoryName, { allowModifiers: mealType !== "shared" })) {
          if (!categoriesToLog.filteredOut.includes(categoryName)) {
            categoriesToLog.filteredOut.push(categoryName);
          }
          return;
        }

        const recipes = this.mergeWithItems(
          (recipeCategory.Recipes ?? [])
            .map((recipe) => this.cleanRecipeName(recipe.RecipeName))
            .filter((name) => name.length > 0)
        );
        if (recipes.length === 0) {
          return;
        }

        const categoryType = this.categorizeRecipeCategory(categoryName);

        // Sides shared by the whole day: anything in a shared meal, "other" categories (Grain, Fruit, ...) in the
        // main meal, and the main meal's "Sides" when the district doesn't split shared sides out. Inside an
        // alternative meal every non-entree category belongs to that alternative.
        const isSharedSide =
          mealType === "shared" ||
          (categoryType === "other" && mealType === "main") ||
          (categoryType === "sides" && mealType === "main" && !hasSharedSidesMeal);

        if (isSharedSide) {
          parsed.sharedSides.push({ categoryName, recipes });
        } else if (categoryType === "alternative") {
          // Older data: a single category (e.g. "Choice 2 - includes fruit, vegetable & milk") lists a whole alternative meal
          parsed.alternatives.push({
            ...this.emptyMeal(categoryName),
            entrees: recipes,
            entreesAreOneMeal: true,
          });
        } else {
          const bucket = categoryType === "other" ? "sides" : categoryType;
          target[bucket].push(...recipes);
        }
      });
    });

    // "With"/"Over" items describe an entree; without one (e.g. entrees filtered out) they mean nothing
    [parsed.main, ...parsed.alternatives].forEach((meal) => {
      if (meal.entrees.length === 0) {
        meal.with = [];
        meal.over = [];
      }
    });

    parsed.alternatives = parsed.alternatives.filter((meal) => this.mealHasItems(meal));

    // If nothing was recognized as the main meal, the first alternative is effectively the meal
    if (!this.mealHasItems(parsed.main) && parsed.alternatives.length > 0) {
      parsed.main = parsed.alternatives.shift();
    }

    if (this.debug) {
      let message = `The ${logLabel} contains the following categories: ${categoriesToLog.all.join(", ")}`;
      if (categoriesToLog.filteredOut.length > 0) {
        message += `, but ${categoriesToLog.filteredOut.join(", ")} were filtered out by recipeCategoriesToInclude/recipeCategoriesToExclude.`;
      }
      console.debug(message);
    }

    return parsed;
  }

  emptyMeal(name) {
    return { name, entrees: [], with: [], over: [], sides: [] };
  }

  mealHasItems(meal) {
    return meal.entrees.length + meal.with.length + meal.over.length + meal.sides.length > 0;
  }

  parsedHasContent(parsed) {
    return (
      !!parsed &&
      (this.mealHasItems(parsed.main) ||
        parsed.alternatives.length > 0 ||
        parsed.sharedSides.length > 0)
    );
  }

  /**
   * True when a formatted meal (as sent to the frontend) has something to display
   */
  mealHasContent(menu) {
    return !!menu && (!!menu.main || menu.alternatives.length > 0 || menu.sides.length > 0);
  }

  /**
   * @param {string} menuMealName - MenuMeal.MenuMealName from the API
   * @returns {string} One of: 'main', 'alternative', 'shared'
   */
  classifyMenuMeal(menuMealName) {
    const name = (menuMealName ?? "").trim();
    if (SHARED_SIDES_MEAL_PATTERN.test(name)) return "shared";
    if (ALTERNATIVE_MEAL_PATTERN.test(name)) return "alternative";
    return "main";
  }

  /**
   * The MenuMeal name without the district's menu-cycle prefix ("2-1 Choice 2" → "Choice 2")
   */
  displayMealName(menuMealName) {
    return (menuMealName ?? "").replace(MEAL_NAME_CYCLE_PREFIX, "").trim();
  }

  /**
   * Strips data-entry noise from a recipe name: leading asterisks ("**Hot Breakfast Entree"),
   * trailing "-NEW!!" / "(NEW)" markers, and stray whitespace.
   */
  cleanRecipeName(recipeName) {
    return String(recipeName ?? "")
      .replace(/^[\s*]+/, "")
      .replace(/\s*(?:[-–]\s*new!*|\(\s*new!*\s*\)|new!+)\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Applies recipeCategoriesToInclude / recipeCategoriesToExclude (case-insensitive).
   * When an include list is given it alone decides (so listing "Milk" beats the default exclude);
   * otherwise everything not excluded passes. "With"/"Over" categories modify an entree and pass the
   * include filter whenever `allowModifiers` is set (i.e. inside a main or alternative meal).
   */
  isCategoryIncluded(categoryName, { allowModifiers = true } = {}) {
    const lowerName = categoryName.toLowerCase();
    const listed = (list) => list.some((c) => c.toLowerCase() === lowerName);

    if (this.recipeCategoriesToInclude.length > 0) {
      if (listed(this.recipeCategoriesToInclude)) {
        return true;
      }
      const type = this.categorizeRecipeCategory(categoryName);
      return allowModifiers && (type === "with" || type === "over") && !listed(this.recipeCategoriesToExclude);
    }

    return !listed(this.recipeCategoriesToExclude);
  }

  /**
   * Removes shared sides that appear on every non-empty day of the fetched window (e.g. "Assorted Fruit Choices",
   * "Fresh Veggies"). Mutates the `parsed` objects in place.
   *
   * @param {Array} days - [{ parsed }] for one serving session
   */
  removeEverydaySides(days) {
    const daysWithContent = days.filter((day) => this.parsedHasContent(day.parsed));
    // With fewer days than this, "every day" says more about the window than about the side
    if (daysWithContent.length < MIN_DAYS_FOR_EVERYDAY_SIDES) {
      return;
    }

    const counts = {};
    daysWithContent.forEach((day) => {
      const names = new Set(day.parsed.sharedSides.flatMap((group) => group.recipes));
      names.forEach((name) => {
        counts[name] = (counts[name] ?? 0) + 1;
      });
    });

    daysWithContent.forEach((day) => {
      day.parsed.sharedSides = day.parsed.sharedSides
        .map((group) => ({
          ...group,
          recipes: group.recipes.filter((name) => counts[name] < daysWithContent.length),
        }))
        .filter((group) => group.recipes.length > 0);
    });
  }

  /**
   * Merges recipes that start with "with", "w/", or "over" into their preceding recipe
   * @param {Array} recipes - Array of recipe name strings
   * @returns {Array} - Array of recipe names with "with" items merged in parentheses
   *
   * Examples:
   *   ['Pizza', 'with Sauce'] → ['Pizza (with Sauce)']
   *   ['Pizza', 'with Sauce', 'with Cheese'] → ['Pizza (with Sauce and Cheese)']
   *   ['Pizza', 'w/ Sauce'] → ['Pizza (with Sauce)']
   *   ['Pizza', 'w/Sauce'] → ['Pizza (with Sauce)']
   *   ['Chicken', 'over Rice'] → ['Chicken (with Rice)']
   */
  mergeWithItems(recipes) {
    const merged = [];

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const trimmedLower = recipe.toLowerCase().trim();
      // Match "with " prefix, "w/" prefix (with optional space), or "over " prefix
      const startsWithWith = trimmedLower.startsWith('with ');
      const startsWithWSlash = trimmedLower.startsWith('w/');
      const startsWithOver = trimmedLower.startsWith('over ');
      const isWithItem = startsWithWith || startsWithWSlash || startsWithOver;

      if (isWithItem && merged.length > 0) {
        const previousItem = merged[merged.length - 1];

        // Check if previous item already has a "with" item in parentheses
        // Use specific regex to avoid false positives with items like "Burger (1/4 lb)"
        const withParenRegex = /\(with [^)]+?\)$/i;
        if (withParenRegex.test(previousItem)) {
          // Multiple consecutive "with" items - extend the existing "with" parenthetical
          // Replace the closing paren, add " and {item without 'with'/'w/'/'over'}", then add paren back
          // Normalize "with ", "w/ " (or "w/"), and "over " to extract just the item name
          const itemWithoutPrefix = recipe.trim().replace(/^(with\s+|w\/\s*|over\s+)/i, '');
          merged[merged.length - 1] = previousItem.replace(
            /\)$/,
            ` and ${itemWithoutPrefix})`
          );
        } else {
          // First "with" item - wrap it in parentheses
          // Normalize "w/" and "over" to "with" for consistent output, preserve "with " items as-is
          let normalizedRecipe;
          if (startsWithWSlash) {
            normalizedRecipe = recipe.trim().replace(/^w\/\s*/i, 'with ');
          } else if (startsWithOver) {
            normalizedRecipe = recipe.trim().replace(/^over\s+/i, 'with ');
          } else {
            normalizedRecipe = recipe;
          }
          merged[merged.length - 1] = `${previousItem} (${normalizedRecipe})`;
        }
      } else {
        // Regular recipe or first item
        merged.push(recipe);
      }
    }

    return merged;
  }

  /**
   * Categorizes a recipe category name by its role in the meal
   * @param {string} categoryName - The RecipeCategory.CategoryName from the API
   * @returns {string} - One of:
   *   'entrees'     - the main choices ("Entrees", "Main Entree")
   *   'with'        - items served with the entree ("With")
   *   'over'        - what the entree is served over ("Over")
   *   'sides'       - sides specific to this meal ("Sides")
   *   'alternative' - an alternative complete meal described as a category ("Choice 2 - includes fruit...", "Box Lunch")
   *   'other'       - everything else, treated as sides shared by the whole menu ("Grain", "Fruit", "Fruits & Vegetables", "Milk", "Dessert")
   */
  categorizeRecipeCategory(categoryName) {
    const lowerName = (categoryName ?? "").toLowerCase().trim();

    // Check for alternative meal options (Box Lunch, Choice 2, Grab & Go, etc.)
    if (ALTERNATIVE_MEAL_PATTERN.test(lowerName) || lowerName.includes('includes fruit')) {
      return 'alternative';
    }

    if (lowerName === 'with' || /^w\/?$/.test(lowerName)) {
      return 'with';
    }

    if (lowerName === 'over') {
      return 'over';
    }

    // Check for entrees
    if (lowerName.includes('entree') || lowerName.includes('main')) {
      return 'entrees';
    }

    if (lowerName.includes('side')) {
      return 'sides';
    }

    return 'other';
  }

  /**
   * Joins an array of items with proper grammar (commas and "and")
   * @param {Array} items - Array of strings to join
   * @param {string} finalConjunction - The word to use before the last item ("and" or "or")
   * @returns {string} - Grammatically correct joined string
   */
  joinWithConjunction(items, finalConjunction = 'and') {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${finalConjunction} ${items[1]}`;

    // Three or more items
    const allButLast = items.slice(0, -1);
    const last = items[items.length - 1];
    const comma = this.useOxfordComma ? ',' : '';

    return `${allButLast.join(', ')}${comma} ${finalConjunction} ${last}`;
  }

  /**
   * Formats one meal (main or alternative) as a single line:
   *   "Mandarin Orange Chicken over Fluffy Brown Rice"
   *   "PBJ Uncrustable Sandwich with String Cheese and Baked Chips or Crackers"
   *   "Build-Your-Own Burger or Beef Hot Dog on Bun with Fresh Burger Fixings, American Cheese Slice, and more"
   *
   * @param {Object} meal - { entrees, with, over, sides, entreesAreOneMeal }
   * @param {number} sidesLimit - Max meal-specific sides to list before "and more"; 0 hides them
   */
  formatMealLine(meal, sidesLimit = this.mealSidesLimit) {
    let text = meal.entreesAreOneMeal
      ? this.joinWithConjunction(meal.entrees, 'and')
      : meal.entrees.join(this.entreeJoiner);

    if (meal.over.length > 0) {
      const overText = this.joinWithConjunction(meal.over, 'and');
      text = text ? `${text} over ${overText}` : overText;
    }

    const accompaniments = [...meal.with];
    const truncated = sidesLimit > 0 && meal.sides.length > sidesLimit;
    if (sidesLimit > 0) {
      accompaniments.push(...(truncated ? meal.sides.slice(0, sidesLimit) : meal.sides));
    }
    if (truncated) {
      accompaniments.push('more');
    }

    if (accompaniments.length > 0) {
      const withText = this.joinWithConjunction(accompaniments, 'and');
      text = text ? `${text} with ${withText}` : withText;
    }

    return text;
  }

  /**
   * Turns a parsed day into the object sent to the frontend (see fetchMenu() for the shape),
   * or `null` when there is nothing to show.
   */
  formatParsedMenu(parsed) {
    if (!parsed) {
      return null;
    }

    const menu = {
      main: this.formatMealLine(parsed.main),
      alternatives: parsed.alternatives
        .map((meal) => ({
          label: this.alternativeLabel.replace('{categoryName}', this.displayMealName(meal.name)),
          text: this.formatMealLine(meal),
        }))
        .filter((alternative) => alternative.text.length > 0),
      sides: parsed.sharedSides.flatMap((group) => group.recipes),
      text: this.formatSentence(parsed),
    };
    // The sides as one readable phrase ("Corn, Apple, and Milk") for the frontend to display
    menu.sidesText = this.joinWithConjunction(menu.sides, 'and');

    return this.mealHasContent(menu) ? menu : null;
  }

  /**
   * Formats a parsed day as one natural-language sentence (the `layout: "sentence"` display):
   *   "Chicken Tenders or Fish Sticks with sides of Brown Rice, Green Beans, and Carrots. Or PBJ Uncrustable with Baked Chips."
   */
  formatSentence(parsed) {
    // Entrees (plus anything served with/over them). Meal-specific sides are folded into the sides list below.
    const entreesText = this.formatMealLine({ ...parsed.main, sides: [] }, 0);
    const entreesHaveWithItems = parsed.main.with.length > 0;

    let mainText = "";
    if (entreesText) {
      mainText = this.showCategoryLabels ? `Entrees: ${entreesText}` : entreesText;
    }

    const allSides = [
      ...parsed.main.sides,
      ...parsed.sharedSides.flatMap((group) => group.recipes),
    ];
    if (allSides.length > 0) {
      const sidesList = this.joinWithConjunction(allSides, 'and');
      const sideNoun = allSides.length === 1 ? 'a side of' : 'sides of';

      if (this.showCategoryLabels) {
        mainText = `${mainText} Sides: ${sidesList}`.trim();
      } else if (!entreesText) {
        mainText = sidesList;
      } else if (entreesHaveWithItems) {
        // "Tortellini with Marinara Sauce, plus sides of ..." reads better than "with ... with sides of ..."
        mainText = `${mainText}, plus ${sideNoun} ${sidesList}`;
      } else {
        mainText = `${mainText} with ${sideNoun} ${sidesList}`;
      }
    }

    const alternativeParts = parsed.alternatives.map((meal, index) => {
      const itemsText = this.formatMealLine(meal, Infinity);
      // No label - just show the items with "Or" prefix (except for the very first sentence). Otherwise use the
      // configured label, replacing the {categoryName} placeholder if present
      let label;
      if (this.alternativeLabel !== "") {
        label = this.alternativeLabel.replace('{categoryName}', this.displayMealName(meal.name));
      } else if (mainText || index > 0) {
        label = "Or";
      } else {
        label = "";
      }
      return `${label} ${itemsText}`.trim();
    });

    // Main meal (entrees + sides) first, then each alternative as its own sentence
    const sentences = [mainText, ...alternativeParts].filter((part) => part.length > 0);
    if (sentences.length === 0) {
      return "";
    }

    // Always add trailing period
    return sentences.join('. ') + '.';
  }

  /**
   * Formats a flat list of recipe categories (one unnamed MenuMeal) as a sentence.
   * Kept for backwards compatibility; new code should use parseMenuMeals() + formatParsedMenu().
   *
   * @param {Array} recipeCategories - Array of RecipeCategory objects from the API
   * @returns {string} - Formatted menu string
   */
  formatMenu(recipeCategories) {
    return this.formatSentence(this.parseMenuMeals([{ RecipeCategories: recipeCategories }]));
  }

  processData(data) {
    const menus = this.extractMenusByDate(data);

    // Determine how many days to generate based on bufferDays setting
    // If bufferDays > 0: Generate extra days for filtering empty days
    // If bufferDays = 0: Generate exact number requested (old behavior, no filtering)
    const daysToGenerate = this.bufferDays > 0
      ? this.numberOfDaysToDisplay + this.bufferDays
      : this.numberOfDaysToDisplay;

    const allUpcomingDays = upcomingRelativeDates(daysToGenerate).map((day) => {
      // day = { date: '9-6-2021', label: 'Today' }; // Possible labels: 'Today', 'Tomorrow', or a day of the week
      const breakfastAndLunchForThisDay = menus.reduce(
        (menuByMealTime, menu) => {
          const menuForThisDate = menu.filter((menuForOneDate) => {
            const date1 = new Date(menuForOneDate.date);
            const date2 = new Date(day.date);
            return !(date1 > date2) && !(date1 < date2); // Checking for date equality
          });

          if (!menuForThisDate[0]) {
            return menuByMealTime;
          }

          return {
            ...menuByMealTime,
            [menuForThisDate[0].breakfastOrLunch.toLowerCase()]:
              menuForThisDate[0].menu,
          };
        },
        {}
      );

      return {
        date: day.date,
        label: day.label,
        breakfast: breakfastAndLunchForThisDay.breakfast ?? null,
        lunch: breakfastAndLunchForThisDay.lunch ?? null,
      };
    });

    let upcomingMenuByDate;

    if (this.bufferDays > 0) {
      // New behavior: Filter empty days and return N non-empty days
      const nonEmptyDays = allUpcomingDays.filter(
        (day) => this.mealHasContent(day.breakfast) || this.mealHasContent(day.lunch)
      );
      upcomingMenuByDate = nonEmptyDays.slice(0, this.numberOfDaysToDisplay);
    } else {
      // Old behavior (bufferDays = 0): Return N consecutive days without filtering
      upcomingMenuByDate = allUpcomingDays.slice(0, this.numberOfDaysToDisplay);
    }

    if (this.debug) {
      console.log(
        `School meal info from titanschools API: ${JSON.stringify(
          upcomingMenuByDate
        )}`
      );
    }

    return upcomingMenuByDate;
  }
}

/**
 * Returns an array of the next 7 dates shaped like this:
 * [
 *   { date: '9-6-2021', label: 'Today' },
 *   { date: '9-7-2021', label: 'Tomorrow' },
 *   { date: '9-8-2021', label: 'Wednesday' },
 *   { date: '9-9-2021', label: 'Thursday' },
 *   { date: '9-10-2021', label: 'Friday' },
 *   { date: '9-11-2021', label: 'Saturday' },
 *   { date: '9-12-2021', label: 'Sunday' }
 * ]
 */
const upcomingRelativeDates = (numberOfDays = 5) => {
  const dayOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  let weekOfRelativeDates = [];
  for (let dayOffset = 0; dayOffset < numberOfDays; dayOffset++) {
    const now = new Date(Date.now());
    let adjustedDate = new Date(Date.now());
    adjustedDate.setDate(now.getDate() + parseInt(dayOffset, 10));

    const date = `${
      adjustedDate.getMonth() + 1 // javascript month is 0-indexed :facepalm:
    }-${adjustedDate.getDate()}-${adjustedDate.getFullYear()}`;

    let label = "";
    if (dayOffset === -1) {
      label = "Yesterday";
    } else if (dayOffset === 0) {
      label = "Today";
    } else if (dayOffset === 1) {
      label = "Tomorrow";
    } else {
      label = dayOfWeek[adjustedDate.getDay()];
    }

    weekOfRelativeDates.push({
      date,
      label,
    });
  }
  return weekOfRelativeDates;
};

module.exports = TitanSchoolsClient;
module.exports.BUFFER_DAYS = BUFFER_DAYS;
