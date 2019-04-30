'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.finalizeVarDecl = undefined;

var _type = require('./type');

var _value = require('./value');

var _memory = require('./memory');

var finalizeVarDecl = exports.finalizeVarDecl = function finalizeVarDecl(core, type, init) {
  if (init && type.kind === 'array') {
    /* Resolve array dimensions using the initialization list. */
    var dims = arraySize(init);
    type = resolveIncompleteArrayType(type, dims);
  }
  return { type: type, init: buildInitValue(core, type, init) };
};

function resolveIncompleteArrayType(type, dims) {
  function resolve(type, rank) {
    if (rank === dims.length) {
      return type;
    } else {
      var elemType = resolve(type.elem, rank + 1);
      var elemCount = new _value.IntegralValue(_type.builtinTypes['unsigned int'], type.count || dims[rank]);
      return (0, _type.arrayType)(elemType, elemCount);
    }
  }
  return resolve(type, 0);
}

function arraySize(init) {
  var result = [];
  while (Array.isArray(init)) {
    result.push(init.length);
    init = init[0];
  }
  return result;
}

function buildInitValue(core, type, init) {
  if (type.kind === 'array') {
    return buildArrayInitValue(core, type, init);
  }
  if (type.kind === 'record') {
    return buildRecordInitValue(core, type, init);
  }
  return init || (0, _value.zeroAtType)(type);
}

function buildArrayInitValue(core, type, init) {
  var elements = [];
  var elemCount = type.count.toInteger();
  if (init === null) {
    /* Uninitialized array */
  } else if (Array.isArray(init)) {
    for (var i = 0; i < elemCount; i += 1) {
      elements.push(buildInitValue(core, type.elem, init && init[i]));
    }
  } else if (init instanceof _value.PointerValue) {
    /* Initialization from pointer value (string literal) */
    var refType = (0, _type.pointerType)(type.elem);
    var ref = new _value.PointerValue(refType, init.address);
    /* init is a PointerValue with a definite-sized array type */
    var count = Math.min(elemCount, init.type.size);
    for (var _i = 0; _i < count; _i += 1) {
      elements.push((0, _memory.readValue)(core, ref));
      ref.address += type.elem.size;
    }
  } else {
    console.warn("unsupported array init", init);
  }
  return new _value.ArrayValue(type, elements);
}

function buildRecordInitValue(core, type, init) {
  var fields = type.fields,
      fieldMap = type.fieldMap;

  var props = {};
  var fieldCount = fields.length;
  for (var fieldPos = 0; fieldPos < fieldCount; fieldPos += 1) {
    var fieldInit = init && init[fieldPos];
    if (fieldInit) {
      var name = fields[fieldPos];
      var fieldType = fieldMap[name].type;

      props[name] = buildInitValue(core, fieldType, fieldInit);
    }
  }
  return new _value.RecordValue(type, props);
}