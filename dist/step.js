'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.step = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /*
                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                  Sequence points are marked in reduction steps by returning an object
                                                                                                                                                                                                                                                                  with the seq property set to true.  In C, sequence points occur:
                                                                                                                                                                                                                                                                    - after evaluating the left operand of '&&', '||', ','
                                                                                                                                                                                                                                                                    - after evaluating cond in (cond '?' ift ':' iff)
                                                                                                                                                                                                                                                                    - at the end a full expression, that is:
                                                                                                                                                                                                                                                                      - after evaluating each compound statement
                                                                                                                                                                                                                                                                      - after a return statement
                                                                                                                                                                                                                                                                      - controlling expressions of if, switch, while, do/while, for
                                                                                                                                                                                                                                                                      - before entering a function in a call
                                                                                                                                                                                                                                                                      - after each initializer
                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                  */

var _type2 = require('./type');

var _value = require('./value');

var _scope = require('./scope');

var _memory = require('./memory');

var _decl = require('./decl');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var one = new _value.IntegralValue(_type2.builtinTypes['int'], 1);

var findDeclaration = function findDeclaration(core, name) {
  return (0, _scope.findLocalDeclaration)(core.scope, name) || core.globalMap[name];
};

var enter = function enter(node, cont, attrs) {
  return _extends({ node: node, step: 0, cont: cont }, attrs);
};

var enterExpr = function enterExpr(node, cont, attrs) {
  return _extends({ node: node, step: 0, cont: cont, seq: 'expr' }, attrs);
};

var enterStmt = function enterStmt(node, cont, attrs) {
  return _extends({ node: node, step: 0, cont: cont, seq: 'stmt' }, attrs);
};

var stepCompoundStmt = function stepCompoundStmt(core, control) {
  var node = control.node,
      step = control.step;

  var effects = [];

  // Set up a frame for the block's declarations when entering the block.
  if (step === 0) {
    effects.push(['enter', node]);
  }

  // When falling through the end of the block, issue a 'leave' effect to
  // clean up the block's scope.
  if (step >= node[2].length) {
    effects.push(['leave', node]);
    return { result: null, control: control.cont, effects: effects };
  }

  // Set up a continuation and pass control to the next child.
  var cont = _extends({}, control, { step: step + 1 });

  return { control: enterStmt(node[2][step], cont), effects: effects };
};

var stepDeclStmt = function stepDeclStmt(core, control) {
  var node = control.node,
      step = control.step;

  if (step < node[2].length) {
    // Pass control to the next child, setting up the continuation
    // for the next step.
    return {
      control: enter(node[2][step], _extends({}, control, { step: step + 1 }))
    };
  }
  // No next child: return void and pass control to the continuation.
  return { control: control.cont, result: null };
};

var stepParenExpr = function stepParenExpr(core, control) {
  if (control.step === 0) {
    // ParenExpr is transparent w.r.t. the evaluation mode (value/lvalue/type).
    return {
      control: enter(control.node[2][0], _extends({}, control, { step: 1 }), { mode: control.mode })
    };
  } else {
    var result = core.result;
    return { control: control.cont, result: result };
  }
};

var stepForStmt = function stepForStmt(core, control) {
  /* [init, cond, inc, body] */
  var node = control.node,
      step = control.step;

  var forceCond = false;
  var _node$ = node[1],
      noInit = _node$.noInit,
      noInc = _node$.noInc,
      noCond = _node$.noCond;

  if (step === 0) {
    if (noInit) {
      // skip to cond
      step = 1;
    } else {
      // enter init, continue w/ cond
      return { control: enterStmt(node[2][0], _extends({}, control, { step: 1 })) };
    }
  }
  if (step === 2) {
    if (noInc) {
      // skip to cond
      step = 1;
    } else {
      // enter inc, continue w/ cond
      return { control: enterStmt(node[2][2 - toInt(noInit) - toInt(noInc)], _extends({}, control, { step: 1 })) };
    }
  }
  if (step === 1) {
    if (noCond) {
      // skip to body
      step = 3;
      forceCond = true;
    } else {
      // enter cond, continue w/ step 3
      return { control: enterStmt(node[2][1 - toInt(noInit)], _extends({}, control, { step: 3 })) };
    }
  }
  if (step === 3) {
    // result ? (enter body, continue w/ step 2) : leave
    if (forceCond || core.result.toBool()) {
      return { control: enterStmt(node[2][3 - toInt(noInit) - toInt(noInc) - toInt(noCond)], _extends({}, control, { step: 2, break: 4 })) };
    }
  }
  return { control: control.cont, result: null };
};
function toInt(p) {
  return p ? 1 : 0;
}

