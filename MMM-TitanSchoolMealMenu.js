Module.register("MMM-TitanSchoolMealMenu", {
  defaults: {
    retryDelayMs: 20 * 1000, // milliseconds
    updateIntervalMs: 60 * 60 * 1000, // milliseconds
    numberOfDaysToDisplay: 3,
    bufferDays: 7, // Extra days to fetch as buffer for filtering empty days. Set to 0 to disable filtering.
    size: "medium",
    todayClass: "large",
    displayCurrentWeek: false,
    weekStartsOnMonday: false,
    hideEmptyDays: false,
    hideEmptyMeals: false,
    layout: "lines", // "lines": entree / alternatives / sides on separate lines. "sentence": one natural-language sentence.
    showAlternatives: true, // Show alternative meals (Choice 2, Grab & Go, Box Lunch)
    showSides: true, // Show the sides shared by every entree (fruit, vegetables, dessert)
    mealSidesLimit: 2, // Max sides attached to an entree (burger toppings, etc.) before "and more". 0 hides them.
    hideEverydaySides: false, // Hide shared sides that appear on every fetched day (e.g. "Assorted Fruit Choices")
    recipeCategoriesToInclude: [], // Empty = all categories (except recipeCategoriesToExclude)
    recipeCategoriesToExclude: ["Milk", "Condiment"],
    entreeJoiner: " or ",
    showCategoryLabels: false,
    useOxfordComma: true,
    alternativeLabel: "",
    debug: false
  },

  requiresVersion: "2.1.0", // Required version of MagicMirror

  start: function () {
    var self = this;

    this.dataNotification = null; // This will contain the (formatted) data from the remote API after each request
    this.dataError = false; // Toggle to true if an API request results in an error
    this.loaded = false; // Toggle to true once this module has configured its API client and is ready to make API requests
    // The instanceName is used to "namespace" the notifications when there are multiple instances of the TitanSchoolMealMenu module fetching different school menus
    this.instanceName = `${this.config.buildingId}_${this.config.districtId}`;

    // Send the module config to the node_helper
    this.broadcastConfig({
      ...this.config,
      instanceName: this.instanceName
    });

    // Schedule update timer
    setInterval(function () {
      self.getData();
      //   self.updateDom();
    }, self.config.updateIntervalMs);
  },

  getNamespacedNotificationName: function (notificationName) {
    return `TITANSCHOOLS_${notificationName}::${this.instanceName}`;
  },

  sendNamespacedSocketNotification: function (notificationName, config) {
    return this.sendSocketNotification(
      this.getNamespacedNotificationName(notificationName),
      config
    );
  },

  broadcastConfig: function (config) {
    // This notification is intentionally *NOT NAMESPACED*
    // This is the first notification that establishes a new instance of the TitaSchoolMealMenu module, so the
    // namespaced notifications haven't been registered yet (the listeners don't know the name of this instance yet).
    this.sendSocketNotification(`TITANSCHOOLS_SET_CONFIG`, config);
  },

  getData: function () {
    this.sendNamespacedSocketNotification(`FETCH_DATA_REQUEST`, {});
  },

  scheduleUpdate: function (delay) {
    var nextLoad = this.config.retryDelayMs;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    var self = this;
    setTimeout(function () {
      self.getData();
    }, nextLoad);
  },

  getDom: function () {
    var self = this;

    var wrapper = document.createElement("div");

    if (!this.loaded) {
      wrapper.innerHTML =
        "<span class='small fa fa-refresh fa-spin fa-fw'></span>";
      wrapper.className = "small dimmed";
      return wrapper;
    }

    if (this.dataNotification && this.dataError) {
      // The remote API responded with an error which is now stored in this.dataNotification
      wrapper.innerHTML = `<div>${
        this.dataNotification
      }</div><div><span class='small fa fa-refresh fa-spin fa-fw'></span>Retry in ${
        this.config.retryDelayMs / 1000
      } seconds...</div>`;
      wrapper.className = "error";
      return wrapper;
    }

    // Data from helper
    if (this.dataNotification && !this.dataError) {
      const wrapperDataNotification = document.createElement("div");

      // Check if we have any menu data to display
      if (this.dataNotification.length === 0) {
        const noMenuMessage = document.createElement("div");
        noMenuMessage.className = `small dimmed ${this.config.size || ""}`;
        noMenuMessage.innerHTML = "No menu available for the upcoming days";
        wrapper.appendChild(noMenuMessage);
        return wrapper;
      }

      const meals = document.createElement("ul");
      meals.className = `meal-list ${this.config.size || ""}`;
      this.dataNotification.forEach((dayMenu, index) => {
        if (this.config.hideEmptyDays && !dayMenu.breakfast && !dayMenu.lunch) {
          return;
        }

        // Day list item.
        const dayListItem = document.createElement("li");
        dayListItem.className = dayMenu.label == 'Today' ? this.config.todayClass || "" : "";
        const dayLabel = document.createElement("span");
        dayLabel.className = "day-label";
        dayLabel.innerHTML = dayMenu.label;
        dayListItem.appendChild(dayLabel);
        meals.appendChild(dayListItem);

        // Breakfast.
        if (dayMenu.breakfast || !this.config.hideEmptyMeals) {
          dayListItem.appendChild(this.renderMeal("Breakfast", "breakfast", dayMenu.breakfast));
        }

        // Lunch.
        if (dayMenu.lunch || !this.config.hideEmptyMeals) {
          dayListItem.appendChild(this.renderMeal("Lunch", "lunch", dayMenu.lunch));
        }
      });

      wrapperDataNotification.appendChild(meals);
      wrapper.appendChild(wrapperDataNotification);
    }

    return wrapper;
  },

  /**
   * Renders one meal (breakfast or lunch) for a day.
   *
   * @param {string} title - "Breakfast" or "Lunch"
   * @param {string} mealClass - CSS class suffix ("breakfast" or "lunch")
   * @param {Object|null} menu - { main, alternatives: [{ label, text }], sides: [], text } from the node helper
   */
  renderMeal: function (title, mealClass, menu) {
    const mealList = document.createElement("ul");
    const mealItem = document.createElement("li");
    const mealTitle = document.createElement("span");
    const mealRecipes = document.createElement("span");

    mealTitle.innerHTML = `${title}: `;
    mealTitle.className = "meal-title";
    mealRecipes.className = "meal-recipes";

    if (!menu) {
      mealRecipes.textContent = "none";
    } else if (this.config.layout === "sentence") {
      mealRecipes.textContent = menu.text || "none";
    } else {
      this.renderMealLines(mealRecipes, menu);
    }

    mealList.className = `meal-description ${mealClass}-description`;
    mealList.appendChild(mealItem);
    mealItem.appendChild(mealTitle);
    mealItem.appendChild(mealRecipes);
    return mealList;
  },

  /**
   * "lines" layout: the main entree on its own line, each alternative meal on a dimmed "or ..." line,
   * then the shared sides on a smaller dimmed line.
   */
  renderMealLines: function (container, menu) {
    const lines = [];

    if (menu.main) {
      lines.push({ className: "meal-main", text: menu.main });
    }

    if (this.config.showAlternatives) {
      (menu.alternatives || []).forEach((alternative) => {
        // Only the very first line of a meal goes without an "or"
        const prefix = alternative.label || (lines.length > 0 ? "or" : "");
        lines.push({
          className: "meal-alternative dimmed",
          text: `${prefix} ${alternative.text}`.trim()
        });
      });
    }

    if (this.config.showSides && (menu.sides || []).length > 0) {
      lines.push({ className: "meal-sides dimmed", text: menu.sides.join(" \u00b7 ") });
    }

    if (lines.length === 0) {
      container.textContent = "none";
      return;
    }

    lines.forEach((line) => {
      const lineElement = document.createElement("div");
      lineElement.className = line.className;
      lineElement.textContent = line.text;
      container.appendChild(lineElement);
    });
  },

  getScripts: function () {
    return [];
  },

  getStyles: function () {
    return ["MMM-TitanSchoolMealMenu.css"];
  },

  getTranslations: function () {
    return {
      en: "translations/en.json"
      //   es: 'translations/es.json',
    };
  },

  // socketNotificationReceived from helper
  socketNotificationReceived: function (notificationName, payload) {
    if (
      notificationName ===
      this.getNamespacedNotificationName("FETCH_DATA_SUCCESS")
    ) {
      this.dataNotification = payload;
      this.dataError = false;
      this.loaded = true;
      this.updateDom();
    }

    if (
      notificationName ===
      this.getNamespacedNotificationName("FETCH_DATA_FAILED")
    ) {
      console.error(payload);
      console.error(
        `Retrying in ${this.config.retryDelayMs / 1000} seconds...`
      );
      this.scheduleUpdate();

      this.dataNotification = payload;
      this.dataError = true;
      this.loaded = true;
      this.updateDom();
    }

    if (
      notificationName === this.getNamespacedNotificationName("CLIENT_READY")
    ) {
      this.loaded = true;
      this.getData();
      this.updateDom();
    }
  }
});
