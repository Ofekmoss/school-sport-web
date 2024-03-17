(function () {
    function isDigit(ch) {
        return '0' <= ch && ch <= '9';
    }

    function isOperator(ch) {
        return "{},<>=()+-*/".indexOf(ch) >= 0;
    }

    function isWhitespace(ch) {
        return (ch === ' ' || ch === '\r' || ch === '\t' ||
            ch === '\n' || ch === '\v' || ch === '\u00A0');
    }

    function lex(expression, options) {
        var i = 0;
        var tokens = [];
        var conditionals = options && options.conditionals;

        function skipSpaces() {
            while (i < expression.length && isWhitespace(expression[i])) {
                i++;
            }
        }

        function readNumber() {
            var dec = false;
            var n = i;
            while (n < expression.length) {
                var ch = expression[n];
                if (isWhitespace(ch) || isOperator(ch)) {
                    break;
                }

                if (ch === '.') {
                    if (dec) {
                        return false;
                    }
                    else {
                        dec = true;
                    }
                }
                else if (!isDigit(ch)) {
                    return false;
                }
                n++;
            }

            tokens.push(parseFloat(expression.slice(i, n)));
            i = n;
            return true;
        }

        function readVariable() {
            if (i < expression.length && expression[i] === '[') {
                i++;
                var s = i;
                while (i < expression.length && expression[i] !== ']') {
                    i++;
                }
                tokens.push(expression.slice(s, i));
                if (expression[i] === ']') {
                    i++;
                }
                return true;
            }

            var n = i;
            while (n < expression.length) {
                if (conditionals && (n === i || ch === ' ')) {
                    var st = expression.slice(n, n + 2).toLowerCase();
                    var op = null;
                    if (st === 'or') {
                        st = expression[n + 2];
                        if (!st || st == ' ' || isOperator(st)) {
                            op = 'or';
                        }
                    }
                    else if (st === 'if') {
                        st = expression[n + 2];
                        if (!st || st == ' ' || isOperator(st)) {
                            op = 'if';
                        }
                    }
                    else if (st === 'no' && expression[n + 2].toLowerCase() === 't') {
                        st = expression[n + 3];
                        if (!st || st == ' ' || isOperator(st)) {
                            op = 'not';
                        }
                    }
                    else if (st === 'de' && expression[n + 2].toLowerCase() === 'f') {
                        st = expression[n + 3];
                        if (!st || st == ' ' || isOperator(st)) {
                            op = 'def';
                        }
                    }
                    else if (st === 'an' && expression[n + 2].toLowerCase() === 'd') {
                        st = expression[n + 3];
                        if (!st || st == ' ' || isOperator(st)) {
                            op = 'and';
                        }
                    }
                    if (op) {
                        if (n === i) {
                            tokens.push(op);
                            i = n + op.length;
                            return true;
                        }
                        break;
                    }
                }
                var ch = expression[n];
                if (isOperator(ch)) {
                    break;
                }
                n++;
            }

            tokens.push(expression.slice(i, n).trim());
            i = n;
            return true;
        }

        skipSpaces();
        while (i < expression.length) {
            var ch = expression[i];
            if (ch === '.' || isDigit(ch)) {
                if (!readNumber()) {
                    return null;
                }
            }
            else if (isOperator(ch)) {
                i++;
                var nx = expression[i];
                if ((ch === '<' && (nx === '=' || nx === '>')) ||
                    (ch === '>' && (nx === '=' || nx === '>')) ||
                    (ch === '=' && nx === '=')) {
                    tokens.push(ch + nx);
                    i++;
                }
                else {
                    tokens.push(ch);
                }
            }
            else if (!readVariable()) {
                return null;
            }
            skipSpaces();
        }

        return tokens;
    }

    function parse(expression, options) {
        var tokens = lex(expression, options);
        var i = 0;
        if (tokens == null) {
            return null;
        }

        var level = 0;

        var root = options && options.conditionals ? or : additive;

        function piecewise() {
            var result = or();
            if (i < tokens.length && tokens[i] === 'if') {
                var exp = result;
                result = {
                    operator: 'if',
                    pieces: []
                };
                i++;
                var condition = or();
                if (condition == null) {
                    return null;
                }
                while (condition) {
                    result.pieces.push({condition: condition, expression: exp});
                    if (i < tokens.length && tokens[i] === ',') {
                        i++;
                        exp = or();
                        if (i < tokens.length && tokens[i] === 'if') {
                            i++;
                            condition = or();
                        }
                        else {
                            result.pieces.push({expression: exp});
                            condition = null;
                        }
                    }
                    else {
                        condition = null;
                    }
                }
            }
            if (tokens[i] !== '}') {
                return null;
            }
            i++;
            return result;
        }

        function or() {
            var result = and();
            if (result === null) {
                return null;
            }
            while (i < tokens.length && tokens[i] === 'or') {
                result = {operator: 'or', left: result, right: and()};
                if (result.right == null) {
                    return null;
                }
            }
            return result;
        }

        function and() {
            var result = equality();
            if (result === null) {
                return null;
            }
            while (i < tokens.length && tokens[i] === 'and') {
                result = {operator: 'and', left: result, right: equality()};
                if (result.right == null) {
                    return null;
                }
            }
            return result;
        }

        function equality() {
            var result = relational();
            if (result === null) {
                return null;
            }
            while (i < tokens.length && (tokens[i] === '==' || tokens[i] === '<>')) {
                result = {operator: tokens[i++], left: result, right: relational()};
                if (result.right == null) {
                    return null;
                }
            }
            return result;
        }

        function relational() {
            var result = additive();
            if (result === null) {
                return null;
            }
            while (i < tokens.length && (tokens[i] === '>' || tokens[i] === '<' || tokens[i] === '>=' || tokens[i] === '<=')) {
                result = {operator: tokens[i++], left: result, right: additive()};
                if (result.right == null) {
                    return null;
                }
            }
            return result;
        }

        function additive() {
            var result = multiplicative();
            if (result === null) {
                return null;
            }
            while (i < tokens.length && (tokens[i] === '-' || tokens[i] === '+')) {
                result = {operator: tokens[i++], left: result, right: multiplicative()};
                if (result.right == null) {
                    return null;
                }
            }
            return result;
        }

        function multiplicative() {
            var result = def();
            if (result === null) {
                return null;
            }
            while (i < tokens.length && (tokens[i] === '*' || tokens[i] === '/')) {
                result = {operator: tokens[i++], left: result, right: def()};
                if (result.right == null) {
                    return null;
                }
            }
            return result;
        }

        function def() {
            var result = unary();
            if (result === null) {
                return null;
            }
            while (i < tokens.length && tokens[i] === 'def') {
                result = {operator: tokens[i++], left: result, right: unary()};
                if (result.right == null) {
                    return null;
                }
            }
            return result;
        }

        function unary() {
            var result;
            if (i < tokens.length && (tokens[i] === 'not' || tokens[i] === '-' || tokens[i] === '+')) {
                result = {operator: tokens[i++], argument: argument()};
                if (result.argument == null) {
                    return null;
                }
            }
            else {
                result = argument();
            }
            return result;
        }

        function argument() {
            if (tokens[i] === '{') {
                i++;
                return piecewise();
            }
            else if (tokens[i] === '(') {
                i++;
                var expression = root();
                if (tokens[i] !== ')') {
                    return null;
                }
                i++;
                return expression;
            }
            else if (tokens[i] === ')') {
                return null;
            }

            var arg = tokens[i++];
            if (tokens[i] === "(") {
                i++;
                var arguments = [];
                var another = true;
                level++;
                while (another) {
                    var a = root();
                    if (a == null) {
                        level--;
                        return null;
                    }
                    arguments.push(a);

                    if (tokens[i] === ",") {
                        i++;
                    }
                    else {
                        another = false;
                    }
                }
                level--;
                if (tokens[i] !== ")") {
                    return null;
                }
                i++;
                return {
                    function: arg,
                    arguments: arguments
                };
            }
            return options && options.evaluator && typeof arg === "string"  ? options.evaluator(arg, level) : arg;
        }

        return root();
    }

    function Equation(equation) {
        if (equation) {
            var e = equation.indexOf('=');
            if (e > 0 && equation[e + 1] !== '=') {
                this.left = parse(equation.slice(0, e));
                this.right = parse(equation.slice(e + 1));
            }
            else {
                this.invalid = true;
            }
        }
    }

    function expressionToString(expression) {
        if (typeof expression === "object") {
            return "(" + expressionToString(expression.left) + " " + expression.operator + " " + expressionToString(expression.right) + ")";
        }
        return expression.toString();
    }

    Equation.prototype.toString = function () {
        return expressionToString(this.left) + " = " + expressionToString(this.right);
    };

    function open(expression, operands, positive) {
        if (typeof expression === "object") {
            if (expression.operator === "+") {
                open(expression.left, operands, positive);
                open(expression.right, operands, positive);
            }
            else if (expression.operator === "-") {
                open(expression.left, operands, positive);
                open(expression.right, operands, !positive);
            }
            else if (expression.operator === "*") {
                var lefts = [];
                var rights = [];
                open(expression.left, lefts, true);
                open(expression.right, rights, true);
                for (var l = 0; l < lefts.length; l++) {
                    var left = lefts[l];
                    for (var r = 0; r < rights.length; r++) {
                        var right = rights[r];
                        var p = left.positive ? right.positive : !right.positive;
                        operands.push({
                            positive: p ? positive : !positive,
                            expression: {
                                operator: "*",
                                left: left.expression,
                                right: right.expression
                            }
                        });
                    }
                }
            }
            else if (expression.operator === "/") {
                var lefts = [];
                open(expression.left, lefts, true);
                for (var l = 0; l < lefts.length; l++) {
                    var left = lefts[l];
                    operands.push({
                        positive: left.positive ? positive : !positive,
                        expression: {
                            operator: "/",
                            left: left.expression,
                            right: expression.right
                        }
                    });
                }
            }
            else {
                operands.push({
                    positive: positive,
                    expression: expression
                });
            }
        }
        else {
            operands.push({
                positive: positive,
                expression: expression
            });
        }
    }

    Equation.prototype.isolate = function (variable) {
        function extractExpressionVariable(expression) {
            if (typeof expression === 'object') {
                var left = extractExpressionVariable(expression.left);
                if (left == null) {
                    return null;
                }
                var right = extractExpressionVariable(expression.right);
                if (right == null || (expression.operator === '/' && right.order > 0)) {
                    return null;
                }
                return {
                    order: left.order + right.order,
                    expression: {operator: expression.operator, left: left.expression, right: right.expression}
                };

            }
            else if (expression === variable) {
                return {
                    order: 1,
                    expression: 1
                };
            }
            else {
                return {
                    order: 0,
                    expression: expression
                };
            }
        }

        function extractOperandVariable(operand) {
            var result = extractExpressionVariable(operand.expression);
            if (result == null) {
                return false;
            }
            operand.order = result.order;
            operand.expression = result.expression;
            return true;
        }

        function extractOperands(operands) {
            for (var i = 0; i < operands.length; i++) {
                if (!extractOperandVariable(operands[i])) {
                    return false;
                }
            }
            return true;
        }

        function shrink(expression) {
            if (typeof expression === "object") {
                expression.left = shrink(expression.left);
                expression.right = shrink(expression.right);
                if (expression.operator === "*") {
                    if (expression.left === 0) {
                        return 0;
                    }
                    else if (expression.left === 1) {
                        return expression.right;
                    }
                    else if (expression.right === 0) {
                        return 0;
                    }
                    else if (expression.right === 1) {
                        return expression.left;
                    }
                    else if (expression.right.operator === "-" && expression.right.left === 0) {
                        if (expression.left.operator === "-" && expression.left.left === 0) {
                            return {operator: "*", left: expression.left.right, right: expression.right.right};
                        }
                        else {
                            // Moving 0- to left
                            return {operator: "*", left: {operator: "-", left: 0, right: expression.left}, right: expression.right.right};
                        }
                    }
                }
                else if (expression.operator === "/") {
                    if (expression.right === 1) {
                        return expression.left;
                    }
                    else if (expression.left === 0) {
                        return 0;
                    }
                    else if (expression.right.operator === "-" && expression.right.left === 0) {
                        if (expression.left.operator === "-" && expression.left.left === 0) {
                            return {operator: "/", left: expression.left.right, right: expression.right.right};
                        }
                        else {
                            // Moving 0- to left
                            return {operator: "/", left: {operator: "-", left: 0, right: expression.left}, right: expression.right.right};
                        }
                    }
                }
                else if (expression.operator === "+") {
                    if (expression.left === 0) {
                        return expression.right;
                    }
                    else if (expression.right === 0) {
                        return expression.left;
                    }
                }
                else if (expression.operator === "-") {
                    if (expression.right === 0) {
                        return expression.left;
                    }
                }
            }
            return expression;
        }

        var lefts = [];
        open(this.left, lefts, true);
        var rights = [];
        open(this.right, rights, true);

        if (!extractOperands(lefts) || !extractOperands(rights)) {
            return null;
        }

        var rightsLength = rights.length;
        var i = 0;
        while (i < lefts.length) {
            var operand = lefts[i];
            if (operand.order > 1) {
                return null; // Not supporting more than 1 order
            }
            else if (operand.order === 0) {
                lefts.splice(i, 1);
                rights.push({
                    positive: !operand.positive,
                    expression: operand.expression
                });
            }
            else {
                i++;
            }
        }

        i = 0;
        while (i < rightsLength) {
            var operand = rights[i];
            if (operand.order > 1) {
                return null; // Not supporting more than 1 order
            }
            else if (operand.order === 1) {
                rightsLength--;
                rights.splice(i, 1);
                lefts.push({
                    positive: !operand.positive,
                    expression: operand.expression
                });
            }
            else {
                i++;
            }
        }

        var first = rights[0];
        var right = first == null ? 0 : (first.positive ? first.expression : {operator: "-", left: 0, right: first.expression});
        for (var i = 1; i < rights.length; i++) {
            var operand = rights[i];
            right = {
                operator: operand.positive ? "+" : "-",
                left: right,
                right: operand.expression
            };
        }

        if (lefts.length === 0) {
            return null; // Variable not found
        }

        var first = lefts[0];
        var denom = first.positive ? first.expression : {operator: "-", left: 0, right: first.expression};
        for (var i = 1; i < lefts.length; i++) {
            var operand = lefts[i];
            denom = {
                operator: operand.positive ? "+" : "-",
                left: denom,
                right: operand.expression
            };
        }

        if (denom !== 1) {
            right = {
                operator: "/",
                left: right,
                right: denom
            };
        }

        var result = new Equation();
        result.left = variable;
        result.right = shrink(right);
        return result;
    };

    function evaluateVariable(variable, variables) {
        var value = variables[variable];
        if (value === undefined) {
            var base = variables["."];
            while (base) {
                value = base[variable];
                if (value === undefined) {
                    base = base["."];
                } else {
                    break;
                }
            }

            if (value === undefined) {
                value = null;
            }
            variables[variable] = value;
        }
        if (typeof value === "string") {
            value = Equation.expression(value);
            variables[variable] = value;
        }

        return Equation.solve(value, variables);
    }

    Equation.prototype.solve = function (variable, variables) {
        if (this.left !== variable) {
            return this.isolate(variable).solve(variable, variables);
        }

        return Equation.solve(this.right, variables);
    };

    Equation.expression = function (expression, options) {
        return parse(expression, options);
    };

    function EquationContext(variables, functions) {
        this.variables = variables || {};
        this.functions = functions || {};
    }

    EquationContext.prototype.solve = function (expression) {
        if (expression == null) {
            return null;
        }
        if (typeof expression === "object") {
            if (expression.function) {
                var f = this.functions[expression.function];
                if (!f) {
                    return null;
                }

                var autonomous = false;
                if (!(f instanceof Function)) {
                    autonomous = f.autonomous;
                    f = f.function;
                }

                var args;
                if (autonomous) {
                    args = expression.arguments;
                }
                else {
                    var args = [];
                    for (var a = 0; a < expression.arguments.length; a++) {
                        var val = this.solve(expression.arguments[a]);
                        if (val == null) {
                            return null;
                        }
                        args.push(val);
                    }
                }

                return f.apply(this, args);
            }
            else if (expression.operator === "if") {
                for (var n = 0; n < expression.pieces.length; n++) {
                    var piece = expression.pieces[n];
                    if (piece.condition) {
                        var condition = this.solve(piece.condition);
                        if (condition !== null && condition !== 0) {
                            return this.solve(piece.expression);
                        }
                    }
                    else {
                        return this.solve(piece.expression);
                    }
                }
                return null;
            }
            else if (expression.argument !== undefined) {
                // Unary expression
                var argument = this.solve(expression.argument);
                switch (expression.operator) {
                    case "-":
                        return -argument;
                    case "+":
                        return +argument;
                    case "not":
                        return argument === null || argument === 0 ? 1 : 0;
                    default:
                        return null;
                }
            }
            var left = this.solve(expression.left);
            if (expression.operator === "def") {
                if (left == null) {
                    return this.solve(expression.right);
                }
                return left;
            }
            if (left == null) return null;
            var right = this.solve(expression.right);
            if (right == null) return null;

            switch (expression.operator) {
                case "-":
                    return left - right;
                case "+":
                    return left + right;
                case "*":
                    return left * right;
                case "/":
                    return left / right;
                case "<":
                    return left < right ? 1 : 0;
                case ">":
                    return left > right ? 1 : 0;
                case "<=":
                    return left <= right ? 1 : 0;
                case ">=":
                    return left >= right ? 1 : 0;
                case "==":
                    return left === right ? 1 : 0;
                case "<>":
                    return left === right ? 0 : 1;
                case "and":
                    if (left === null || left === 0 || right === null || right === 0) {
                        return 0;
                    }
                    return 1;
                case "or":
                    if ((left === null || left === 0) && (right === null || right === 0)) {
                        return 0;
                    }
                    return 1;
                default:
                    return null;
            }
        }
        else if (typeof expression === "string") {
            return evaluateVariable(expression, this.variables);
        }
        else if (expression instanceof Function) {
            return expression(this.variables);
        }
        else {
            return expression;
        }
    };

    Equation.solve = function (expression, variables, functions) {
        return new EquationContext(variables, functions).solve(expression);
    };



//var s = new Equation("D=O*C.T/C.O").isolate("O").toString();
//s = new Equation("a + b=12.30+(a - b)*(s - 14)").isolate("a").toString();

//var value = new Equation("D=O*C.T/C.O*.9").solve("O", {D: 60, "C.T": 5, "C.O": 0.5});

    //var exp = Equation.expression("a + 2 > 4", {conditionals: true});
    //var exp = Equation.expression("a + {4 + 3 if a == 2, 6} +1", {conditionals: true});

    //var exp = Equation.expression("{#f00}", {conditionals: true});

    if (typeof module !== "undefined" && module.exports) {
        module.exports = Equation;
    }
    else {
        if (this) {
            this.Equation = Equation;
        }
        return Equation;
    }
})();