var stepWhileStmt = function stepWhileStmt(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    // enter cond, continue w/ step 1
    return { control: enterStmt(node[2][0], _extends({}, control, { step: 1 })) };
  }
  if (step === 1) {
    // result ? (enter body, continue w/ step 0) : leave
    if (core.result.toBool()) {
      return { control: enterStmt(node[2][1], _extends({}, control, { step: 0, break: 2 })) };
    }
  }
  return { control: control.cont, result: null };
};

var stepDoStmt = function stepDoStmt(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    // enter body, continue w/ step 1
    return { control: enterStmt(node[2][0], _extends({}, control, { step: 1 })) };
  }
  if (step === 1) {
    // enter cond, continue w/ step 2
    return { control: enterStmt(node[2][1], _extends({}, control, { step: 2 })) };
  }
  if (step === 2) {
    // result ? (enter body, continue w/ step 1) : leave
    if (core.result.toBool()) {
      var cont = _extends({}, control, { step: 1, break: 3 });
      return { control: enterStmt(node[2][0], cont) };
    }
  }
  return { control: control.cont, result: null };
};

var stepBreakStmt = function stepBreakStmt(core, control) {
  var cont = control;
  do {
    cont = cont.cont;
  } while (!('break' in cont));
  return { control: _extends({}, cont, { step: cont.break, seq: 'stmt' }), result: null };
};

var stepContinueStmt = function stepContinueStmt(core, control) {
  var cont = control;
  do {
    cont = cont.cont;
  } while (!('break' in cont));
  return { control: _extends({}, cont, { seq: 'stmt' }), result: null };
};

var stepIfStmt = function stepIfStmt(core, control) {
  var node = control.node,
      step = control.step;

  switch (step) {
    case 0:
      // No 'statement' boundary around the condition.
      return { control: enterExpr(node[2][0], _extends({}, control, { step: 1 })) };
    case 1:
      if (core.result.toBool()) {
        return { control: enterStmt(node[2][1], _extends({}, control, { step: 2 })) };
      } else {
        if (node[2].length === 3) return { control: enterStmt(node[2][2], _extends({}, control, { step: 2 })) };else return { control: control.cont, result: null };
      }
    case 2:
      return { control: control.cont, result: null };
  }
};

var stepReturnStmt = function stepReturnStmt(core, control) {
  var node = control.node,
      step = control.step;

  var exprNode = node[2][0];
  if (exprNode && step === 0) {
    // Evaluate the expression whose value to return.
    return { control: enterExpr(exprNode, _extends({}, control, { step: 1 })) };
  }
  var result = step === 0 ? null : core.result;
  var effects = [['return', result]];
  return { effects: effects };
};

var stepNullStmt = function stepNullStmt(core, control) {
  return { control: control.cont, result: null };
};

var stepCallExpr = function stepCallExpr(core, control) {
  var node = control.node,
      step = control.step;
  // Numeric steps accumulate the results of evaluating each child expression.

  var values = control.values;
  if (typeof step === 'number') {
    if (step === 0) {
      values = [];
    } else {
      values = values.slice();
      values.push(core.result);
    }
    if (step < node[2].length) {
      // Pass control to the next child, setting up the continuation
      // for the next step.
      return {
        control: enterExpr(node[2][step], _extends({}, control, { step: step + 1, values: values }))
      };
    }
    /* All arguments have been evaluated, perform the call. */
    var funcVal = values[0];
    /* Builtins are handled as an effect. */
    if (funcVal instanceof _value.BuiltinValue) {
      return {
        control: _extends({}, control, { step: 'R', seq: 'expr' }),
        effects: [['builtin', funcVal.name].concat(_toConsumableArray(values.slice(1)))]
      };
    }
    if (funcVal instanceof _value.FunctionValue) {
      /* The 'call' effect opens a function scope and stores in it the return
         continuation and the function call values. */
      var cont = _extends({}, control, { values: values, step: 'R' });
      var effects = [['call', cont, values]];
      var funcType = funcVal.type.pointee;
      var funcBody = funcVal.body;
      /* Emit a 'vardecl' effect for each function argument. */
      var params = funcType.params;
      for (var i = 0; i < params.length; i++) {
        var _params$i = params[i],
            name = _params$i.name,
            type = _params$i.type;

        var init = i + 1 >= values.length ? null : values[1 + i];
        effects.push(['vardecl', name, type, init]);
      }
      /* Transfer control to the function body (a compound statement). */
      return {
        control: enterStmt(funcBody, _extends({}, control, { step: 'r' })),
        effects: effects
      };
    }
    return { error: 'call error ' + funcVal };
  }
  if (step === 'r') {
    var _effects = [['return', null]];
    return { result: null, effects: _effects };
  }
  if (step === 'R') {
    /* The R step catches the callee's result and is only used as a stop to
       show the call's result while the function and arguments are still
       accessible (as control.values). */
    return {
      control: control.cont,
      result: core.result
    };
  }
};

