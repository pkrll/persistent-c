'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var findClosestBlockScope = exports.findClosestBlockScope = function findClosestBlockScope(scope, node) {
  while (scope && scope.blockNode !== node) {
    scope = scope.parent;
  }
  return scope;
};

var findClosestFunctionScope = exports.findClosestFunctionScope = function findClosestFunctionScope(scope) {
  while (scope && scope.kind !== 'function') {
    scope = scope.parent;
  }
  return scope;
};

var findLocalDeclaration = exports.findLocalDeclaration = function findLocalDeclaration(scope, name) {
  while (scope) {
    if (scope.kind === 'function') {
      // Prevent searching outside of the function's scope.
      break;
    }
    if (scope.kind === 'variable' && scope.name === name) {
      // Return the PointerValue to the variable's memory location
      // (in the case of functions and builtins, the value itself is used
      //  as the reference).
      return scope.ref;
    }
    scope = scope.parent;
  }
  return undefined;
};