const TitanSchoolsClient = require("../../TitanSchoolsClient");
const mockApiResponse = require("./mocks/mockApiResponse");
const mockNamedMealsResponse = require("./mocks/mockApiResponseNamedMeals");

describe("TitanSchoolsClient parses API response correctly", () => {
  let client;
  let config = {
    buildingId: "9017b6ae-a3bc-eb11-a2cb-82fe13669c55",
    districtId: "93f76ff0-2eb7-eb11-a2c4-e816644282bd",
    numberOfDaysToDisplay: 3,
    debug: true
  };

  beforeAll(() => {
    client = new TitanSchoolsClient(config);
  });

  /**
   * These tests confirm that the extractMenusByDate function working properly.
   * It should ultimately output a collection of menus that looks like this:
   *
   *  [
   *   [
   *     { date: '1/18/2023', breakfastOrLunch: 'breakfast', menu: '...' },
   *     { date: '1/19/2023', breakfastOrLunch: 'breakfast', menu: '...' },
   *     { date: '1/20/2023', breakfastOrLunch: 'breakfast', menu: '...' }
   *   ],
   *   [
   *     { date: '1/18/2023', breakfastOrLunch: 'lunch', menu: '...' },
   *     { date: '1/19/2023', breakfastOrLunch: 'lunch', menu: '...' },
   *     { date: '1/20/2023', breakfastOrLunch: 'lunch', menu: '...' }
   *   ]
   * ]
   *
   */
  describe("extractMenusByDate() function", () => {
    it("extracts breakfast and lunch separately from the raw API response", () => {
      const menusByDate = client.extractMenusByDate(mockApiResponse);

      // There should be one array element for breakfast menus and another containing all the lunch menus
      expect(menusByDate.length).toBe(2);

      // Inspect the breakfast menus
      expect(menusByDate[0].length).toBe(config.numberOfDaysToDisplay);
      menusByDate[0].forEach((day) => {
        expect(day.breakfastOrLunch).toBe("breakfast");
      });

      // Inspect the lunch menus
      expect(menusByDate[1].length).toBe(config.numberOfDaysToDisplay);
      menusByDate[1].forEach((day) => {
        expect(day.breakfastOrLunch).toBe("lunch");
      });
    });

    it("extracts a menu (food items) for each breakfast", () => {
      const menusByDate = client.extractMenusByDate(mockApiResponse);

      // Inspect the breakfast menus
      menusByDate[0].forEach((day) => {
        expect(day.breakfastOrLunch).toBe("breakfast");
        try {
          expect(client.mealHasContent(day.menu)).toBeTruthy();
        } catch (error) {
          throw new Error(
            `No breakfast menu was extracted from the API response on this date: ${JSON.stringify(
              day
            )}. Did the TitanSchools API change the shape of their response?`
          );
        }
      });

      // Inspect the lunch menus
      expect(menusByDate[1].length).toBe(config.numberOfDaysToDisplay);
    });
  });

  it("extracts a menu (food items) for each lunch", () => {
    const menusByDate = client.extractMenusByDate(mockApiResponse);

    // Inspect the lunch menus
    menusByDate[1].forEach((day) => {
      expect(day.breakfastOrLunch).toBe("lunch");
      try {
        expect(client.mealHasContent(day.menu)).toBeTruthy();
      } catch (error) {
        throw new Error(
          `No lunch menu was extracted from the API response on this date: ${JSON.stringify(
            day
          )}. Did the TitanSchools API change the shape of their response?`
        );
      }
    });

    // Inspect the lunch menus
    expect(menusByDate[1].length).toBe(config.numberOfDaysToDisplay);
  });

  describe("named MenuMeals (LinqConnect 2026 response shape)", () => {
    const lunchFor = (date, options = {}) => {
      const c = new TitanSchoolsClient({ ...config, debug: false, ...options });
      const [, lunches] = c.extractMenusByDate(mockNamedMealsResponse);
      return lunches.find((day) => day.date === date).menu;
    };

    it("splits a day into main meal, alternatives, and shared sides", () => {
      const menu = lunchFor("9/14/2026");
      expect(menu.main).toBe("Mini Pancakes with Chicken Sausage Patty");
      expect(menu.alternatives).toEqual([
        { label: "", text: "PBJ Uncrustable Sandwich with Baked Chips or Crackers" }
      ]);
      expect(menu.sides).toEqual(["Hashbrown Patties", "Dragon Juice", "Assorted Fruit Choices"]);
      expect(menu.text).toBe(
        "Mini Pancakes with sides of Chicken Sausage Patty, Hashbrown Patties, Dragon Juice, and Assorted Fruit Choices. Or PBJ Uncrustable Sandwich with Baked Chips or Crackers."
      );
    });

    it("folds the day's shared sides into mainWithSides", () => {
      const menu = lunchFor("9/14/2026");
      expect(menu.mainWithSides).toBe("Mini Pancakes with Chicken Sausage Patty, Hashbrown Patties, Dragon Juice, and Assorted Fruit Choices");
      expect(lunchFor("9/17/2026").mainWithSides).toBe(
        "Mandarin Orange Chicken over Fluffy Brown Rice with Steamed Broccoli, Fresh Veggies, Assorted Fruit Choices, and Fortune Cookie"
      );
    });

    it('attaches an "Over" category to the entree and keeps Dessert with the shared sides', () => {
      const menu = lunchFor("9/17/2026");
      expect(menu.main).toBe("Mandarin Orange Chicken over Fluffy Brown Rice");
      expect(menu.alternatives[0].text).toBe("Yogurt Parfait with Granola Packet");
      expect(menu.sides).toEqual(["Steamed Broccoli", "Fresh Veggies", "Assorted Fruit Choices", "Fortune Cookie"]);
    });

    it('still merges legacy "with ..." recipe names inside a category', () => {
      const menu = lunchFor("9/16/2026");
      expect(menu.main).toBe("Cheese Pizza Slice or Turkey & Beef Pepperoni Pizza Slice");
      expect(menu.sides).toContain("Mixed Greens Salad (with Dressing)");
    });

    it("excludes Milk by default and includes it when recipeCategoriesToExclude is empty", () => {
      expect(lunchFor("9/14/2026").sides).not.toContain("Skim Milk");
      expect(lunchFor("9/14/2026", { recipeCategoriesToExclude: [] }).sides).toEqual(
        expect.arrayContaining(["Skim Milk", "1% White Milk", "Chocolate Milk"])
      );
    });

    it('keeps "With"/"Over" items when recipeCategoriesToInclude only lists Entrees', () => {
      const menu = lunchFor("9/17/2026", { recipeCategoriesToInclude: ["Entrees"] });
      expect(menu.main).toBe("Mandarin Orange Chicken over Fluffy Brown Rice");
      expect(menu.alternatives[0].text).toBe("Yogurt Parfait with Granola Packet");
      expect(menu.sides).toEqual([]);
    });

    it("treats breakfast sides as shared sides", () => {
      const c = new TitanSchoolsClient({ ...config, debug: false });
      const [breakfasts] = c.extractMenusByDate(mockNamedMealsResponse);
      const menu = breakfasts.find((day) => day.date === "9/14/2026").menu;
      expect(menu.main).toBe("Banana Choc Chip Muffin Bread or Maple Waffle Snaps");
      expect(menu.alternatives).toEqual([]);
      expect(menu.sides).toEqual(["Breakfast Protein Item", "Assorted Fruit Choices", "Assorted 100% Fruit Juice"]);
    });

    it("fills the {categoryName} placeholder of alternativeLabel with the meal name minus its cycle prefix", () => {
      const menu = lunchFor("9/14/2026", { alternativeLabel: "{categoryName}:" });
      expect(menu.alternatives[0].label).toBe("Choice 2:");
      expect(menu.text).toContain(". Choice 2: PBJ Uncrustable Sandwich");
    });
  });

  describe("meal-specific sides (mealSidesLimit)", () => {
    const burgerDay = [
      {
        MenuMealName: "2-1 MS",
        RecipeCategories: [
          { CategoryName: "Entrees", Recipes: [{ RecipeName: "Build-Your-Own Burger" }] },
          {
            CategoryName: "Sides",
            Recipes: [
              { RecipeName: "Fresh Burger Fixings" },
              { RecipeName: "American Cheese Slice" },
              { RecipeName: "Caramelized Onions" },
              { RecipeName: "Sauteed Mushrooms" }
            ]
          }
        ]
      },
      {
        MenuMealName: "Sides for All Entrees",
        RecipeCategories: [{ CategoryName: "Fruits & Vegetables", Recipes: [{ RecipeName: "Potato Wedges" }] }]
      }
    ];
    const menuFor = (options) => {
      const c = new TitanSchoolsClient({ ...config, debug: false, ...options });
      return c.formatParsedMenu(c.parseMenuMeals(burgerDay));
    };

    it('lists two sides and then "and more" by default', () => {
      const menu = menuFor({});
      expect(menu.main).toBe("Build-Your-Own Burger with Fresh Burger Fixings, American Cheese Slice, and more");
      expect(menu.sides).toEqual(["Potato Wedges"]);
    });

    it('puts shared sides before "and more" in mainWithSides', () => {
      expect(menuFor({}).mainWithSides).toBe(
        "Build-Your-Own Burger with Fresh Burger Fixings, American Cheese Slice, Potato Wedges, and more"
      );
      expect(menuFor({ mealSidesLimit: 0 }).mainWithSides).toBe("Build-Your-Own Burger with Potato Wedges");
    });

    it("hides meal-specific sides when the limit is 0", () => {
      expect(menuFor({ mealSidesLimit: 0 }).main).toBe("Build-Your-Own Burger");
    });

    it("lists every side when the limit is large enough", () => {
      expect(menuFor({ mealSidesLimit: 10 }).main).toBe(
        "Build-Your-Own Burger with Fresh Burger Fixings, American Cheese Slice, Caramelized Onions, and Sauteed Mushrooms"
      );
    });

    it("always lists every meal-specific side in the sentence layout", () => {
      expect(menuFor({}).text).toBe(
        "Build-Your-Own Burger with sides of Fresh Burger Fixings, American Cheese Slice, Caramelized Onions, Sauteed Mushrooms, and Potato Wedges."
      );
    });

    it('treats "Sides" as shared sides when the day has no "Sides for All Entrees" meal', () => {
      const c = new TitanSchoolsClient({ ...config, debug: false });
      const menu = c.formatParsedMenu(c.parseMenuMeals([burgerDay[0]]));
      expect(menu.main).toBe("Build-Your-Own Burger");
      expect(menu.sides).toEqual(["Fresh Burger Fixings", "American Cheese Slice", "Caramelized Onions", "Sauteed Mushrooms"]);
    });
  });

  describe("hideEverydaySides option", () => {
    const dayWith = (date, sides) => ({
      Date: date,
      MenuMeals: [
        { MenuMealName: "1-1 Elementary", RecipeCategories: [{ CategoryName: "Entrees", Recipes: [{ RecipeName: "Pizza" }] }] },
        {
          MenuMealName: "Sides for All Entrees",
          RecipeCategories: [{ CategoryName: "Fruits & Vegetables", Recipes: sides.map((name) => ({ RecipeName: name })) }]
        }
      ]
    });
    const response = {
      FamilyMenuSessions: [
        {
          ServingSession: "Lunch",
          MenuPlans: [
            {
              Days: [
                dayWith("9/14/2026", ["Corn", "Fruit Cup", "Fresh Veggies"]),
                dayWith("9/15/2026", ["Fruit Cup", "Green Beans", "Fresh Veggies"]),
                { Date: "9/16/2026", MenuMeals: [] },
                dayWith("9/17/2026", ["Fruit Cup", "Peas", "Fresh Veggies"])
              ]
            }
          ]
        }
      ]
    };

    it("keeps everything by default", () => {
      const c = new TitanSchoolsClient({ ...config, debug: false });
      const [lunches] = c.extractMenusByDate(response);
      expect(lunches[0].menu.sides).toEqual(["Corn", "Fruit Cup", "Fresh Veggies"]);
    });

    it("drops sides that appear on every non-empty day when enabled", () => {
      const c = new TitanSchoolsClient({ ...config, debug: false, hideEverydaySides: true });
      const [lunches] = c.extractMenusByDate(response);
      expect(lunches[0].menu.sides).toEqual(["Corn"]);
      expect(lunches[1].menu.sides).toEqual(["Green Beans"]);
      expect(lunches[2].menu).toBeNull();
      expect(lunches[3].menu.sides).toEqual(["Peas"]);
    });

    it("leaves a short window alone so a side that merely repeats twice is not removed", () => {
      const c = new TitanSchoolsClient({ ...config, debug: false, hideEverydaySides: true });
      const shortResponse = {
        FamilyMenuSessions: [{ ServingSession: "Lunch", MenuPlans: [{ Days: response.FamilyMenuSessions[0].MenuPlans[0].Days.slice(0, 2) }] }]
      };
      const [lunches] = c.extractMenusByDate(shortResponse);
      expect(lunches[0].menu.sides).toEqual(["Corn", "Fruit Cup", "Fresh Veggies"]);
    });
  });

  describe("edge cases in the response shape", () => {
    const parse = (menuMeals, options = {}) => {
      const c = new TitanSchoolsClient({ ...config, debug: false, ...options });
      return c.formatParsedMenu(c.parseMenuMeals(menuMeals));
    };
    const cat = (CategoryName, ...names) => ({ CategoryName, Recipes: names.map((RecipeName) => ({ RecipeName })) });

    it("does not drop a day whose first meal or category is empty", () => {
      const c = new TitanSchoolsClient({ ...config, debug: false });
      const [lunches] = c.extractMenusByDate({
        FamilyMenuSessions: [{
          ServingSession: "Lunch",
          MenuPlans: [{ Days: [
            { Date: "9/14/2026", MenuMeals: [{ MenuMealName: "2-1 Elementary", RecipeCategories: [] }, { MenuMealName: "2-1 Choice 2", RecipeCategories: [cat("Entrees", "PBJ")] }] },
            { Date: "9/15/2026" },
            { Date: "9/16/2026", MenuMeals: [{}] }
          ] }]
        }]
      });
      expect(lunches[0].menu.main).toBe("PBJ");
      expect(lunches[1].menu).toBeNull();
      expect(lunches[2].menu).toBeNull();
    });

    it("keeps an alternative meal's fruit and grain with that alternative", () => {
      const menu = parse([
        { MenuMealName: "2-1 Elementary", RecipeCategories: [cat("Entrees", "Pizza"), cat("Vegetable", "Corn")] },
        { MenuMealName: "2-1 Choice 2", RecipeCategories: [cat("Entrees", "PBJ"), cat("Grain", "Baked Chips"), cat("Fruit", "Apple")] }
      ]);
      expect(menu.main).toBe("Pizza");
      expect(menu.alternatives[0].text).toBe("PBJ with Baked Chips and Apple");
      expect(menu.sides).toEqual(["Corn"]);
    });

    it('treats a "for all" meal that has its own entrees as the main meal', () => {
      const menu = parse([{ MenuMealName: "Lunch for All Grades", RecipeCategories: [cat("Entrees", "Pizza", "Burger"), cat("Vegetable", "Corn")] }]);
      expect(menu.main).toBe("Pizza or Burger");
      expect(menu.sides).toEqual(["Corn"]);
    });

    it("promotes the only alternative to the main meal when no main meal exists", () => {
      const menu = parse([{ MenuMealName: "Grab & Go Breakfast", RecipeCategories: [cat("Entrees", "Muffin")] }]);
      expect(menu.main).toBe("Muffin");
      expect(menu.alternatives).toEqual([]);
      expect(menu.text).toBe("Muffin.");
    });

    it("recognizes hyphenated Grab-N-Go and Choice 3 as alternatives, but not Choice 1", () => {
      expect(client.classifyMenuMeal("2-1 Grab-N-Go")).toBe("alternative");
      expect(client.classifyMenuMeal("Grab-and-Go")).toBe("alternative");
      expect(client.classifyMenuMeal("2-1 Choice 3")).toBe("alternative");
      expect(client.classifyMenuMeal("2-1 Choice 1")).toBe("main");
    });

    it('recognizes a legacy "Grab & Go" category as an alternative', () => {
      const menu = parse([{ RecipeCategories: [cat("Entrees", "Chicken Sandwich"), cat("Grab & Go", "PBJ", "String Cheese"), cat("Vegetable", "Corn")] }]);
      expect(menu.main).toBe("Chicken Sandwich");
      expect(menu.alternatives[0].text).toBe("PBJ and String Cheese");
      expect(menu.sides).toEqual(["Corn"]);
    });

    it("lets an explicit include of Milk beat the default exclude", () => {
      const menu = parse([{ RecipeCategories: [cat("Entrees", "Pizza"), cat("Milk", "1% Milk"), cat("Fruit", "Apple")] }], { recipeCategoriesToInclude: ["Entrees", "Milk"] });
      expect(menu.sides).toEqual(["1% Milk"]);
    });

    it("excludes Condiment by default", () => {
      const menu = parse([{ RecipeCategories: [cat("Entrees", "Burger"), cat("Condiment", "Ketchup")] }]);
      expect(menu.sides).toEqual([]);
    });

    it('drops orphaned "With"/"Over" items when their entree was filtered out', () => {
      const menu = parse(
        [{ RecipeCategories: [cat("Entrees", "Cheese Tortellini"), cat("With", "Marinara Sauce"), cat("Fruit", "Apple")] }],
        { recipeCategoriesToInclude: ["Fruit"] }
      );
      expect(menu.main).toBe("");
      expect(menu.sides).toEqual(["Apple"]);
      expect(menu.text).toBe("Apple.");
    });

    it('does not let a "With" category in the shared-sides meal bypass the include filter', () => {
      const menu = parse(
        [
          { MenuMealName: "2-1 Elementary", RecipeCategories: [cat("Entrees", "Pizza")] },
          { MenuMealName: "Sides for All Entrees", RecipeCategories: [cat("With", "Ranch Cup"), cat("Fruit", "Apple")] }
        ],
        { recipeCategoriesToInclude: ["Entrees"] }
      );
      expect(menu.sides).toEqual([]);
    });

    it("returns null when the only content would be hidden meal-specific sides", () => {
      const menu = parse(
        [
          { MenuMealName: "2-1 Elementary", RecipeCategories: [cat("Sides", "Chicken Sausage Patty")] },
          { MenuMealName: "Sides for All Entrees", RecipeCategories: [cat("Milk", "Skim Milk")] }
        ],
        { mealSidesLimit: 0 }
      );
      expect(menu).toBeNull();
    });

    it("drops an alternative that formats to nothing", () => {
      const menu = parse(
        [
          { MenuMealName: "2-1 Elementary", RecipeCategories: [cat("Entrees", "Chicken Sandwich")] },
          { MenuMealName: "2-1 Choice 2", RecipeCategories: [cat("Sides", "String Cheese", "Crackers")] },
          { MenuMealName: "Sides for All Entrees", RecipeCategories: [cat("Fruit", "Apple")] }
        ],
        { mealSidesLimit: 0 }
      );
      expect(menu.alternatives).toEqual([]);
    });

    it('uses "with sides of" (not ", plus") after an "over" entree in the sentence layout', () => {
      const c = new TitanSchoolsClient({ ...config, debug: false });
      const [, lunches] = c.extractMenusByDate(mockNamedMealsResponse);
      expect(lunches.find((day) => day.date === "9/17/2026").menu.text).toBe(
        "Mandarin Orange Chicken over Fluffy Brown Rice with sides of Steamed Broccoli, Fresh Veggies, Assorted Fruit Choices, and Fortune Cookie. Or Yogurt Parfait with Granola Packet."
      );
    });
  });

  describe("classifyMenuMeal() function", () => {
    it("recognizes alternative meals", () => {
      ["2-1 Choice 2", "Choice Two", "3-2 Grab & Go 2", "Grab and Go", "Box Lunch", "Alternate Meal"].forEach((name) => {
        expect(client.classifyMenuMeal(name)).toBe("alternative");
      });
    });

    it("recognizes shared sides", () => {
      expect(client.classifyMenuMeal("Sides for All Entrees")).toBe("shared");
    });

    it("treats everything else (including unnamed meals) as the main meal", () => {
      ["2-1 Elementary", "1-4 MS", "", undefined].forEach((name) => {
        expect(client.classifyMenuMeal(name)).toBe("main");
      });
    });
  });

  describe("cleanRecipeName() function", () => {
    it("strips leading asterisks", () => {
      expect(client.cleanRecipeName("**Hot Breakfast Entree")).toBe("Hot Breakfast Entree");
    });

    it('strips trailing "NEW" markers', () => {
      expect(client.cleanRecipeName("Seasoned Potato Wedges -NEW!!")).toBe("Seasoned Potato Wedges");
      expect(client.cleanRecipeName("Garlic Knots (NEW)")).toBe("Garlic Knots");
      expect(client.cleanRecipeName("Garlic Knots New!")).toBe("Garlic Knots");
    });

    it('leaves names that merely contain "new" alone', () => {
      expect(client.cleanRecipeName("New England Clam Chowder")).toBe("New England Clam Chowder");
      expect(client.cleanRecipeName("Brand New Pizza")).toBe("Brand New Pizza");
    });

    it("collapses whitespace", () => {
      expect(client.cleanRecipeName("  Cheese   Pizza ")).toBe("Cheese Pizza");
    });
  });

  describe("displayMealName() function", () => {
    it("removes the menu-cycle prefix", () => {
      expect(client.displayMealName("2-1 Choice 2")).toBe("Choice 2");
      expect(client.displayMealName("Box Lunch")).toBe("Box Lunch");
    });
  });

  describe("mergeWithItems() function", () => {
    it('wraps a single "with" item in parentheses', () => {
      const recipes = ['Pizza', 'with Marinara Sauce'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (with Marinara Sauce)']);
    });

    it('handles multiple consecutive "with" items by combining them', () => {
      const recipes = ['Pizza', 'with Marinara Sauce', 'with Extra Cheese'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (with Marinara Sauce and Extra Cheese)']);
    });

    it('handles three consecutive "with" items', () => {
      const recipes = ['Burger', 'with Lettuce', 'with Tomato', 'with Pickles'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Burger (with Lettuce and Tomato and Pickles)']);
    });

    it('handles case-insensitive "with" (With, WITH, etc.)', () => {
      const recipes = ['Pizza', 'With Sauce', 'WITH Cheese'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (With Sauce and Cheese)']);
    });

    it('preserves items that do not start with "with"', () => {
      const recipes = ['Pizza', 'Salad', 'Breadsticks'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza', 'Salad', 'Breadsticks']);
    });

    it('handles mixed "with" and regular items', () => {
      const recipes = ['Pizza', 'with Sauce', 'Chicken', 'with BBQ Sauce'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (with Sauce)', 'Chicken (with BBQ Sauce)']);
    });

    it('handles "with" item at the start of array (no previous item)', () => {
      const recipes = ['with Sauce', 'Pizza'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['with Sauce', 'Pizza']);
    });

    it('handles empty array', () => {
      const recipes = [];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual([]);
    });

    it('handles single item (no "with")', () => {
      const recipes = ['Pizza'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza']);
    });

    it('handles whitespace variations in "with" items', () => {
      const recipes = ['Pizza', '  with   Sauce  '];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (  with   Sauce  )']);
    });

    it('does not merge items that contain "with" but do not start with it', () => {
      const recipes = ['Pizza', 'Sandwich with Ham'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza', 'Sandwich with Ham']);
    });

    it('handles items with non-"with" parentheses correctly', () => {
      const recipes = ['Burger (1/4 lb)', 'with Cheese'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Burger (1/4 lb) (with Cheese)']);
    });

    it('handles items with non-"with" parentheses followed by multiple "with" items', () => {
      const recipes = ['Pizza (Large)', 'with Sauce', 'with Cheese'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (Large) (with Sauce and Cheese)']);
    });

    it('handles "w/" prefix with space', () => {
      const recipes = ['Tortellini', 'w/ Marinara Sauce'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Tortellini (with Marinara Sauce)']);
    });

    it('handles "w/" prefix without space', () => {
      const recipes = ['Tortellini', 'w/Marinara Sauce'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Tortellini (with Marinara Sauce)']);
    });

    it('handles multiple consecutive "w/" items', () => {
      const recipes = ['Pizza', 'w/ Sauce', 'w/ Cheese'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (with Sauce and Cheese)']);
    });

    it('handles mixed "with" and "w/" items', () => {
      const recipes = ['Pizza', 'with Sauce', 'w/ Extra Cheese'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (with Sauce and Extra Cheese)']);
    });

    it('handles "w/" item at the start of array (no previous item)', () => {
      const recipes = ['w/ Sauce', 'Pizza'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['w/ Sauce', 'Pizza']);
    });

    it('handles case-insensitive "w/" (W/, etc.)', () => {
      const recipes = ['Pizza', 'W/ Sauce', 'W/Cheese'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (with Sauce and Cheese)']);
    });

    it('handles "over" prefix and normalizes to "with"', () => {
      const recipes = ['Chicken', 'over Rice'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Chicken (with Rice)']);
    });

    it('handles multiple consecutive "over" items', () => {
      const recipes = ['Beef Stew', 'over Egg Noodles', 'over Mashed Potatoes'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Beef Stew (with Egg Noodles and Mashed Potatoes)']);
    });

    it('handles mixed "with", "w/", and "over" items', () => {
      const recipes = ['Pizza', 'with Sauce', 'w/ Cheese', 'over Breadsticks'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Pizza (with Sauce and Cheese and Breadsticks)']);
    });

    it('handles case-insensitive "over" (Over, OVER)', () => {
      const recipes = ['Chicken', 'Over Rice', 'OVER Vegetables'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Chicken (with Rice and Vegetables)']);
    });

    it('handles "over" item at the start of array (no previous item)', () => {
      const recipes = ['over Rice', 'Chicken'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['over Rice', 'Chicken']);
    });

    it('does not match "over" without trailing space', () => {
      const recipes = ['Chicken', 'overRice'];
      const result = client.mergeWithItems(recipes);
      expect(result).toEqual(['Chicken', 'overRice']);
    });
  });

  describe("formatMenu() function", () => {
    it('adds "with a side of" prefix when entrees and a single side are present', () => {
      const recipeCategories = [
        {
          CategoryName: "Entrees",
          Recipes: [
            { RecipeName: "Chicken Tenders" },
            { RecipeName: "Fish Sticks" }
          ]
        },
        {
          CategoryName: "Grain",
          Recipes: [{ RecipeName: "Brown Rice" }]
        }
      ];

      const result = client.formatMenu(recipeCategories);
      expect(result).toBe("Chicken Tenders or Fish Sticks with a side of Brown Rice.");
    });

    it('adds "with sides of" prefix when entrees and multiple sides are present', () => {
      const recipeCategories = [
        {
          CategoryName: "Entrees",
          Recipes: [
            { RecipeName: "Chicken Tenders" },
            { RecipeName: "Fish Sticks" }
          ]
        },
        {
          CategoryName: "Grain",
          Recipes: [{ RecipeName: "Brown Rice" }]
        },
        {
          CategoryName: "Vegetable",
          Recipes: [
            { RecipeName: "Green Beans" },
            { RecipeName: "Carrots" }
          ]
        }
      ];

      const result = client.formatMenu(recipeCategories);
      expect(result).toBe("Chicken Tenders or Fish Sticks with sides of Brown Rice, Green Beans, and Carrots.");
    });

    it('does not add "with sides of" prefix when only sides are present', () => {
      const recipeCategories = [
        {
          CategoryName: "Grain",
          Recipes: [{ RecipeName: "Brown Rice" }]
        },
        {
          CategoryName: "Fruit",
          Recipes: [{ RecipeName: "Apple Slices" }]
        }
      ];

      const result = client.formatMenu(recipeCategories);
      expect(result).toBe("Brown Rice and Apple Slices.");
    });

    it('formats entrees without sides correctly', () => {
      const recipeCategories = [
        {
          CategoryName: "Entrees",
          Recipes: [
            { RecipeName: "Pizza" },
            { RecipeName: "Burger" }
          ]
        }
      ];

      const result = client.formatMenu(recipeCategories);
      expect(result).toBe("Pizza or Burger.");
    });

    it('lists a legacy alternative category ("Choice 2 - includes fruit...") as its own sentence joined with "and"', () => {
      const recipeCategories = [
        { CategoryName: "Entrees", Recipes: [{ RecipeName: "Pizza" }] },
        {
          CategoryName: "Choice 2 - includes fruit, vegetable & milk",
          Recipes: [{ RecipeName: "PBJ Uncrustable" }, { RecipeName: "String Cheese" }, { RecipeName: "Baked Chips" }]
        }
      ];

      const result = client.formatMenu(recipeCategories);
      expect(result).toBe("Pizza. Or PBJ Uncrustable, String Cheese, and Baked Chips.");
    });

    it('uses ", plus sides of" when the entree already has "with" items', () => {
      const recipeCategories = [
        { CategoryName: "Entrees", Recipes: [{ RecipeName: "Cheese Tortellini" }] },
        { CategoryName: "With", Recipes: [{ RecipeName: "Marinara Sauce" }] },
        { CategoryName: "Fruits & Vegetables", Recipes: [{ RecipeName: "Caesar Salad" }, { RecipeName: "Fruit" }] }
      ];

      const result = client.formatMenu(recipeCategories);
      expect(result).toBe("Cheese Tortellini with Marinara Sauce, plus sides of Caesar Salad and Fruit.");
    });

    it("returns an empty string when there is nothing to show", () => {
      expect(client.formatMenu([])).toBe("");
      expect(client.formatMenu([{ CategoryName: "Milk", Recipes: [{ RecipeName: "Skim Milk" }] }])).toBe("");
    });
  });
});
