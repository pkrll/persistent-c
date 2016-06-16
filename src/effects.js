
import {writeValue} from './memory';
import {scalarTypes, pointerType} from './type';
import {IntegralValue, PointerValue} from './value';
import {findClosestBlockScope, findClosestFunctionScope} from './scope';

const applyLoadEffect = function (state, effect) {
  // ['load', ref]
  const {core} = state;
  const ref = effect[1];
  core.memoryLog = core.memoryLog.push(effect);
};

const applyStoreEffect = function (state, effect) {
  // ['store', ref, value]
  const {core} = state;
  const ref = effect[1];
  const value = effect[2];
  core.memory = writeValue(core.memory, ref, value);
  core.memoryLog = core.memoryLog.push(effect);
};

const applyEnterEffect = function (state, effect) {
  // ['enter', blockNode]
  const {core} = state;
  const parentScope = core.scope;
  const blockNode = effect[1];
  core.scope = {
    parent: parentScope,
    key: parentScope.key + 1,
    limit: parentScope.limit,
    kind: 'block',
    blockNode
  }
};

const applyLeaveEffect = function (state, effect) {
  // ['leave', blockNode]
  const {core} = state;
  const scope = findClosestBlockScope(core.scope, effect[1]);
  if (!scope) {
    console.log('stack underflow', core.scope, effect);
    throw new Error('stack underflow');
  }
  core.scope = scope.parent;
};

const applyCallEffect = function (state, effect) {
  // ['call', cont, [func, args...]]
  const {core} = state;
  const parentScope = core.scope;
  const cont = effect[1];
  const values = effect[2];
  core.scope = {
    parent: parentScope,
    key: parentScope.key + 1,
    limit: parentScope.limit,
    kind: 'function',
    cont,
    values
  };
};

const applyReturnEffect = function (state, effect) {
  // ['return', result]
  const {core} = state;
  const result = effect[1];
  const scope = findClosestFunctionScope(core.scope);
  if (!scope) {
    console.log('stack underflow', core.scope, effect);
    throw new Error('stack underflow');
  }
  // Pop all scopes up to and including the function's scope.
  core.scope = scope.parent;
  // Transfer control to the caller's continuation…
  core.control = scope.cont;
  // passing the return value to the caller (handling the special case for
  // control leaving the 'main' function without a return statement, where
  // C99 defines the result as being 0).
  if (!result && scope.cont.values[0].name === 'main') {
    core.result = new IntegralValue(scalarTypes['int'], 0);
  } else {
    core.result = result;
  }
  // Set direction to 'out' to indicate that a function was exited.
  core.direction = 'out';
};

const applyVardeclEffect = function (state, effect) {
  // ['vardecl', name, type, init]
  const {core} = state;
  const parentScope = core.scope;
  const name = effect[1];
  const type = effect[2];
  const init = effect[3];
  const address = parentScope.limit - type.size;
  const ref = new PointerValue(pointerType(type), address);
  core.scope = {
    parent: parentScope,
    key: parentScope.key + 1,
    limit: address,
    kind: 'variable',
    name, type, ref
  };
  if (init) {
    applyStoreEffect(state, ['store', ref, init]);
  }
};

export const defaultEffects = {
  load: applyLoadEffect,
  store: applyStoreEffect,
  enter: applyEnterEffect,
  leave: applyLeaveEffect,
  call: applyCallEffect,
  return: applyReturnEffect,
  vardecl: applyVardeclEffect
};

// applyEffect applies an effect by shallowly mutating the passed state.
export const applyEffect = function (state, effect, options) {
  const {effectHandlers} = options;
  const handler = effectHandlers[effect[0]];
  if (typeof handler === 'function') {
    return handler(state, effect);
  } else {
    console.log('invalid handler', effect[0])
    return state;
  }
};