var stepImplicitCastExpr = function stepImplicitCastExpr(core, control) {
  // An implicit cast (T)e has children [e, T] (reverse of explicit cast).
  // T is evaluated first (in normal mode) so that the evaluation of e can be
  // skipped if we are in type mode.
  var node = control.node,
      step = control.step;

  if (step === 0) {
    return {
      control: enter(node[2][1], _extends({}, control, { step: 1 }))
    };
  }
  if (control.mode === 'type') {
    return { control: control.cont, result: core.result };
  }
  if (step === 1) {
    // An implicit cast is transparent w.r.t. the value/lvalue mode.
    // XXX Does it really happen?
    return {
      control: enter(node[2][0], _extends({}, control, { step: 2, type: core.result }), { mode: control.mode })
    };
  }
  var type = control.type;
  var value = core.result;
  var result = (0, _value.evalCast)(type, value);
  return { control: control.cont, result: result };
};

var stepExplicitCastExpr = function stepExplicitCastExpr(core, control) {
  // An explicit cast (T)e has children [T, e] (reverse of implicit cast).
  var node = control.node,
      step = control.step;

  if (step === 0) {
    return {
      control: enter(node[2][0], _extends({}, control, { step: 1 }))
    };
  }
  if (control.mode === 'type') {
    return { control: control.cont, result: core.result };
  }
  if (step === 1) {
    return {
      control: enterExpr(node[2][1], _extends({}, control, { step: 2, type: core.result }))
    };
  }
  var type = control.type;
  var value = core.result;
  var result = (0, _value.evalCast)(type, value);
  return { control: control.cont, result: result };
};

var stepDeclRefExpr = function stepDeclRefExpr(core, control) {
  var nameNode = control.node[2][0];
  var name = nameNode[1].identifier;
  var ref = findDeclaration(core, name);
  var effects = [];
  var result = void 0;
  if (ref instanceof _value.PointerValue) {
    if (control.mode === 'type') {
      if (ref.type.kind === 'pointer') {
        result = ref.type.pointee;
      } else {
        result = ref.type;
      }
    } else if (control.mode === 'lvalue') {
      result = ref;
    } else {
      var varType = ref.type.pointee;
      if (varType.kind === 'array') {
        // A reference to an array evaluates to a pointer to the array's
        // first element.
        result = new _value.PointerValue((0, _type2.decayedType)(varType), ref.address);
      } else {
        result = (0, _memory.readValue)(core, ref);
        effects.push(['load', ref]);
      }
    }
  } else {
    // If findDeclaration returns a non-pointer value (typically a function or
    // a builtin), use the value directly.
    if (control.mode === 'type') {
      result = ref.type;
    } else {
      result = ref;
    }
  }
  return { control: control.cont, result: result, effects: effects };
};

var stepMemberExpr = function stepMemberExpr(core, control) {
  /* [Name, expr] */
  var isArrow = control.node[1].isArrow;
  if (control.step === 0) {
    // Evaluate the expression as lvalue (or type).
    var mode = control.mode === 'type' ? 'type' : isArrow ? 'value' : 'lvalue';
    return {
      control: enterExpr(control.node[2][1], _extends({}, control, { step: 1 }), { mode: mode })
    };
  } else {
    var nameNode = control.node[2][0];
    var identifier = nameNode[1].identifier;
    var result = void 0;
    if (control.mode === 'type') {
      var _recordType = core.result;
      var fieldDecl = _recordType.fieldMap[identifier];
      result = fieldDecl.type;
    } else {
      var ref = core.result; // pointer to record
      var _recordType2 = ref.type.pointee;
      var _fieldDecl = _recordType2.fieldMap[identifier];
      var fieldAddress = ref.address + _fieldDecl.offset;
      var fieldRef = new _value.PointerValue((0, _type2.pointerType)(_fieldDecl.type), fieldAddress);
      if (control.mode === 'lvalue' || _fieldDecl.type.composite) {
        result = fieldRef;
      } else {
        result = (0, _memory.readValue)(core, fieldRef);
      }
    }
    return { control: control.cont, result: result };
  }
};

