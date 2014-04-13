// AUTOGENERATED FILE - DO NOT EDIT!
// django-angular - v0.7.0 - 2014-04-13
// https://github.com/jrief/django-angular
// Copyright (c) 2014 Jacob Rief; Licensed MIT
(function (angular, undefined) {
  'use strict';
  // module: ng.django.forms
  // Correct Angular's form.FormController behavior after rendering bound forms.
  // Additional validators for form elements.
  var djng_forms = angular.module('ng.django.forms', []);
  // This directive overrides some of the internal behavior on forms if used together with AngularJS.
  // If not used, the content of bound forms is not displayed, because AngularJS does not know about
  // the concept of bound forms.
  djng_forms.directive('form', function () {
    return {
      restrict: 'E',
      scope: 'isolate',
      priority: -1,
      link: function (scope, element, attrs) {
        var form = scope[attrs.name];
        var fields = angular.element(element).find('input');
        angular.forEach(fields, function (field) {
          if (form[field.name] !== undefined) {
            // restore the field's content from the rendered content of bound fields
            form[field.name].$setViewValue(field.defaultValue);
          }
        });
        // restore the form's pristine state
        form.$setPristine();
      }
    };
  });
  // This directive can be added to an input field which shall validate inserted dates, for example:
  // <input ng-model="a_date" type="text" validate-date="^(\d{4})-(\d{1,2})-(\d{1,2})$" />
  // Now, such an input field is only considered valid, if the date is a valid date and if it matches
  // against the given regular expression.
  djng_forms.directive('validateDate', function () {
    var validDatePattern = null;
    function validateDate(date) {
      var matched, dateobj;
      if (!date)
        // empty field are validated by the "required" validator
        return true;
      dateobj = new Date(date);
      if (isNaN(dateobj))
        return false;
      if (validDatePattern) {
        matched = validDatePattern.exec(date);
        return matched && parseInt(matched[2]) === dateobj.getMonth() + 1;
      }
      return true;
    }
    return {
      require: 'ngModel',
      restrict: 'A',
      link: function (scope, elem, attrs, controller) {
        if (attrs.validateDate) {
          // if a pattern is set, only valid dates with that pattern are accepted
          validDatePattern = new RegExp(attrs.validateDate, 'g');
        }
        // watch for modifications on input fields containing attribute 'validate-date="/pattern/"'
        scope.$watch(attrs.ngModel, function (date) {
          if (controller.$pristine)
            return;
          controller.$setValidity('date', validateDate(date));
        });
      }
    };
  });
  // If forms are validated using Ajax, the server shall return a dictionary of detected errors to the
  // client code. The success-handler of this Ajax call, now can set those error messages on their
  // prepared list-items. The simplest way, is to add this code snippet into the controllers function
  // which is responsible for submitting form data using Ajax:
  //  $http.post("/path/to/url", $scope.data).success(function(data) {
  //      djangoForm.setErrors($scope.form, data.errors);
  //  });
  // djangoForm.setErrors returns false, if no errors have been transferred.
  djng_forms.factory('djangoForm', function () {
    var NON_FIELD_ERRORS = '__all__';
    function isNotEmpty(obj) {
      for (var p in obj) {
        if (obj.hasOwnProperty(p))
          return true;
      }
      return false;
    }
    return {
      setErrors: function (form, errors) {
        // remove errors from this form, which may have been rejected by an earlier validation
        form.$message = '';
        if (form.$error.hasOwnProperty('rejected')) {
          angular.forEach(form.$error.rejected, function (rejected) {
            var field, key = rejected.$name;
            if (form.hasOwnProperty(key)) {
              field = form[key];
              field.$message = '';
              field.$setValidity('rejected', true);
              if (field.rejectedListenerPos !== undefined) {
                field.$viewChangeListeners.splice(field.rejectedListenerPos, 1);
                delete field.rejectedListenerPos;
              }
            }
          });
        }
        // add the new upstream errors
        angular.forEach(errors, function (errors, key) {
          var field;
          if (errors.length > 0) {
            if (key === NON_FIELD_ERRORS) {
              form.$message = errors[0];
              form.$setPristine();
            } else if (form.hasOwnProperty(key)) {
              field = form[key];
              field.$message = errors[0];
              field.$setValidity('rejected', false);
              field.$setPristine();
              field.rejectedListenerPos = field.$viewChangeListeners.push(function () {
                // changing the field the server complained about, resets the form into valid state
                field.$setValidity('rejected', true);
                field.$viewChangeListeners.splice(field.rejectedListenerPos, 1);
                delete field.rejectedListenerPos;
              }) - 1;
            }
          }
        });
        return isNotEmpty(errors);
      }
    };
  });
  // A simple wrapper to extend the $httpProvider for executing remote methods on the server side
  // for Django Views derived from JSONResponseMixin.
  // It can be used to invoke GET and POST request. The return value is the same promise as returned
  // by $http.get() and $http.post().
  // Usage:
  // djangoRMI.name.method(data).success(...).error(...)
  // @param data (optional): If set and @allowd_action was auto, then the call is performed as method
  //     POST. If data is unset, method GET is used. data must be a valid JavaScript object or undefined.
  djng_forms.provider('djangoRMI', function () {
    var remote_methods, http;
    this.configure = function (conf) {
      remote_methods = conf;
      convert_configuration(remote_methods);
    };
    function convert_configuration(obj) {
      angular.forEach(obj, function (val, key) {
        if (!angular.isObject(val))
          throw new Error('djangoRMI.configure got invalid data');
        if (val.hasOwnProperty('url')) {
          // convert config object into function
          val.headers['X-Requested-With'] = 'XMLHttpRequest';
          obj[key] = function (data) {
            var config = angular.copy(val);
            if (config.method === 'auto') {
              if (data === undefined) {
                config.method = 'GET';
              } else {
                config.method = 'POST';
                config.data = data;
              }
            } else if (config.method === 'POST') {
              if (data === undefined)
                throw new Error('Calling remote method ' + key + ' without data object');
              config.data = data;
            }
            return http(config);
          };
        } else {
          // continue to examine the values recursively
          convert_configuration(val);
        }
      });
    }
    this.$get = [
      '$http',
      function ($http) {
        http = $http;
        return remote_methods;
      }
    ];
  });
}(window.angular));
(function (angular, undefined) {
  'use strict';
  function noop() {
  }
  // Add three-way data-binding for AngularJS with Django using websockets.
  angular.module('ng.django.websocket', []).provider('djangoWebsocket', function () {
    var _console = {
        log: noop,
        warn: noop,
        error: noop
      };
    var websocket_uri, heartbeat_msg = null;
    // Set prefix for the Websocket's URI.
    // This URI must be set during initialization using
    // djangoWebsocketProvider.setURI('{{ WEBSOCKET_URI }}');
    this.setURI = function (uri) {
      websocket_uri = uri;
      return this;
    };
    // Set the heartbeat message and activate the heartbeat interval to 5 seconds.
    // The heartbeat message shall be configured using
    // djangoWebsocketProvider.setHeartbeat({{ WS4REDIS_HEARTBEAT }});  // unquoted!
    // The default behavior is to not listen on heartbeats.
    this.setHeartbeat = function (msg) {
      heartbeat_msg = msg;
      return this;
    };
    this.setLogLevel = function (logLevel) {
      switch (logLevel) {
      case 'debug':
        _console = console;
        break;
      case 'log':
        _console.log = console.log;
      /* falls through */
      case 'warn':
        _console.warn = console.warn;
      /* falls through */
      case 'error':
        _console.error = console.error;
      /* falls through */
      default:
        break;
      }
      return this;
    };
    this.$get = [
      '$q',
      '$timeout',
      '$interval',
      function ($q, $timeout, $interval) {
        var ws, deferred, timer_promise = null, wait_for = null, scope, collection;
        var is_subscriber = false, is_publisher = false;
        var heartbeat_promise = null, missed_heartbeats = 0;
        function connect(uri) {
          try {
            _console.log('Connecting to ' + uri);
            deferred = $q.defer();
            ws = new WebSocket(uri);
            ws.onopen = onOpen;
            ws.onmessage = onMessage;
            ws.onerror = onError;
            ws.onclose = onClose;
            timer_promise = null;
          } catch (err) {
            deferred.reject(new Error(err));
          }
        }
        function onOpen(evt) {
          _console.log('Connected');
          wait_for = 500;
          deferred.resolve();
          if (heartbeat_msg && heartbeat_promise === null) {
            missed_heartbeats = 0;
            heartbeat_promise = $interval(sendHeartbeat, 5000);
          }
        }
        function onClose(evt) {
          _console.log('Connection closed');
          if (!timer_promise && wait_for) {
            timer_promise = $timeout(function () {
              connect(ws.url);
            }, wait_for);
            wait_for = Math.min(wait_for + 500, 5000);
          }
        }
        function onError(evt) {
          _console.error('Websocket connection is broken!');
          deferred.reject(new Error(evt));
        }
        function onMessage(evt) {
          if (evt.data === heartbeat_msg) {
            // reset the counter for missed heartbeats
            missed_heartbeats = 0;
            return;
          }
          try {
            var server_data = JSON.parse(evt.data);
            if (is_subscriber) {
              scope.$apply(function () {
                angular.extend(scope[collection], server_data);
              });
            }
          } catch (e) {
            _console.warn('Data received by server is invalid JSON: ' + evt.data);
          }
        }
        function sendHeartbeat() {
          try {
            missed_heartbeats++;
            if (missed_heartbeats > 3)
              throw new Error('Too many missed heartbeats.');
            ws.send(heartbeat_msg);
          } catch (e) {
            $interval.cancel(heartbeat_promise);
            heartbeat_promise = null;
            _console.warn('Closing connection. Reason: ' + e.message);
            ws.close();
          }
        }
        function listener(newValue, oldValue) {
          if (newValue !== undefined) {
            ws.send(JSON.stringify(newValue));
          }
        }
        function setChannels(channels) {
          angular.forEach(channels, function (channel) {
            if (channel.substring(0, 9) === 'subscribe') {
              is_subscriber = true;
            } else if (channel.substring(0, 7) === 'publish') {
              is_publisher = true;
            }
          });
        }
        function watchCollection() {
          scope.$watchCollection(collection, listener);
        }
        function getWebsocketURL(facility, channels) {
          var parts = [
              websocket_uri,
              facility,
              '?'
            ];
          parts.push(channels.join('&'));
          return parts.join('');
        }
        return {
          connect: function ($scope, facility, channels, scope_obj) {
            scope = $scope;
            setChannels(channels);
            collection = scope_obj;
            scope[collection] = scope[collection] || {};
            connect(getWebsocketURL(facility, channels));
            if (is_publisher) {
              deferred.promise.then(watchCollection);
            }
            return deferred.promise;
          }
        };
      }
    ];
  });
}(window.angular));