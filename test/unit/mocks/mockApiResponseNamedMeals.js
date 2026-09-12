/**
 * An API response captured from https://api.linqconnect.com/api/FamilyMenu in September 2026.
 *
 * This is the newer response shape where each day is split into several named MenuMeals:
 *   "2-1 Elementary"        - the main meal (Entrees plus With/Over/Sides categories that belong to the entree)
 *   "2-1 Choice 2"          - an alternative complete meal
 *   "Sides for All Entrees" - sides shared by every entree (Fruits & Vegetables, Dessert, Milk)
 * Nutrition data has been stripped to keep the file small.
 */
const data = {
  "FamilyMenuSessions": [
    {
      "ServingSession": "Breakfast",
      "MenuPlans": [
        {
          "MenuPlanName": "Breakfast - Elementary B 26-27",
          "Days": [
            {
              "Date": "9/14/2026",
              "MenuMeals": [
                {
                  "MenuPlanName": "Breakfast - Elementary B 26-27",
                  "MenuMealName": "2-1 Elementary",
                  "MenuMealId": "a8eb076e-3db7-eb11-a2c3-8eb4a8a72e69",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "3aa6142c-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "F323",
                          "RecipeName": "Banana Choc Chip Muffin Bread",
                          "ServingSize": "Loaf 2.3 oz"
                        },
                        {
                          "ItemId": "e68aed5b-7181-ed11-b95b-8b7c3728f5a8",
                          "RecipeIdentifier": "D392",
                          "RecipeName": "Maple Waffle Snaps",
                          "ServingSize": "Bag 1.9oz"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Breakfast - Elementary B 26-27",
                  "MenuMealName": "Sides for All Entrees",
                  "MenuMealId": "e576ee1a-ecb7-eb11-a2c5-ee2f34ecf628",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Sides",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "fc6c64e1-d52d-f111-bb50-0214fde75851",
                          "RecipeIdentifier": "R2550",
                          "RecipeName": "Breakfast Protein Item",
                          "ServingSize": "Item"
                        },
                        {
                          "ItemId": "f7047085-dd50-ef11-a7d9-acb4aa52e444",
                          "RecipeIdentifier": "R2417",
                          "RecipeName": "Assorted Fruit Choices",
                          "ServingSize": "1/2 cup"
                        },
                        {
                          "ItemId": "014f0e6b-a7bc-eb11-a2cc-c7bcfe9774aa",
                          "RecipeIdentifier": "R2106",
                          "RecipeName": "Assorted 100% Fruit Juice",
                          "ServingSize": "Cup 4 fl oz"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Milk",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "08592a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C257",
                          "RecipeName": "Skim Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "e1582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C253",
                          "RecipeName": "1% White Milk",
                          "ServingSize": "Carton 8 oz"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "Date": "9/16/2026",
              "MenuMeals": [
                {
                  "MenuPlanName": "Breakfast - Elementary B 26-27",
                  "MenuMealName": "2-2 Elementary",
                  "MenuMealId": "b66c5a70-3db7-eb11-a2c3-9d0e09607d93",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "d67278eb-6803-f111-bb44-0275d25950cd",
                          "RecipeIdentifier": "F663",
                          "RecipeName": "Apple Berry Smoothie",
                          "ServingSize": "Carton 7.6 fl oz"
                        },
                        {
                          "ItemId": "1ff15085-7f03-f111-bb43-0e5e6fe908d5",
                          "RecipeIdentifier": "R2534",
                          "RecipeName": "with Giant Goldfish Graham Crackers",
                          "ServingSize": "Pkg 2 ct"
                        },
                        {
                          "ItemId": "e68aed5b-7181-ed11-b95b-8b7c3728f5a8",
                          "RecipeIdentifier": "D392",
                          "RecipeName": "Maple Waffle Snaps",
                          "ServingSize": "Bag 1.9oz"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Breakfast - Elementary B 26-27",
                  "MenuMealName": "Sides for All Entrees",
                  "MenuMealId": "e576ee1a-ecb7-eb11-a2c5-ee2f34ecf628",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Sides",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "fc6c64e1-d52d-f111-bb50-0214fde75851",
                          "RecipeIdentifier": "R2550",
                          "RecipeName": "Breakfast Protein Item",
                          "ServingSize": "Item"
                        },
                        {
                          "ItemId": "f7047085-dd50-ef11-a7d9-acb4aa52e444",
                          "RecipeIdentifier": "R2417",
                          "RecipeName": "Assorted Fruit Choices",
                          "ServingSize": "1/2 cup"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Milk",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "08592a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C257",
                          "RecipeName": "Skim Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "e1582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C253",
                          "RecipeName": "1% White Milk",
                          "ServingSize": "Carton 8 oz"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "Date": "9/17/2026",
              "MenuMeals": [
                {
                  "MenuPlanName": "Breakfast - Elementary B 26-27",
                  "MenuMealName": "2-4 Elementary",
                  "MenuMealId": "888b567a-3db7-eb11-a2c3-de6fdf662d87",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "240debfc-e580-ef11-ba20-df6301c12a0c",
                          "RecipeIdentifier": "F614",
                          "RecipeName": "Cinnamon Toast Crunch Muffin",
                          "ServingSize": "Muffin 3.1oz"
                        },
                        {
                          "ItemId": "e68aed5b-7181-ed11-b95b-8b7c3728f5a8",
                          "RecipeIdentifier": "D392",
                          "RecipeName": "Maple Waffle Snaps",
                          "ServingSize": "Bag 1.9oz"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Breakfast - Elementary B 26-27",
                  "MenuMealName": "Sides for All Entrees",
                  "MenuMealId": "e576ee1a-ecb7-eb11-a2c5-ee2f34ecf628",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Sides",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "fc6c64e1-d52d-f111-bb50-0214fde75851",
                          "RecipeIdentifier": "R2550",
                          "RecipeName": "Breakfast Protein Item",
                          "ServingSize": "Item"
                        },
                        {
                          "ItemId": "f7047085-dd50-ef11-a7d9-acb4aa52e444",
                          "RecipeIdentifier": "R2417",
                          "RecipeName": "Assorted Fruit Choices",
                          "ServingSize": "1/2 cup"
                        },
                        {
                          "ItemId": "014f0e6b-a7bc-eb11-a2cc-c7bcfe9774aa",
                          "RecipeIdentifier": "R2106",
                          "RecipeName": "Assorted 100% Fruit Juice",
                          "ServingSize": "Cup 4 fl oz"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Milk",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "08592a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C257",
                          "RecipeName": "Skim Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "e1582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C253",
                          "RecipeName": "1% White Milk",
                          "ServingSize": "Carton 8 oz"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "ServingSession": "Lunch",
      "MenuPlans": [
        {
          "MenuPlanName": "Lunch - Elementary 26-27",
          "Days": [
            {
              "Date": "9/14/2026",
              "MenuMeals": [
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "2-1 Elementary",
                  "MenuMealId": "a8eb076e-3db7-eb11-a2c3-8eb4a8a72e69",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "c86e9cca-3bb7-eb11-a2c3-b951a05d0f2b",
                          "RecipeIdentifier": "R2096",
                          "RecipeName": "Mini Pancakes",
                          "ServingSize": "Package"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Sides",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "39b618a0-f1f1-ee11-a85d-848f1da9f93f",
                          "RecipeIdentifier": "F586",
                          "RecipeName": "Chicken Sausage Patty",
                          "ServingSize": "Patty 1.5oz"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "2-1 Choice 2",
                  "MenuMealId": "6257766e-d450-ef11-a7d9-fccde91aa661",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "468bfb24-4292-f011-81df-42010a0b006b",
                          "RecipeIdentifier": "R2521",
                          "RecipeName": "PBJ Uncrustable Sandwich",
                          "ServingSize": "Sandwich"
                        }
                      ]
                    },
                    {
                      "CategoryName": "With",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "25f0fa65-7433-f111-bb50-0affc39fe331",
                          "RecipeIdentifier": "R2566",
                          "RecipeName": "Baked Chips or Crackers",
                          "ServingSize": "1 pkg"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "Sides for All Entrees",
                  "MenuMealId": "e576ee1a-ecb7-eb11-a2c5-ee2f34ecf628",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Fruits & Vegetables",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "8daa142c-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "F407",
                          "RecipeName": "Hashbrown Patties",
                          "ServingSize": "2 Patties"
                        },
                        {
                          "ItemId": "192d9ad5-19b9-ed11-82b1-a0d64a2c0822",
                          "RecipeIdentifier": "F531",
                          "RecipeName": "Dragon Juice",
                          "ServingSize": "Carton 4 oz"
                        },
                        {
                          "ItemId": "24625fed-93a3-ef11-8365-c41d8abbc87b",
                          "RecipeIdentifier": "R2446",
                          "RecipeName": "Assorted Fruit Choices",
                          "ServingSize": "1/2 cup"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Milk",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "08592a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C257",
                          "RecipeName": "Skim Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "e1582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C253",
                          "RecipeName": "1% White Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "eb582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C254",
                          "RecipeName": "Chocolate Milk",
                          "ServingSize": "Carton 8 oz"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "Date": "9/16/2026",
              "MenuMeals": [
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "2-3 Elementary",
                  "MenuMealId": "0f4ed674-3db7-eb11-a2c3-dd447022cdc6",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "a16804d0-3210-ee11-a17d-e7940ed37830",
                          "RecipeIdentifier": "R2317",
                          "RecipeName": "Cheese Pizza Slice",
                          "ServingSize": "Slice, 1/8 pizza"
                        },
                        {
                          "ItemId": "2c1833cc-3310-ee11-a17d-e7940ed37830",
                          "RecipeIdentifier": "R2318",
                          "RecipeName": "Turkey & Beef Pepperoni Pizza Slice",
                          "ServingSize": "Slice, 1/8 pizza"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "2-3 Choice 2",
                  "MenuMealId": "c3686d7f-d450-ef11-a7d9-acb4aa52e444",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "ec9f6a60-3ecd-ef11-b768-944d0f7eff24",
                          "RecipeIdentifier": "R2455",
                          "RecipeName": "Beef Taco Salad",
                          "ServingSize": "Salad"
                        }
                      ]
                    },
                    {
                      "CategoryName": "With",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "86842420-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "D145",
                          "RecipeName": "Tortilla Chips",
                          "ServingSize": "Bag 1.45 oz"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "Sides for All Entrees",
                  "MenuMealId": "e576ee1a-ecb7-eb11-a2c5-ee2f34ecf628",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Fruits & Vegetables",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "26160c32-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "F438",
                          "RecipeName": "Green Beans",
                          "ServingSize": "1/2 Cup"
                        },
                        {
                          "ItemId": "8870db62-ff63-f011-ae27-42010a0b001d",
                          "RecipeIdentifier": "R2504",
                          "RecipeName": "Mixed Greens Salad",
                          "ServingSize": "1 cup"
                        },
                        {
                          "ItemId": "86e3cfb2-3363-f011-ae27-42010a0b0027",
                          "RecipeIdentifier": "R2500",
                          "RecipeName": "with Dressing",
                          "ServingSize": "2 Tbsp"
                        },
                        {
                          "ItemId": "692eb5c3-e992-eb11-a2c3-8770cbe93406",
                          "RecipeIdentifier": "R2014",
                          "RecipeName": "Fresh Veggies",
                          "ServingSize": "1/2 Cup"
                        },
                        {
                          "ItemId": "24625fed-93a3-ef11-8365-c41d8abbc87b",
                          "RecipeIdentifier": "R2446",
                          "RecipeName": "Assorted Fruit Choices",
                          "ServingSize": "1/2 cup"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Milk",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "08592a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C257",
                          "RecipeName": "Skim Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "e1582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C253",
                          "RecipeName": "1% White Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "eb582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C254",
                          "RecipeName": "Chocolate Milk",
                          "ServingSize": "Carton 8 oz"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "Date": "9/17/2026",
              "MenuMeals": [
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "2-4 Elementary",
                  "MenuMealId": "888b567a-3db7-eb11-a2c3-de6fdf662d87",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "31a7142c-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "F342",
                          "RecipeName": "Mandarin Orange Chicken",
                          "ServingSize": "4oz spoodle (heaping)"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Over",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "c6cc9b68-ca90-eb11-a2c6-e56e4729f79c",
                          "RecipeIdentifier": "R2004",
                          "RecipeName": "Fluffy Brown Rice",
                          "ServingSize": "1/2 Cup"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "2-4 Choice 2",
                  "MenuMealId": "eaa0d983-d450-ef11-a7d9-fccde91aa661",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Entrees",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "e14d8e64-2af9-ef11-b6b5-42010a0b0004",
                          "RecipeIdentifier": "R2469",
                          "RecipeName": "Yogurt Parfait",
                          "ServingSize": "Parfait"
                        }
                      ]
                    },
                    {
                      "CategoryName": "With",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "9963ae1b-a91c-f111-bb49-0ee71251f365",
                          "RecipeIdentifier": "D478",
                          "RecipeName": "Granola Packet",
                          "ServingSize": "Pkg 1oz"
                        }
                      ]
                    }
                  ]
                },
                {
                  "MenuPlanName": "Lunch - Elementary 26-27",
                  "MenuMealName": "Sides for All Entrees",
                  "MenuMealId": "e576ee1a-ecb7-eb11-a2c5-ee2f34ecf628",
                  "RecipeCategories": [
                    {
                      "CategoryName": "Fruits & Vegetables",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "618275b8-3d67-f011-ad2e-42010a0b0020",
                          "RecipeIdentifier": "R2512",
                          "RecipeName": "Steamed Broccoli",
                          "ServingSize": "1/2 cup"
                        },
                        {
                          "ItemId": "692eb5c3-e992-eb11-a2c3-8770cbe93406",
                          "RecipeIdentifier": "R2014",
                          "RecipeName": "Fresh Veggies",
                          "ServingSize": "1/2 Cup"
                        },
                        {
                          "ItemId": "24625fed-93a3-ef11-8365-c41d8abbc87b",
                          "RecipeIdentifier": "R2446",
                          "RecipeName": "Assorted Fruit Choices",
                          "ServingSize": "1/2 cup"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Dessert",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "553cb152-88b2-eb11-a2cb-b353baca4e6f",
                          "RecipeIdentifier": "D337",
                          "RecipeName": "Fortune Cookie",
                          "ServingSize": "Cookie"
                        }
                      ]
                    },
                    {
                      "CategoryName": "Milk",
                      "Color": "#000000",
                      "Recipes": [
                        {
                          "ItemId": "08592a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C257",
                          "RecipeName": "Skim Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "e1582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C253",
                          "RecipeName": "1% White Milk",
                          "ServingSize": "Carton 8 oz"
                        },
                        {
                          "ItemId": "eb582a1a-de8d-eb11-a2c4-f7d03a5aad29",
                          "RecipeIdentifier": "C254",
                          "RecipeName": "Chocolate Milk",
                          "ServingSize": "Carton 8 oz"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "AcademicCalendars": []
};

module.exports = data;