var stepUnaryOperator = function stepUnaryOperator(core, control) {
  if (control.step === 0) {
    // Evaluate the operand.
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }))
    };
  } else {
    var value = core.result;
    var result = (0, _value.evalUnaryOperation)(control.node[1].opcode, value);
    return { control: control.cont, result: result };
  }
};

var stepAssignmentUnaryOperator = function stepAssignmentUnaryOperator(core, control) {
  if (control.step === 0) {
    // Evaluate the operand as a lvalue.
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }), { mode: 'lvalue' })
    };
  } else {
    var lvalue = core.result;
    var oldValue = (0, _memory.readValue)(core, lvalue);
    var opcode = control.node[1].opcode;
    var binOp = /Inc$/.test(opcode) ? 'Add' : 'Sub';
    var newValue = (0, _value.evalBinaryOperation)(binOp, oldValue, one);
    var result = /^Pre/.test(opcode) ? newValue : oldValue;
    return {
      control: control.cont,
      effects: [['load', lvalue], ['store', lvalue, newValue]],
      result: result
    };
  }
};

var stepAddrOf = function stepAddrOf(core, control) {
  if (control.step === 0) {
    // If in 'type' mode, evaluate operand in type mode.
    // Otherwise, switch to 'lvalue' mode.
    var mode = control.mode === 'type' ? 'type' : 'lvalue';
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }), { mode: mode })
    };
  } else {
    // If in 'type' mode, return a pointer-to-operand's type type.
    // Otherwise, the lvalue-result (a pointer value) is returned.
    var result = core.result;
    if (control.mode === 'type') {
      result = (0, _type2.pointerType)(result);
    }
    return { control: control.cont, result: result };
  }
};

var stepDeref = function stepDeref(core, control) {
  if (control.step === 0) {
    // Transition out of 'lvalue' mode.
    var mode = control.mode === 'lvalue' ? undefined : control.mode;
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }), { mode: mode })
    };
  } else {
    // Pass the result.
    if (control.mode === 'type') {
      // In type-mode (*a) evaluates to T if a has type T*.
      return { control: control.cont, result: core.result.pointee };
    }
    if (control.mode === 'lvalue') {
      // Dereferencing was performed by evaluating the operand in value mode.
      return { control: control.cont, result: core.result };
    }
    // Normal value-mode path.
    var lvalue = core.result;
    if (lvalue.type.pointee.kind === 'array') {
      // Rather than reading the array value, build a reference to its first
      // element (with the appropriate decayed type).
      var result = (0, _value.makeRef)(lvalue.type.pointee, lvalue.address);
      return { control: control.cont, result: result };
    } else {
      var _result = (0, _memory.readValue)(core, lvalue);
      var effects = [['load', lvalue]];
      return { control: control.cont, result: _result, effects: effects };
    }
  }
};

var stepUnaryExprOrTypeTraitExpr = function stepUnaryExprOrTypeTraitExpr(core, control) {
  // In C, this node kind is always sizeof.
  // TODO: include the type of the expression in the AST, so we can
  //       simply call sizeOfType.
  if (control.step === 0) {
    // Evaluate the operand in 'type' mode.
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }), { mode: 'type' })
    };
  }
  var type = core.result;
  var result = new _value.IntegralValue(_type2.builtinTypes['int'], type.size);
  return { control: control.cont, result: result };
};

var stepBinaryOperator = function stepBinaryOperator(core, control) {
  if (control.step === 0) {
    // Before LHS.
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }))
    };
  } else if (control.step === 1) {
    // After LHS, before RHS.
    var lhs = core.result;
    var opcode = control.node[1].opcode;
    // Short-circuit evaluation for logical operators.
    if (opcode === 'LAnd' && !lhs.toBool() || opcode === 'LOr' && lhs.toBool()) {
      return { control: control.cont, result: lhs };
    }
    return {
      control: enterExpr(control.node[2][1], _extends({}, control, { step: 2, lhs: lhs }))
    };
  } else {
    // After RHS.
    var rhs = core.result;
    var _opcode = control.node[1].opcode;
    var result = /^(Comma|LOr|LAnd)$/.test(_opcode) ? rhs : (0, _value.evalBinaryOperation)(_opcode, control.lhs, rhs);
    return { control: control.cont, result: result };
  }
};

