angular.module('app').controller('BountiesSearchController', function($scope, $routeParams, $location, $api, $filter, $anchorScroll) {
  $scope.reset_form_data = function() {
    $scope.form_data = {
      direction: "desc",
      order: "bounty_total",
      can_add_bounty: "true",
      languages: [],
      trackers: []
    };
  };

  $scope.reset_form_data();

  // sets drop-down bounty types
  $scope.bounty_types = ["Show All Bounties", "Crypto Bounties Only", "Cash Bounties Only"];
  $scope.bountyType = $scope.bounty_types[0];

  //sets drop-down sorting options
  $scope.sort_options = {
    option1 : { label: "Value (Highest to Lowest)", value: "bounty_total", direction: "desc"},
    option2 : { label: "Value (Lowest to Highest)", value: "bounty_total", direction: "asc"},
    option3 : { label: "Date (Newest to Oldest", value: "earliest_bounty", direction: "desc"},
    option4 : { label: "Date (Oldest to Newest", value: "earliest_bounty", direction: "asc"},
    option5 : { label: "Backers (Most to Least)", value: "backers_count", direction: "desc"},
    option6 : { label: "Backers (Least to Most)", value: "backers_count", direction: "asc"}
  };
  $scope.selectedSort = $scope.sort_options.option1;

  // update order and direction when options change
  $scope.updateSort = function(selectedSort) {
    $scope.form_data.order = selectedSort.value;
    $scope.form_data.direction = selectedSort.direction;
  }

  // toggle advanced search collapse
  $scope.toggle_advanced_search = function () {
    $scope.show_advanced_search = !$scope.show_advanced_search;
  };

  // trackers search
  $scope.trackers_to_load_from_params = [];
  $scope.trackers_loaded = [];
  $scope.tracker = {};

  $scope.do_tracker_typeahead = function($viewValue) {
    return $api.tracker_typeahead($viewValue).then(function (trackers) {
      debugger
      $scope.$watch('trackers_input', function(newValue, oldValue, scope) {
        for (var i = 0; i < trackers.length; i++) {
          if (!newValue) {
            break;
          }
          if (newValue.id === trackers[i].id) {
            scope.trackers_loaded.push(newValue);
            scope.form_data.trackers.push(trackers[i].id);
            scope.trackers_input = "";
            break;
          }
        }
      });

      return trackers;
    });
  };

  $scope.$watch('trackers_to_load_from_params', function(newValue, oldValue, scope) {
    if (newValue && newValue.length > 0) {
      var ids = newValue.join(",");
      $api.trackers_get_bulk(ids).then(function(response) {
        if (!response.error) {
          $scope.trackers_loaded = $scope.trackers_loaded.concat(response);
        }
      });
    }
  });
  
  //removes trackers from trackers_loaded array
  $scope.remove_tracker = function(tracker) {
    for (var i=0;i<$scope.trackers_loaded.length;i++) {
      if (tracker.id === $scope.trackers_loaded[i].id) {
        $scope.trackers_loaded.splice(i, 1);
        break;
      }
    }
    for (var e=0;e<$scope.form_data.trackers.length;e++) {
      if (tracker.id === $scope.form_data.trackers[e]) {
        $scope.form_data.trackers.splice(e, 1);
        break;
      }
    }
  };

  $scope.languages_to_load_from_params = [];
  $scope.languages_loaded = [];

  $scope.languages_promise = $api.languages_get().then(function(languages) {
    languages.sort(function(a,b) {
      return (a.weight > b.weight ? -1 : (a.weight === b.weight ? 0 : 1));
    });


    $scope.$watch('languages_to_load_from_params', function(newValue, oldValue, scope) {
      if (scope.languages_to_load_from_params && $scope.languages_to_load_from_params.length > 0) {
        for (var i=0;i<scope.languages_to_load_from_params.length; i++) {
          var language_id = scope.languages_to_load_from_params[i];
          for (var e=0;e<languages.length;e++) {
            if (language_id === languages[e].id) {
              scope.languages_loaded.push(languages[e]);
              continue;
            }
          }
        }
        scope.languages_to_load_from_params = [];
      }
    });

    // watches selected_language input model, adds value to languages_loaded array
    $scope.$watch('languages_input', function(newValue, oldValue, scope) {
      for (var i=0;i<languages.length;i++) {
        if (!newValue) {
          break;
        }
        else if (newValue.id === languages[i].id) {
          scope.languages_loaded.push(languages[i]); // language badge
          scope.form_data.languages.push(languages[i].id);
          scope.languages_input = "";
          break;
        }
      }
    });

    $scope.all_languages = languages;
    return languages;
  });

  //removes languages from selected_languages array
  $scope.remove_language = function(language) {
    for (var i = 0; i < $scope.languages_loaded.length; i++) {
      if (language.id === $scope.languages_loaded[i].id) {
        $scope.languages_loaded.splice(i, 1);
        break;
      }
    }

    for (var e=0;e<$scope.form_data.languages.length;e++) {
      if (language.id === $scope.form_data.languages[e]) {
        $scope.form_data.languages.splice(e, 1);
        break;
      }
    }
  };

  $scope.submit_query = function(page) {

    if (!page) {
      $scope.loading_search_results = true;
    }

    $scope.form_data.page = page || 1;
    var cleaned_form_data = clean_object($scope.form_data);
    $location.search(cleaned_form_data);
    $scope.featured_issues = []; // removes featured issues from view
    $api.bounty_search(cleaned_form_data).then(function(response) {
      $scope.search_results = response.issues;
      $scope.issues_count = response.issues_total;
      $scope.perPage = 50;
      $scope.maxSize = 10;
      $scope.pageCount = Math.ceil($scope.issues_count / $scope.perPage);
      $scope.loading_search_results = false;
      $anchorScroll();
    });
  };

  var clean_object = function(data) {
    if (!data) {
      return false;
    }
    var result = {};
    for (var key in data) {
      var value = data[key];
      if (!value) { // null or undefined ng-model values
        continue;
      }

      var value_typeof = typeof value;
      switch(value_typeof) {
      case 'string':
        if (value !== "") {
          result[key] = value;
        }
        break;
      case 'object':
        // case to handle arrays
        if (angular.isArray(value)) {
          result[key] = value.toString();
          break;
        }

        if (typeof value.length !== 'undefined') { // needed to prevent a value.length of zero from evaluating to false
          if (value.length > 0) {
            result[key] = value;
          }
        } else { // not a hash, keep object
          result[key] = value;
        }
        break;
      case 'number':
        if (value !== 0) {
          result[key] = value;
        }
        break;
      }
    }
    return result;
  };

  //updates pagination. resubmits query with new page number.
  $scope.updatePage = function(page) {
    $scope.submit_query(page);
  };


  $scope.populate_form_data_with_route_params = function() {
    $scope.reset_form_data();
    for (var key in $routeParams) {
      if (!$routeParams[key] || $routeParams[key] === "" || $routeParams[key].length < 1) { // if $routeParams value is undefined, blank, or length is less than 1
        continue;
      }
      else if (key === "languages" || key === "trackers") {
        var result_arr = [];
        if ($routeParams[key].match(/^\d+$/)) { // parse to integer if just a stringified number (e.g., '9')
          result_arr.push(parseInt($routeParams[key], 10));
        }
        else if ($routeParams[key].match(/^\d+,{1,}\d+$/)) { // get ids from comma separated values (e.g., '45,67,5')
          var string_arr = $routeParams[key].split(",");
          for (var i=0;i<string_arr.length;i++) {
            result_arr.push(parseInt(string_arr[i], 10));
          }
        }
        var key_name = key + "_to_load_from_params"; // $scope.trackers_to_load_from_params or $scope.languages_to_load_from_params
        $scope[key_name] = result_arr; // add to $scope.trackers_to_load_from_params or $scope.languages_to_load_from_params, triggering their respective watches for creating badge
        $scope.form_data[key] = result_arr;
      }
      else if (key === "min" || key === "max") {
        $scope.form_data[key] = parseInt($routeParams[key], 10);
      }
      else {
        $scope.form_data[key] = $routeParams[key];
      }
    }
  };

  if (Object.keys($routeParams).length > 0) {
    $scope.populate_form_data_with_route_params();
    $scope.submit_query();
  } else {
    // $scope.loading_featured_issues = true;
    $scope.submit_query();
    // $api.issues_featured().then(function(response) {
    //   $scope.featured_issues = $filter('shuffle')(response).slice(0,5);
    //   $scope.loading_featured_issues = false;
    //   return response;
    // });
  }
});
