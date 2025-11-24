const TitanSchoolsClient = require("../../TitanSchoolsClient");
const mockApiResponse = require("./mocks/mockApiResponse");

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
      console.log(menusByDate);

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
          expect(day.menu.length > 0).toBeTruthy();
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
        expect(day.menu.length > 0).toBeTruthy();
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
  });

  describe("formatMenu() function", () => {
    it('adds "with sides of" prefix when entrees and sides are present', () => {
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
  });
});