var stepAssignmentOperator = function stepAssignmentOperator(core, control) {
  if (control.step === 0) {
    // Before LHS (as lvalue).
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }), { mode: 'lvalue' })
    };
  } else if (control.step === 1) {
    // After LHS, before RHS.
    var lvalue = core.result;
    return {
      control: enterExpr(control.node[2][1], _extends({}, control, { step: 2, lvalue: lvalue }))
    };
  } else {
    // After RHS.
    var _lvalue = control.lvalue;
    var result = core.result;

    var effects = [['store', _lvalue, result]];
    return { control: control.cont, result: result, effects: effects };
  }
};

var stepAssignmentBinaryOperator = function stepAssignmentBinaryOperator(core, control) {
  if (control.step === 0) {
    // Before LHS (as lvalue).
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }), { mode: 'lvalue' })
    };
  } else if (control.step === 1) {
    // After LHS, before RHS.
    var lvalue = core.result;
    var lhs = (0, _memory.readValue)(core, lvalue);
    return {
      control: enterExpr(control.node[2][1], _extends({}, control, { step: 2, lvalue: lvalue, lhs: lhs })),
      effects: [['load', lvalue]]
    };
  } else {
    // After RHS.
    var _lvalue2 = control.lvalue,
        _lhs = control.lhs;

    var rhs = core.result;
    var opcode = control.node[1].opcode.replace('Assign', '');
    var result = (0, _value.evalBinaryOperation)(opcode, _lhs, rhs);
    var effects = [['store', _lvalue2, result]];
    return { control: control.cont, result: result, effects: effects };
  }
};

var stepArraySubscriptExpr = function stepArraySubscriptExpr(core, control) {
  if (control.step === 0) {
    // Before array expr.
    return {
      control: enterExpr(control.node[2][0], _extends({}, control, { step: 1 }))
    };
  } else if (control.step === 1) {
    // After array expr, before subscript expr.
    var array = core.result;
    return {
      control: enterExpr(control.node[2][1], _extends({}, control, { step: 2, array: array }))
    };
  } else {
    // After subscript expr.
    var _array = control.array;

    var elemType = _array.type.pointee;
    var subscript = core.result;
    var address = _array.address + subscript.toInteger() * elemType.size;
    var ref = (0, _value.makeRef)(elemType, address);
    if (control.mode === 'lvalue' || elemType.kind === 'array') {
      // Return the reference in lvalue mode, or if the element type is
      // an array (and ref has a decayed type).
      return { control: control.cont, result: ref };
    } else {
      var effects = [['load', ref]];
      var result = (0, _memory.readValue)(core, ref);
      return { control: control.cont, result: result, effects: effects };
    }
  }
};

var stepInitListExpr = function stepInitListExpr(core, control) {
  var node = control.node,
      step = control.step;

  var elements = void 0;
  if (step === 0) {
    elements = [];
  } else {
    elements = control.elements.slice();
    elements.push(core.result);
  }
  if (step < node[2].length) {
    return {
      control: enterExpr(node[2][step], _extends({}, control, { step: step + 1, elements: elements }))
    };
  }
  return {
    control: control.cont,
    result: elements
  };
};

var stepConditionalOperator = function stepConditionalOperator(core, control) {
  var node = control.node,
      step = control.step;

  switch (step) {
    case 0:
      // Evaluate the condition operand.
      return { control: enterExpr(node[2][0], _extends({}, control, { step: 1 })) };
    case 1:
      // Evaluate the operand depending on the result's truthiness.
      if (core.result.toBool()) {
        return { control: enterExpr(node[2][1], _extends({}, control, { step: 2 })) };
      } else {
        return { control: enterExpr(node[2][2], _extends({}, control, { step: 2 })) };
      }
    case 2:
      // Pass the result upwards.
      return { control: control.cont, result: core.result };
  }
};

function stepCXXMemberCallExpr(core, control) {
  /* [MemberExpr, …args] */
  return { error: 'not implemented: CXXMemberCallExpr' };
}

