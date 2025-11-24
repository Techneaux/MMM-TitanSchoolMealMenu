const axios = require("axios").default;

/**
 * Number of extra days to request from the API as a buffer
 * to ensure we have enough non-empty days to display
 */
const BUFFER_DAYS = 7;

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
    this.recipeCategoriesToInclude = config.recipeCategoriesToInclude ?? [
      "Main Entree", // Maybe deprecated?
      "Entrees",
      "Grain",
      // , "Fruit"
      // , "Vegetable"
      // , "Milk"
      // , "Condiment"
      // , "Extra"
    ];

    // Formatting options for menu display
    this.entreeJoiner = config.entreeJoiner ?? " or ";
    this.showCategoryLabels = config.showCategoryLabels ?? false;
    this.useOxfordComma = config.useOxfordComma ?? true;
    this.alternativeLabel = config.alternativeLabel ?? ""; // Support {categoryName} placeholder

    this.client = axios.create({
      baseURL: "https://api.linqconnect.com/api/",
      timeout: 30000,
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
   * @returns An array of meals shaped like this (starting on {startDate} and including {config.numberOfDaysToDisplay} days):
   * [
   *   { "date": "9-6-2021", "label": "Today" },
   *   {
   *     "date": "9-7-2021",
   *     "label": "Tomorrow",
   *     "breakfast": "SCRAMBLED EGGS & FRENCH TOAST, APPLE,MIXED FRUIT,JUICE, APPLE 4 OZ.,JUICE, GRAPE 4 OZ.,JUICE, ORANGE 4 OZ., MILK CHOCOLATE FF CARTON HP,MILK WHITE 1% CARTON HP",
   *     "lunch": "STUFFED CHEESE BREADSTICK, COOKIE VARIETY, MARINARA CUP,CARROTS- INDV PACKS, PEACHES SLICED, MILK CHOCOLATE FF CARTON HP,MILK WHITE 1% CARTON HP, RANCH CUP"
   *   },
   *   {
   *     "date": "9-8-2021",
   *     "label": "Wednesday",
   *     "breakfast": "CEREAL LUCKY CHARMS GF, CEREAL, CINNAMON TOAST, JUICE, APPLE 4 OZ.,JUICE, GRAPE 4 OZ.,JUICE, ORANGE 4 OZ.,MIXED FRUIT,APPLE, MILK CHOCOLATE FF CARTON HP,MILK WHITE 1% CARTON HP",
   *     "lunch": "CHICKEN SANDWICH, BEANS VEGETARIAN, PEARS SLICED, MILK CHOCOLATE FF CARTON HP,MILK WHITE 1% CARTON HP, KETCHUP PACKET,RANCH CUP, LETTUCE & PICKLE CUP"
   *   },
   *   {
   *     "date": "9-9-2021",
   *     "label": "Thursday",
   *     "breakfast": "CHERRY FRUDEL, JUICE, APPLE 4 OZ.,JUICE, GRAPE 4 OZ.,JUICE, ORANGE 4 OZ.,MIXED FRUIT,APPLE, MILK CHOCOLATE FF CARTON HP,MILK WHITE 1% CARTON HP",
   *     "lunch": "ORANGE CHICKEN, BROWN RICE, GREEN BEANS, APPLE, MILK CHOCOLATE FF CARTON HP,MILK WHITE 1% CARTON HP"
   *   },
   *   {
   *     "date": "9-10-2021",
   *     "label": "Friday",
   *     "breakfast": "POP TART, CINNAMON,POP TART, STRAWBERRY, JUICE, APPLE 4 OZ.,JUICE, GRAPE 4 OZ.,JUICE, ORANGE 4 OZ.,PEACHES SLICED, MILK CHOCOLATE FF CARTON HP,MILK WHITE 1% CARTON HP",
   *     "lunch": "HAMBURGER, GARDEN SALAD, PEACH CUP ZEE ZEE, MILK CHOCOLATE FF CARTON HP,MILK WHITE 1% CARTON HP, KETCHUP PACKET,MUSTARD PACKET,RANCH CUP, LETTUCE & PICKLE CUP"
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

      const menusByDate = menuSession.MenuPlans[0].Days.map(
        (menuForThisDate) => {
          // Just for logging/troubleshooting, keep track of all the recipes in this menu and note which ones get
          // intentionally filtered out.
          const recipesToLog = {
            all: [],
            filteredOut: [],
          };

          if (!menuForThisDate.MenuMeals[0]?.RecipeCategories[0]?.Recipes[0]) {
            if (this.debug) {
              console.debug(
                `No meal data was found in the API response for ${menuForThisDate.Date}. Expected to find MenuMeals[].RecipeCategories[].Recipes, but got: ${menuForThisDate}`
              );
            }
            return [];
          }

          const recipeCategories = menuForThisDate.MenuMeals.map((mealLine) => {
            return mealLine.RecipeCategories.filter((recipeCategory) => {
              if (!recipesToLog.all.includes(recipeCategory.CategoryName)) {
                recipesToLog.all.push(recipeCategory.CategoryName);
              }

              if (this.recipeCategoriesToInclude.length === 0
                || this.recipeCategoriesToInclude.includes(
                  recipeCategory.CategoryName
                )
              ) {
                return true;
              } else {
                if (
                  !recipesToLog.filteredOut.includes(
                    recipeCategory.CategoryName
                  )
                ) {
                  recipesToLog.filteredOut.push(recipeCategory.CategoryName);
                }
                return false;
              }
            });
          }, this).flat();

          if (this.debug) {
            let message = `The ${breakfastOrLunch} menu for ${
              menuForThisDate.Date
            } contains the following categories: ${recipesToLog.all.join(
              ", "
            )}`;
            if (recipesToLog.filteredOut.length > 0) {
              message += `, but ${recipesToLog.filteredOut.join(
                ", "
              )} were filtered out because they're not included in the config.recipeCategoriesToInclude array.`;
            }
            console.debug(message);
          }

          return {
            date: menuForThisDate.Date,
            breakfastOrLunch,
            menu: this.formatMenu(recipeCategories),
          };
        },
        this
      );

      return menusByDate;
    }, this);

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
   * Merges recipes that start with "with" into their preceding recipe
   * @param {Array} recipes - Array of recipe name strings
   * @returns {Array} - Array of recipe names with "with" items merged
   */
  mergeWithItems(recipes) {
    const merged = [];

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const isWithItem = recipe.toLowerCase().trim().startsWith('with ');

      if (isWithItem && merged.length > 0) {
        // Attach this "with" item to the previous recipe
        merged[merged.length - 1] = `${merged[merged.length - 1]} ${recipe}`;
      } else {
        // Regular recipe or first item
        merged.push(recipe);
      }
    }

    return merged;
  }

  /**
   * Categorizes a recipe category name into one of: entrees, sides, or alternative
   * @param {string} categoryName - The RecipeCategory.CategoryName from the API
   * @returns {string} - One of: 'entrees', 'sides', 'alternative'
   */
  categorizeRecipeCategory(categoryName) {
    const lowerName = categoryName.toLowerCase();

    // Check for alternative meal options (Box Lunch, Choice 2, etc.)
    if (lowerName.includes('box lunch') ||
        lowerName.includes('choice 2') ||
        lowerName.includes('choice two') ||
        lowerName.includes('includes fruit')) {
      return 'alternative';
    }

    // Check for entrees
    if (lowerName.includes('entree') || lowerName.includes('main')) {
      return 'entrees';
    }

    // Default to sides (includes Sides, Grain, Fruit, Vegetable, etc.)
    return 'sides';
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
   * Formats recipe categories into a natural language menu string
   * @param {Array} recipeCategories - Array of RecipeCategory objects from the API
   * @returns {string} - Formatted menu string
   */
  formatMenu(recipeCategories) {
    // Group categories by type
    const categorizedGroups = {
      entrees: [],
      sides: [],
      alternative: []
    };

    recipeCategories.forEach((recipeCategory) => {
      const type = this.categorizeRecipeCategory(recipeCategory.CategoryName);
      const recipes = recipeCategory.Recipes.map(r => r.RecipeName);
      const mergedRecipes = this.mergeWithItems(recipes);

      categorizedGroups[type].push({
        categoryName: recipeCategory.CategoryName,
        recipes: mergedRecipes
      });
    });

    // Build the menu text
    const mainParts = [];
    const alternativeParts = [];

    // Format entrees
    if (categorizedGroups.entrees.length > 0) {
      const allEntrees = categorizedGroups.entrees.flatMap(g => g.recipes);
      let entreesText = allEntrees.join(this.entreeJoiner);

      if (this.showCategoryLabels) {
        entreesText = `Entrees: ${entreesText}`;
      }

      mainParts.push(entreesText);
    }

    // Format sides
    if (categorizedGroups.sides.length > 0) {
      const allSides = categorizedGroups.sides.flatMap(g => g.recipes);
      let sidesText = this.joinWithConjunction(allSides, 'and');

      if (this.showCategoryLabels) {
        sidesText = `Sides: ${sidesText}`;
      } else if (categorizedGroups.entrees.length > 0) {
        // Add "with" prefix if there are entrees
        sidesText = `with ${sidesText}`;
      }

      mainParts.push(sidesText);
    }

    // Format alternative options
    if (categorizedGroups.alternative.length > 0) {
      categorizedGroups.alternative.forEach((group) => {
        const itemsText = this.joinWithConjunction(group.recipes, 'and');

        let alternativeText;
        if (this.alternativeLabel === "") {
          // No label - just show the items with "Or" prefix
          alternativeText = `Or ${itemsText}`;
        } else {
          // Use the configured label, replacing {categoryName} placeholder if present
          const label = this.alternativeLabel.replace('{categoryName}', group.categoryName);
          alternativeText = `${label} ${itemsText}`;
        }

        alternativeParts.push(alternativeText);
      });
    }

    // Join main parts (entrees + sides) with space, then add alternatives with period separator
    let result = mainParts.join(' ');

    if (alternativeParts.length > 0) {
      result += '. ' + alternativeParts.join('. ');
    }

    // Always add trailing period
    result += '.';

    return result;
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
        breakfast: breakfastAndLunchForThisDay.breakfast,
        lunch: breakfastAndLunchForThisDay.lunch,
      };
    });

    let upcomingMenuByDate;

    if (this.bufferDays > 0) {
      // New behavior: Filter empty days and return N non-empty days
      // Check for actual content, not just truthy values (excludes empty strings)
      const nonEmptyDays = allUpcomingDays.filter(
        (day) => (day.breakfast && day.breakfast.trim()) || (day.lunch && day.lunch.trim())
      );
      upcomingMenuByDate = nonEmptyDays.slice(0, this.numberOfDaysToDisplay);
    } else {
      // Old behavior (bufferDays = 0): Return N consecutive days without filtering
      upcomingMenuByDate = allUpcomingDays.slice(0, this.numberOfDaysToDisplay);
    }

    console.log(
      `School meal info from titanschools API: ${JSON.stringify(
        upcomingMenuByDate
      )}`
    );

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

// const t = new TitanSchoolsClient({
//   buildingId: '23125610-cbbc-eb11-a2cb-82fe13669c55',
//   districtId: '93f76ff0-2eb7-eb11-a2c4-e816644282bd',
// });
// t.fetchMockMenu();

module.exports = TitanSchoolsClient;
module.exports.BUFFER_DAYS = BUFFER_DAYS;
