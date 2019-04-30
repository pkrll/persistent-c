'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.closeTypeDecls = closeTypeDecls;
var Type = exports.Type = function Type(kind, size) {
  this.kind = kind;
  this.size = size;
};

var functionType = exports.functionType = function functionType(resultType, paramDecls) {
  var type = new Type('function', 0);
  type.result = resultType;
  type.params = paramDecls; // [{name,type}]
  return type;
};

function getPointerSize(pointeeType) {
  if (pointeeType.kind === 'function') {
    return 2;
  }
  return 4;
}

var pointerType = exports.pointerType = function pointerType(pointeeType) {
  var pointerSize = getPointerSize(pointeeType);
  var type = new Type('pointer', pointerSize);
  type.pointee = pointeeType;
  return type;
};

var arrayType = exports.arrayType = function arrayType(elemType, elemCount) {
  var type = new Type('array', elemCount && elemType.size * elemCount.toInteger());
  type.elem = elemType;
  type.count = elemCount;
  type.composite = true;
  return type;
};

var decayedType = exports.decayedType = function decayedType(origType) {
  var pointerSize = getPointerSize(origType);
  var type = new Type('pointer', pointerSize);
  type.orig = origType;
  if (origType.kind === 'array') {
    // Decayed array type.
    type.pointee = origType.elem;
  } else {
    // Decayed function type.
    type.pointee = origType;
  }
  return type;
};

var recordType = exports.recordType = function recordType(name, fields) {
  var _layoutRecord = layoutRecord(fields),
      size = _layoutRecord.size,
      fieldMap = _layoutRecord.fieldMap;

  var type = new Type('record', size);
  type.name = name;
  type.fields = fields.map(function (field) {
    return field.name;
  });
  type.fieldMap = fieldMap;
  type.composite = true;
  return type;
};

var forwardRecordType = exports.forwardRecordType = function forwardRecordType(name) {
  var type = new Type('record', 0);
  type.name = name;
  type.forward = true;
  return type;
};

var builtinTypes = exports.builtinTypes = {};
var addBuiltinType = function addBuiltinType(repr, size) {
  var type = new Type('builtin', size);
  type.repr = repr;
  builtinTypes[repr] = type;
};
addBuiltinType('void', 0);
addBuiltinType('char', 1);
addBuiltinType('unsigned char', 1);
addBuiltinType('short', 2);
addBuiltinType('unsigned short', 2);
addBuiltinType('int', 4);
addBuiltinType('unsigned int', 4);
addBuiltinType('long', 4);
addBuiltinType('unsigned long', 4);
addBuiltinType('long long', 8);
addBuiltinType('unsigned long long', 8);
addBuiltinType('float', 4);
addBuiltinType('double', 8);

var lubType = exports.lubType = function lubType(t1, t2) {
  // This function should compute least-upper-bound of (t1, t2), but it is
  // probably actually always used with t1 == t2.
  return t1;
};

function layoutRecord(fields) {
  var size = 0;
  var fieldMap = {};
  fields.forEach(function (field) {
    var name = field.name,
        type = field.type;

    fieldMap[name] = { offset: size, type: type };
    size += type.size;
  });
  return { size: size, fieldMap: fieldMap };
}

function closeTypeDecls(core) {
  var recordDecls = core.recordDecls;

  console.log('closing', recordDecls);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = recordDecls.keys()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var recordName = _step.value;

      var _recordDecls$get = recordDecls.get(recordName),
          fields = _recordDecls$get.fields,
          fieldMap = _recordDecls$get.fieldMap;

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = fields[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var fieldName = _step2.value;

          var type = fieldMap[fieldName].type;
          if (type.forward && type.kind === 'record') {
            Object.assign(type, recordDecls.get(type.name));
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
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