function stepCXXDefaultArgExpr(core, control) {
  return stepParenExpr(core, control);
}

function stepImplicitValueInitExpr(core, control) {
  return { control: control.cont, result: null };
}

var stepVarDecl = function stepVarDecl(core, control) {
  // VarDecl children are [type, init?] (init is optional).
  var node = control.node,
      step = control.step;
  // The type is evaluated in case it contains expressions,
  // as for instance in the case of ConstantArrayType.

  if (step === 0) {
    return { control: enter(node[2][0], _extends({}, control, { step: 1 })) };
  }
  // Evaluate the initializer, if present.
  if (step === 1 && node[2].length === 2) {
    var _type = core.result;
    return { control: enterExpr(node[2][1], _extends({}, control, { step: 2, type: _type })) };
  }
  var name = control.node[1].name;

  var preType = step === 1 ? core.result : control.type;
  var preInit = step === 2 ? core.result : null;

  var _finalizeVarDecl = (0, _decl.finalizeVarDecl)(core, preType, preInit),
      type = _finalizeVarDecl.type,
      init = _finalizeVarDecl.init;

  var effects = [['vardecl', name, type, init]];
  return { control: control.cont, result: null, effects: effects };
};

var stepIntegerLiteral = function stepIntegerLiteral(core, control) {
  var value = control.node[1].value;
  // XXX use different type if value ends with l, ll, ul, ull
  return {
    control: control.cont,
    result: new _value.IntegralValue(_type2.builtinTypes['int'], parseInt(value))
  };
};

var stepCharacterLiteral = function stepCharacterLiteral(core, control) {
  var value = control.node[1].value;
  // XXX use 'unsigned char' if value ends with 'u'
  return {
    control: control.cont,
    result: new _value.IntegralValue(_type2.builtinTypes['char'], parseInt(value))
  };
};

var stepFloatingLiteral = function stepFloatingLiteral(core, control) {
  var value = control.node[1].value;
  var type = /[fF]$/.test(value) ? _type2.builtinTypes['float'] : _type2.builtinTypes['double'];
  return {
    control: control.cont,
    result: new _value.FloatingValue(type, parseFloat(value))
  };
};

var stepStringLiteral = function stepStringLiteral(core, control) {
  var ref = core.literals.get(control.node);
  return {
    control: control.cont,
    result: ref
  };
};

var stepBuiltinType = function stepBuiltinType(core, control) {
  var name = control.node[1].name;

  var result = _type2.builtinTypes[name];
  return { control: control.cont, result: result };
};

var stepPointerType = function stepPointerType(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    return { control: enter(node[2][0], _extends({}, control, { step: 1 })) };
  }
  var result = (0, _type2.pointerType)(core.result);
  return { control: control.cont, result: result };
};

var stepConstantArrayType = function stepConstantArrayType(core, control) {
  // A ConstantArrayType has a 'size' attribute and a single type child.
  var node = control.node,
      step = control.step;

  if (step === 0) {
    // Evaluate the type expression.
    return { control: enter(node[2][0], _extends({}, control, { step: 1 })) };
  }
  var elemType = core.result;
  var elemCount = new _value.IntegralValue(_type2.builtinTypes['unsigned int'], parseInt(node[1].size));
  var result = (0, _type2.arrayType)(elemType, elemCount);
  return { control: control.cont, result: result };
};

var stepVariableArrayType = function stepVariableArrayType(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    // Evaluate the type expression.
    return { control: enter(node[2][0], _extends({}, control, { step: 1 })) };
  }
  if (step === 1) {
    // Evaluate the size expression.
    var _elemType = core.result;
    return { control: enter(node[2][1], _extends({}, control, { step: 2, elemType: _elemType })) };
  }
  var elemType = control.elemType;

  var elemCount = core.result;
  var result = (0, _type2.arrayType)(elemType, elemCount);
  return { control: control.cont, result: result };
};

var stepIncompleteArrayType = function stepIncompleteArrayType(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    return { control: enter(node[2][0], _extends({}, control, { step: 1 })) };
  }
  var elemType = core.result;
  var result = (0, _type2.arrayType)(elemType, undefined);
  return { control: control.cont, result: result };
};

