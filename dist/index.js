'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.notInNestedCall = exports.intoNextExpr = exports.intoNextStmt = exports.outOfCurrentStmt = exports.forEachNode = exports.clearMemoryLog = exports.nullPointer = exports.voidPtr = exports.effects = exports.findClosestFunctionScope = exports.step = exports.readString = exports.writeValue = exports.readValue = exports.makeRef = exports.ArrayValue = exports.stringValue = exports.PointerValue = exports.FloatingValue = exports.IntegralValue = exports.builtinTypes = exports.decayedType = exports.arrayType = exports.pointerType = exports.functionType = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _type = require('./type');

Object.defineProperty(exports, 'functionType', {
  enumerable: true,
  get: function get() {
    return _type.functionType;
  }
});
Object.defineProperty(exports, 'pointerType', {
  enumerable: true,
  get: function get() {
    return _type.pointerType;
  }
});
Object.defineProperty(exports, 'arrayType', {
  enumerable: true,
  get: function get() {
    return _type.arrayType;
  }
});
Object.defineProperty(exports, 'decayedType', {
  enumerable: true,
  get: function get() {
    return _type.decayedType;
  }
});
Object.defineProperty(exports, 'builtinTypes', {
  enumerable: true,
  get: function get() {
    return _type.builtinTypes;
  }
});

var _value = require('./value');

Object.defineProperty(exports, 'IntegralValue', {
  enumerable: true,
  get: function get() {
    return _value.IntegralValue;
  }
});
Object.defineProperty(exports, 'FloatingValue', {
  enumerable: true,
  get: function get() {
    return _value.FloatingValue;
  }
});
Object.defineProperty(exports, 'PointerValue', {
  enumerable: true,
  get: function get() {
    return _value.PointerValue;
  }
});
Object.defineProperty(exports, 'stringValue', {
  enumerable: true,
  get: function get() {
    return _value.stringValue;
  }
});
Object.defineProperty(exports, 'ArrayValue', {
  enumerable: true,
  get: function get() {
    return _value.ArrayValue;
  }
});
Object.defineProperty(exports, 'makeRef', {
  enumerable: true,
  get: function get() {
    return _value.makeRef;
  }
});

var _memory = require('./memory');

Object.defineProperty(exports, 'readValue', {
  enumerable: true,
  get: function get() {
    return _memory.readValue;
  }
});
Object.defineProperty(exports, 'writeValue', {
  enumerable: true,
  get: function get() {
    return _memory.writeValue;
  }
});
Object.defineProperty(exports, 'readString', {
  enumerable: true,
  get: function get() {
    return _memory.readString;
  }
});

var _step2 = require('./step');

Object.defineProperty(exports, 'step', {
  enumerable: true,
  get: function get() {
    return _step2.step;
  }
});

var _scope = require('./scope');

Object.defineProperty(exports, 'findClosestFunctionScope', {
  enumerable: true,
  get: function get() {
    return _scope.findClosestFunctionScope;
  }
});

var _effects2 = require('./effects');

Object.defineProperty(exports, 'effects', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_effects2).default;
  }
});
exports.makeCore = makeCore;
exports.execDecls = execDecls;
exports.setupCall = setupCall;

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _effects3 = _interopRequireDefault(_effects2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /*
                                                                                                                                                                                                    
                                                                                                                                                                                                    core: {
                                                                                                                                                                                                      globalMap,
                                                                                                                                                                                                      recordDecls,
                                                                                                                                                                                                      functions,
                                                                                                                                                                                                      memory,
                                                                                                                                                                                                      memoryLog,
                                                                                                                                                                                                      heapStart,
                                                                                                                                                                                                      scope,
                                                                                                                                                                                                      control,
                                                                                                                                                                                                      result,
                                                                                                                                                                                                      direction
                                                                                                                                                                                                    }
                                                                                                                                                                                                    
                                                                                                                                                                                                    */

var voidPtr = exports.voidPtr = (0, _type.pointerType)(_type.builtinTypes['void']);
var nullPointer = exports.nullPointer = new _value.PointerValue(voidPtr, 0);

function makeCore(memorySize) {
  if (memorySize === undefined) {
    memorySize = 0x10000;
  }
  var globalMap = {};
  var recordDecls = new Map();
  var functions = [null];
  var memory = (0, _memory.allocate)(memorySize);
  var memoryLog = _immutable2.default.List();
  var heapStart = 0x100;
  var scope = { key: 0, limit: memorySize };
  var literals = new WeakMap();
  return { globalMap: globalMap, recordDecls: recordDecls, functions: functions, memory: memory, memoryLog: memoryLog, heapStart: heapStart, scope: scope, literals: literals };
};

function execDecls(core, decls) {
  decls.forEach(function (declNode) {
    copyNodeStrings(core, declNode);
    stepThroughNode(core, declNode, declHandlers);
  });
  (0, _type.closeTypeDecls)(core);
};
var stepThroughNode = function stepThroughNode(core, node, handlers) {
  core.control = { node: node, step: 0 };
  while (core.control) {
    var _effects = (0, _step2.step)(core);
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _effects[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var effect = _step.value;

        var name = effect[0];
        if (!(name in handlers)) {
          throw new Error('unhandled core effect ' + name);
        }
        handlers[name].apply(handlers, [core].concat(_toConsumableArray(effect.slice(1))));
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }
  return core.result;
};

var declHandlers = {
  control: _effects3.default.doControl,
  result: _effects3.default.doResult,
  vardecl: _effects3.default.declareGlobalVar,
  recdecl: _effects3.default.declareRecord,
  fundecl: _effects3.default.declareFunction
};

function setupCall(core, name) {
  core.control = {
    node: ['CallExpr', {}, [['DeclRefExpr', {}, [['Name', { identifier: name }, []]]]]],
    step: 0,
    cont: null
  };
}

function copyNodeStrings(core, node) {
  /* Copy string literals to memory. */
  forEachNode(node, function (node) {
    if (node[0] === 'StringLiteral') {
      var value = (0, _value.stringValue)(node[1].value);
      var ref = new _value.PointerValue(value.type, core.heapStart);
      core.memory = (0, _memory.writeValue)(core.memory, ref, value);
      core.heapStart += value.type.size;
      core.literals.set(node, ref);
    }
  });
}

var clearMemoryLog = exports.clearMemoryLog = function clearMemoryLog(core) {
  return _extends({}, core, { memoryLog: _immutable2.default.List() });
};

var forEachNode = exports.forEachNode = function forEachNode(node, callback) {
  var queue = [[node]];
  while (queue.length !== 0) {
    queue.pop().forEach(function (node) {
      callback(node);
      if (node[2].length !== 0) {
        queue.push(node[2]);
      }
    });
  }
};

var outOfCurrentStmt = exports.outOfCurrentStmt = function outOfCurrentStmt(core) {
  return (/down|out/.test(core.direction) && core.control.seq === 'stmt'
  );
};

var intoNextStmt = exports.intoNextStmt = function intoNextStmt(core) {
  return !/^(CompoundStmt|IfStmt|WhileStmt|DoStmt|ForStmt)$/.test(core.control.node[0]);
};

var intoNextExpr = exports.intoNextExpr = function intoNextExpr(core) {
  return (/down|out/.test(core.direction) && core.control.seq
  );
};

var notInNestedCall = exports.notInNestedCall = function notInNestedCall(scope, refScope) {
  while (scope.key >= refScope.key) {
    if (scope.kind === 'function') {
      return false;
    }
    scope = scope.parent;
  }
  return true;
};