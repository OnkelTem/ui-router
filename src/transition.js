

/**
 * @ngdoc object
 * @name ui.router.state.$transitionProvider
 */
$TransitionProvider.$inject = [];
function $TransitionProvider() {

  var $transition = {}, events, stateMatcher = angular.noop, abstractKey = 'abstract';

  function matchState(current, states) {
    var toMatch = angular.isArray(states) ? states : [states];

    for (var i = 0; i < toMatch.length; i++) {
      var glob = GlobBuilder.fromString(toMatch[i]);

      if ((glob && glob.matches(current.name)) || (!glob && toMatch[i] === current.name)) {
        return true;
      }
    }
    return false;
  }

  // $transitionProvider.on({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.on = function(states, callback) {
  };

  // $transitionProvider.onEnter({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.entering = function(states, callback) {
  };

  // $transitionProvider.onExit({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.exiting = function(states, callback) {
  };

  // $transitionProvider.onSuccess({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.onSuccess = function(states, callback) {
  };

  // $transitionProvider.onError({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.onError = function(states, callback) {
  };


  /**
   * @ngdoc service
   * @name ui.router.state.$transition
   *
   * @requires $q
   * @requires $injector
   * @requires ui.router.util.$resolve
   *
   * @description
   * The `$transition` service manages changes in states and parameters.
   */
  this.$get = $get;
  $get.$inject = ['$q', '$injector', '$resolve', '$stateParams'];
  function $get(   $q,   $injector,   $resolve,   $stateParams) {

    var from = { state: null, params: null },
        to   = { state: null, params: null };
    var _fromPath = null; // contains resolved data

    /**
     * @ngdoc object
     * @name ui.router.state.type:Transition
     *
     * @description
     * Represents a transition between two states, and contains all contextual information about the
     * to/from states and parameters, as well as the list of states being entered and exited as a
     * result of this transition.
     *
     * @param {Object} fromState The origin {@link ui.router.state.$stateProvider#state state} from which the transition is leaving.
     * @param {Object} fromParams An object hash of the current parameters of the `from` state.
     * @param {Object} toState The target {@link ui.router.state.$stateProvider#state state} being transitioned to.
     * @param {Object} toParams An object hash of the target parameters for the `to` state.
     * @param {Object} options An object hash of the options for this transition.
     *
     * @returns {Object} New `Transition` object
     */
    function Transition(fromState, fromParams, toState, toParams, options) {
      var transition = this; // Transition() object

      // grab $transition's current path
      var toPath, fromPath = _fromPath; // Path() objects
      var retained, entering, exiting; // Path() objects
      var keep = 0, state, hasRun = false, hasCalculated = false;

      var states = {
        to: stateMatcher(toState, options),
        from: stateMatcher(fromState, options)
      };
      toState = states.to; fromState = states.from;

      if (!toState || !fromState) {
        throw new Error("To or from state not valid for transition: " + angular.toJson({
          to: toState, from: fromState
        }));
      }

      function isTargetStateValid() {
        var state = states.to;

        if (!isDefined(state)) {
          if (!options || !options.relative) return "No such state " + angular.toJson(toState);
          return "Could not resolve " + angular.toJson(toState) + " from state " + angular.toJson(options.relative);
        }
        if (state[abstractKey]) return "Cannot transition to abstract state " + angular.toJson(toState);
        return null;
      }

      function hasBeenSuperseded() {
        return !(fromState === from.state && fromParams === from.params);
      }

      function calculateTreeChanges() {
        if (hasCalculated) return;

        state = toState.path[keep];
        while (state && state === fromState.path[keep] && equalForKeys(toParams, fromParams, state.ownParams)) {
          keep++;
          state = toState.path[keep];
        }

        // fromPath contains previously resolved data; emptyToPath has nothing resolved yet.
        retained = fromPath.slice(0, keep);
        exiting = fromPath.slice(keep);
        entering = new Path(toState.path).slice(keep);
        toPath = retained.concat(entering);

        hasCalculated = true;
      }

      function transitionStep(fn, resolveContext) {
        return function() {
          if ($transition.transition !== transition) return transition.SUPERSEDED;
          return pathElement.invokeAsync(fn, { $stateParams: undefined, $transition$: transition }, resolveContext)
            .then(function(result) {
              return result ? result : $q.reject(transition.ABORTED);
            });
        };
      }

      function buildTransitionSteps() {
        // create invokeFn fn.
        // - checks if current transition has been superseded
        // - invokes Fn async
        // - checks result.  If falsey, rejects promise

        // get exiting & reverse them
        // get entering

        // walk exiting()
        // - InvokeAsync
        // resolve all eager Path resolvables
        // walk entering()
        // - resolve PathElement lazy resolvables
        // - then, invokeAsync onEnter

        var exitingElements = transition.exiting().slice(0).reverse().elements;
        var enteringElements = transition.entering().elements;
        var promiseChain = $q.when(true);

        forEach(exitingElements, function(elem) {
          if (elem.state.onExit) {
            var nextStep = transitionStep(elem.state.onExit, fromPath.resolveContext(elem));
            promiseChain.then(nextStep);
          }
        });

        forEach(enteringElements, function(elem) {
          var resolveContext = toPath.resolveContext(elem);
          promiseChain.then(function() { return elem.resolve(resolveContext, { policy: "lazy" }); });
          if (elem.state.onEnter) {
            var nextStep = transitionStep(elem.state.onEnter, resolveContext);
            promiseChain.then(nextStep);
          }
        });

        return promiseChain;
      }

      extend(this, {
        /**
         * @ngdoc function
         * @name ui.router.state.type:Transition#from
         * @methodOf ui.router.state.type:Transition
         *
         * @description
         * Returns the origin state of the current transition, as passed to the `Transition` constructor.
         *
         * @returns {Object} The origin {@link ui.router.state.$stateProvider#state state} of the transition.
         */
        from: extend(function() { return fromState; }, {

          /**
           * @ngdoc function
           * @name ui.router.state.type:Transition.from#state
           * @methodOf ui.router.state.type:Transition
           *
           * @description
           * Returns the object definition of the origin state of the current transition.
           *
           * @returns {Object} The origin {@link ui.router.state.$stateProvider#state state} of the transition.
           */
          state: function() {
            return states.from && states.from.self;
          },

          $state: function() {
            return states.from;
          }
        }),

        /**
         * @ngdoc function
         * @name ui.router.state.type:Transition#to
         * @methodOf ui.router.state.type:Transition
         *
         * @description
         * Returns the target state of the current transition, as passed to the `Transition` constructor.
         *
         * @returns {Object} The target {@link ui.router.state.$stateProvider#state state} of the transition.
         */
        to: extend(function() { return toState; }, {

          /**
           * @ngdoc function
           * @name ui.router.state.type:Transition.to#state
           * @methodOf ui.router.state.type:Transition
           *
           * @description
           * Returns the object definition of the target state of the current transition.
           *
           * @returns {Object} The target {@link ui.router.state.$stateProvider#state state} of the transition.
           */
          state: function() {
            return states.to && states.to.self;
          },

          $state: function() {
            return states.to;
          }
        }),

        is: function(compare) {
          if (compare instanceof Transition) {
            // TODO: Also compare parameters
            return this.is({ to: compare.to.$state().name, from: compare.from.$state().name });
          }
          return !(
            (compare.to && !matchState(this.to.$state(), compare.to)) ||
            (compare.from && !matchState(this.from.$state(), compare.from))
          );
        },

        isValid: function() {
          return isTargetStateValid() === null && !hasBeenSuperseded();
        },

        rejection: function() {
          var reason = isTargetStateValid();
          return reason ? $q.reject(new Error(reason)) : null;
        },

        /**
         * @ngdoc function
         * @name ui.router.state.type:Transition#params
         * @methodOf ui.router.state.type:Transition
         *
         * @description
         * Gets the origin and target parameters for the transition.
         *
         * @returns {Object} An object with `to` and `from` keys, each of which contains an object hash of
         * state parameters.
         */
        params: function() {
          // toParams = (options.inherit) ? inheritParams(fromParams, toParams, from, toState);
          return { from: fromParams, to: toParams };
        },

        options: function() {
          return options;
        },

        entering: function() {
          calculateTreeChanges();
          return entering;
        },

        exiting: function() {
          calculateTreeChanges();
          return exiting;
        },

        retained: function() {
          calculateTreeChanges();
          return retained;
        },

        // Should this return views for `retained.concat(entering).states()` ?
        // As it stands, it will only return views for the entering states
        views: function() {
          return map(entering.states(), function(state) {
            return [state.self, state.views];
          });
        },

        redirect: function(to, params, options) {
          if (to === toState && params === toParams) return false;
          return new Transition(fromState, fromParams, to, params, options || this.options());
        },

        ensureValid: function(failHandler) {
          if (this.isValid()) return $q.when(this);
          return $q.when(failHandler(this));
        },

        /**
         * @ngdoc function
         * @name ui.router.state.type:Transition#ignored
         * @methodOf ui.router.state.type:Transition
         *
         * @description
         * Indicates whether the transition should be ignored, based on whether the to and from states are the
         * same, and whether the `reload` option is set.
         *
         * @returns {boolean} Whether the transition should be ignored.
         */
        ignored: function() {
          return (toState === fromState && !options.reload);
        },
        run: function() {
          calculateTreeChanges();
          var pathContext = new ResolveContext(toPath);
          return toPath.resolve(pathContext, { policy: "eager" })
            .then( buildTransitionSteps );
        },
        begin: function(compare, exec) {
          if (!compare()) return this.SUPERSEDED;
          if (!exec()) return this.ABORTED;
          if (!compare()) return this.SUPERSEDED;
          return true;
        },

        end: function() {
          from = { state: toState, params: toParams };
          to   = { state: null, params: null };
          // Save the Path which contains the Resolvables data
          paths.from = toPath;
        }
      });
    }

    Transition.prototype.SUPERSEDED = 2;
    Transition.prototype.ABORTED    = 3;
    Transition.prototype.INVALID    = 4;


    $transition.init = function init(state, params, matcher) {
      _fromPath = new Path(state.path);
      from = { state: state, params: params };
      to = { state: null, params: null };
      stateMatcher = matcher;
    };

    $transition.start = function start(state, params, options) {
      to = { state: state, params: params || {} };
      return new Transition(from.state, from.params, state, params || {}, options || {});
    };

    $transition.isActive = function isActive() {
      return !!to.state && !!from.state;
    };

    $transition.isTransition = function isTransition(transition) {
      return transition instanceof Transition;
    };

    return $transition;
  }
}

angular.module('ui.router.state').provider('$transition', $TransitionProvider);