var stepFunctionProtoType = function stepFunctionProtoType(core, control) {
  var node = control.node,
      step = control.step;

  var cont = _extends({}, control, { step: step + 1 });
  if (step === 0) {
    cont.result = _type2.builtinTypes['int']; /* default */
    cont.params = [];
  } else if (core.result.kind) {
    /* result type */
    cont.result = core.result;
  } else {
    /* param {name,type} */
    cont.params = control.params.slice();
    cont.params.push(core.result);
  }
  if (step < node[2].length) {
    return { control: enter(node[2][step], cont) };
  }
  return {
    control: control.cont,
    result: (0, _type2.functionType)(cont.result, cont.params)
  };
};

var stepParmVarDecl = function stepParmVarDecl(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    // Evaluate the type.
    return {
      control: enter(node[2][0], _extends({}, control, { step: step + 1 }))
    };
  }
  var name = node[1].name;
  var type = core.result;
  return { control: control.cont, result: { name: name, type: type } };
};

var stepFieldDecl = function stepFieldDecl(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    // Evaluate the type.
    return {
      control: enter(node[2][0], _extends({}, control, { step: step + 1 }))
    };
  }
  var name = node[1].name;
  var type = core.result;
  return { control: control.cont, result: { name: name, type: type } };
};

var stepParenType = function stepParenType(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    return { control: enter(node[2][0], _extends({}, control, { step: 1 })) };
  } else {
    return { control: control.cont, result: core.result };
  }
};

var stepDecayedType = function stepDecayedType(core, control) {
  var node = control.node,
      step = control.step;

  if (step === 0) {
    return { control: enter(node[2][0], _extends({}, control, { step: 1 })) };
  } else {
    return { control: control.cont, result: (0, _type2.decayedType)(core.result) };
  }
};

var stepRecordType = function stepRecordType(core, control) {
  var node = control.node;

  var name = node[1].name;
  var type = core.recordDecls.get(name) || (0, _type2.forwardRecordType)(name);
  return { control: control.cont, result: type };
};

var stepFunctionDecl = function stepFunctionDecl(core, control) {
  /* FunctionDecl({define}, [name, type, body]) */
  var node = control.node,
      step = control.step;
  /* TEMP: skip malform decl --- TODO: fix c-to-json */

  if (/Decl$/.test(node[2][1][0])) {
    return { control: control.cont, result: null };
  }
  if (step === 0) {
    return { control: enter(node[2][1], _extends({}, control, { step: step + 1 })) };
  }
  var name = node[2][0][1].identifier;
  var type = core.result;
  var body = node[1].define ? node[2][2] : null;
  var effects = [['fundecl', name, type, body, node]];
  return { control: control.cont, result: null, effects: effects };
};

var stepTypedefDecl = function stepTypedefDecl(core, control) {
  return { control: control.cont, result: null };
};

var stepRecordDecl = function stepRecordDecl(core, control) {
  var node = control.node,
      step = control.step;

  var values = control.values;
  if (step === 0) {
    values = [];
  } else {
    values = [].concat(_toConsumableArray(values), [core.result]);
  }
  if (step < node[2].length) {
    return {
      control: enter(node[2][step], _extends({}, control, { step: step + 1, values: values }))
    };
  }
  var name = node[1].name;

  var type = (0, _type2.recordType)(name, values);
  var effects = [['recdecl', name, type]];
  return { control: control.cont, result: null, effects: effects };
};

function stepCXXRecordDecl(core, control) {
  /* {name} [?, …members] */
  return { error: 'not implemented: CXXRecordDecl' };
}

function stepCXXMethodDecl(core, control) {
  /* {define} [name, type, block] */
  return { error: 'not implemented: CXXMethodDecl' };
}

function stepCXXConstructorDecl(core, control) {
  /* {define, implicit} [name, …args] */
  return { error: 'not implemented: CXXConstructorDecl' };
}

