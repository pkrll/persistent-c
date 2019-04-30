'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _memory = require('./memory');

var _type = require('./type');

var _value = require('./value');

var _scope = require('./scope');

exports.default = {
  /* These effects only mutate 'core'. */
  doControl: doControl,
  doResult: doResult,
  doLoad: doLoad,
  doStore: doStore,
  doEnter: doEnter,
  doLeave: doLeave,
  doCall: doCall,
  doReturn: doReturn,
  doVardecl: doVardecl,
  /* The 'declare' effects also mutate these elements of 'core':
     globalMap, recordDecls, functions
  */
  declareGlobalVar: declareGlobalVar,
  declareRecord: declareRecord,
  declareFunction: declareFunction
};


function doControl(core, control) {
  core.control = control;
  core.direction = 'down';
  core.result = undefined;
};

function doResult(core, result) {
  core.direction = 'up';
  core.result = result;
};

function doLoad(core, ref) {
  core.memoryLog = core.memoryLog.push(['load', ref]);
};

function doStore(core, ref, value) {
  core.memory = (0, _memory.writeValue)(core.memory, ref, value);
  core.memoryLog = core.memoryLog.push(['store', ref, value]);
};

function doEnter(core, blockNode) {
  var parentScope = core.scope;
  core.scope = {
    parent: parentScope,
    key: parentScope.key + 1,
    limit: parentScope.limit,
    kind: 'block',
    blockNode: blockNode
  };
};

function doLeave(core, blockNode) {
  var scope = (0, _scope.findClosestBlockScope)(core.scope, blockNode);
  if (!scope) {
    console.log('stack underflow', core.scope, blockNode);
    throw new Error('stack underflow');
  }
  core.scope = scope.parent;
};

function doCall(core, cont, values) {
  /* values is [func, args...] */
  var parentScope = core.scope;
  core.scope = {
    parent: parentScope,
    key: parentScope.key + 1,
    limit: parentScope.limit,
    kind: 'function',
    cont: cont,
    values: values
  };
};

function doReturn(core, result) {
  var scope = (0, _scope.findClosestFunctionScope)(core.scope);
  if (!scope) {
    console.log('stack underflow', core.scope, result);
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
    core.result = new _value.IntegralValue(_type.builtinTypes['int'], 0);
  } else {
    core.result = result;
  }
  // Set direction to 'out' to indicate that a function was exited.
  core.direction = 'out';
};

function doVardecl(core, name, type, init) {
  var parentScope = core.scope;
  var refType = (0, _type.pointerType)(type);
  var limit = parentScope.limit;
  var ref = void 0,
      doInit = !!init;
  if (doInit) {
    if (type.kind === 'array' && init.type.kind === 'pointer') {
      // When an array variable is initialized with a ref (as opposed to an
      // array value), no stack allocation or initialization occurs.
      ref = new _value.PointerValue(refType, init.address);
      doInit = false;
    }
  }
  if (!ref) {
    // Allocate memory on stack and build a ref to that location.
    limit -= type.size;
    ref = new _value.PointerValue(refType, limit);
  }
  core.scope = {
    parent: parentScope,
    key: parentScope.key + 1,
    limit: limit,
    kind: 'variable',
    name: name, type: type, ref: ref
  };
  if (doInit) {
    doStore(core, ref, init);
  }
};

function declareGlobalVar(core, name, type, init) {
  var address = core.heapStart;
  core.heapStart += type.size; // XXX add alignment padding
  var ref = new _value.PointerValue((0, _type.pointerType)(type), address);
  core.memory = (0, _memory.writeValue)(core.memory, ref, init);
  core.globalMap[name] = ref;
};

function declareRecord(core, name, type) {
  core.recordDecls.set(name, type);
};

/* XXX check if decl can be omitted, it is only used because directives are
   lifted from the function body-block into the fundecl node "to allow
   directives to inspect arguments". */
function declareFunction(core, name, type, body, decl) {
  var codePtr = core.functions.length;
  var value = void 0;
  if (body) {
    value = new _value.FunctionValue(type, codePtr, name, body, decl);
  } else {
    value = new _value.BuiltinValue(type, codePtr, name);
  }
  core.functions.push(value);
  core.globalMap[name] = value;
};