var getStep = function getStep(core) {
  var control = core.control;

  switch (control.node[0]) {
    case 'CompoundStmt':
      return stepCompoundStmt(core, control);
    case 'DeclStmt':
      return stepDeclStmt(core, control);
    case 'ForStmt':
      return stepForStmt(core, control);
    case 'WhileStmt':
      return stepWhileStmt(core, control);
    case 'DoStmt':
      return stepDoStmt(core, control);
    case 'BreakStmt':
      return stepBreakStmt(core, control);
    case 'ContinueStmt':
      return stepContinueStmt(core, control);
    case 'IfStmt':
      return stepIfStmt(core, control);
    case 'ReturnStmt':
      return stepReturnStmt(core, control);
    case 'NullStmt':
      return stepNullStmt(core, control);
    case 'VarDecl':
      return stepVarDecl(core, control);
    case 'ParenExpr':
      return stepParenExpr(core, control);
    case 'CallExpr':
      return stepCallExpr(core, control);
    case 'ImplicitCastExpr':
      return stepImplicitCastExpr(core, control);
    case 'CStyleCastExpr':
      return stepExplicitCastExpr(core, control);
    case 'DeclRefExpr':
      return stepDeclRefExpr(core, control);
    case 'MemberExpr':
      return stepMemberExpr(core, control);
    case 'IntegerLiteral':
      return stepIntegerLiteral(core, control);
    case 'CharacterLiteral':
      return stepCharacterLiteral(core, control);
    case 'FloatingLiteral':
      return stepFloatingLiteral(core, control);
    case 'StringLiteral':
      return stepStringLiteral(core, control);
    case 'UnaryOperator':
      switch (control.node[1].opcode) {
        case 'Plus':case 'Minus':case 'LNot':case 'Not':
          return stepUnaryOperator(core, control);
        case 'PreInc':case 'PreDec':case 'PostInc':case 'PostDec':
          return stepAssignmentUnaryOperator(core, control);
        case 'AddrOf':
          return stepAddrOf(core, control);
        case 'Deref':
          return stepDeref(core, control);
        default:
          return {
            error: 'cannot step through UnaryOperator ' + control.node[1].opcode
          };
      }
      break;
    case 'UnaryExprOrTypeTraitExpr':
      return stepUnaryExprOrTypeTraitExpr(core, control);
    case 'BinaryOperator':
      if (control.node[1].opcode === 'Assign') {
        return stepAssignmentOperator(core, control);
      } else {
        return stepBinaryOperator(core, control);
      }
    case 'CompoundAssignOperator':
      return stepAssignmentBinaryOperator(core, control);
    case 'ArraySubscriptExpr':
      return stepArraySubscriptExpr(core, control);
    case 'InitListExpr':
      return stepInitListExpr(core, control);
    case 'ConditionalOperator':
      return stepConditionalOperator(core, control);
    case 'CXXMemberCallExpr':
      return stepCXXMemberCallExpr(core, control);
    case 'CXXDefaultArgExpr':
      return stepCXXDefaultArgExpr(core, control);
    case 'ImplicitValueInitExpr':
      return stepImplicitValueInitExpr(core, control);
    case 'BuiltinType':
      return stepBuiltinType(core, control);
    case 'PointerType':
      return stepPointerType(core, control);
    case 'ConstantArrayType':
      return stepConstantArrayType(core, control);
    case 'VariableArrayType':
      return stepVariableArrayType(core, control);
    case 'IncompleteArrayType':
      return stepIncompleteArrayType(core, control);
    case 'FunctionProtoType':
    case 'FunctionNoProtoType':
      return stepFunctionProtoType(core, control);
    case 'ParmVarDecl':
      return stepParmVarDecl(core, control);
    case 'ParenType':
    case 'ElaboratedType':
      return stepParenType(core, control);
    case 'DecayedType':
      return stepDecayedType(core, control);
    case 'RecordType':
      return stepRecordType(core, control);
    case 'FunctionDecl':
      return stepFunctionDecl(core, control);
    case 'TypedefDecl':
      return stepTypedefDecl(core, control);
    case 'RecordDecl':
      return stepRecordDecl(core, control);
    case 'CXXRecordDecl':
      return stepCXXRecordDecl(core, control);
    case 'CXXMethodDecl':
      return stepCXXMethodDecl(core, control);
    case 'CXXConstructorDecl':
      return stepCXXConstructorDecl(core, control);
    case 'FieldDecl':
      return stepFieldDecl(core, control);
  }
  return { error: 'cannot step through ' + control.node[0] };
};

var step = exports.step = function step(core) {
  // Performs a single step.
  if (!core.control) {
    // Program is halted.
    throw { name: 'halted' };
  }
  var step = getStep(core);
  if (!step) {
    throw { name: 'stuck' };
  }
  if ('error' in step) {
    throw { name: 'error', details: step.error };
  }
  var effects = step.effects || [];
  /* Shorthand for 'control' effect. */
  if ('control' in step) {
    effects.unshift(['control', step.control]);
  }
  /* Shorthand for 'result' effect. */
  if ('result' in step) {
    effects.push(['result', step.result]);
  }
  return effects;
};