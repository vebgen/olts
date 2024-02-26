import {
    CallExpression,
    ColorType,
    EncodedExpression,
    Expression,
    LiteralExpression,
    LiteralValue,
    Ops,
    ParsingContext,
    overlapsType,
    parse,
    typeName,
} from './expression';
import {
    Color,
    fromString,
    lchaToRgba,
    normalize,
    rgbaToLcha,
    withAlpha,
} from '@olts/core/color';


/**
 * @fileoverview This module includes functions to build expressions for
 * evaluation on the CPU. Building is composed of two steps: parsing and
 * compiling.  The parsing step takes an encoded expression and returns an
 * instance of one of the expression classes.  The compiling step takes the
 * expression instance and returns a function that can be evaluated in to return
 * a literal value.  The evaluator function should do as little allocation and
 * work as possible.
 */


export interface EvaluationContext {
    /**
     * The values for properties used in 'get' expressions.
     *
     * @todo initial type was object. If LiteralValue is too restrictive
     * change it to any.
     */
    properties: Record<string, LiteralValue>;

    /**
     * The values for variables used in 'var' expressions.
     *
     * @todo initial type was object. If LiteralValue is too restrictive
     * change it to any.
     */
    variables: Record<string, LiteralValue>;

    /**
     * The map resolution.
     */
    resolution: number;

    /**
     * The feature id.
     */
    featureId: string | number | null;

    /**
     * Geometry type of the current object.
     */
    geometryType: string;
}



/**
 * Create a new evaluation context.
 *
 * @return A new evaluation context.
 */
export function newEvaluationContext(): EvaluationContext {
    return {
        variables: {},
        properties: {},
        resolution: NaN,
        featureId: null,
        geometryType: '',
    };
}


/**
 * An evaluator function for an expression.
 */
export type ExpressionEvaluator = (
    context: EvaluationContext
) => LiteralValue;


/**
 * An evaluator function for an expression that evaluates to a boolean.
 */
export type BooleanEvaluator = (
    context: EvaluationContext
) => boolean;


/**
 * An evaluator function for an expression that evaluates to a number.
 */
export type NumberEvaluator = (
    context: EvaluationContext
) => number;


/**
 * An evaluator function for an expression that evaluates to a string.
 */
export type StringEvaluator = (
    context: EvaluationContext
) => string;


/**
 * An evaluator function for an expression that evaluates to a color.
 */
export type ColorLikeEvaluator = (
    context: EvaluationContext
) => (number[] | string);


/**
 * An evaluator function for an expression that evaluates to an array of
 * numbers.
 */
export type NumberArrayEvaluator = (
    context: EvaluationContext
) => number[];


/**
 * An evaluator function for an expression that evaluates to a coordinate.
 */
export type CoordinateEvaluator = (
    context: EvaluationContext
) => number[];


/**
 * An evaluator function for an expression that evaluates to a size.
 */
export type SizeEvaluator = (
    context: EvaluationContext
) => (number[]);


/**
 * An evaluator function for an expression that evaluates to a size or a number.
 */
export type SizeLikeEvaluator = (
    context: EvaluationContext
) => (number[] | number);


/**
 * @param encoded The encoded expression.
 * @param type The expected type.
 * @param context The parsing context.
 * @return The expression evaluator.
 */
export function buildExpression(
    encoded: EncodedExpression,
    type: number,
    context: ParsingContext
): ExpressionEvaluator {
    const expression = parse(encoded, context);
    if (!overlapsType(type, expression.type)) {
        const expected = typeName(type);
        const actual = typeName(expression.type);
        throw new Error(
            `Expected expression to be of type ${expected}, got ${actual}`,
        );
    }
    return compileExpression(expression, context);
}


/**
 * @param expression The expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileExpression(
    expression: Expression, context: ParsingContext
): ExpressionEvaluator {
    if (expression instanceof LiteralExpression) {
        // convert colors to array if possible
        if (expression.type === ColorType && typeof expression.value === 'string') {
            const colorValue = fromString(expression.value);
            return function () {
                return colorValue;
            };
        }
        return function () {
            return expression.value;
        };
    }
    const operator = expression.operator;
    switch (operator) {
        case Ops.Number:
        case Ops.String:
        case Ops.Coalesce: {
            return compileAssertionExpression(expression, context);
        }
        case Ops.Get:
        case Ops.Var: {
            return compileAccessorExpression(expression, context);
        }
        case Ops.Id: {
            // TODO: context.featureId can be NULL but LiteralValue does not
            // support NULL.
            return (context) => context.featureId as LiteralValue;
        }
        case Ops.GeometryType: {
            return (context) => context.geometryType;
        }
        case Ops.Concat: {
            const args = expression.args.map((e) => compileExpression(e, context));
            return (context) =>
                ''.concat(...args.map((arg) => arg(context).toString()));
        }
        case Ops.Resolution: {
            return (context) => context.resolution;
        }
        case Ops.Any:
        case Ops.All:
        case Ops.Not: {
            return compileLogicalExpression(expression, context);
        }
        case Ops.Equal:
        case Ops.NotEqual:
        case Ops.LessThan:
        case Ops.LessThanOrEqualTo:
        case Ops.GreaterThan:
        case Ops.GreaterThanOrEqualTo: {
            return compileComparisonExpression(expression, context);
        }
        case Ops.Multiply:
        case Ops.Divide:
        case Ops.Add:
        case Ops.Subtract:
        case Ops.Clamp:
        case Ops.Mod:
        case Ops.Pow:
        case Ops.Abs:
        case Ops.Floor:
        case Ops.Ceil:
        case Ops.Round:
        case Ops.Sin:
        case Ops.Cos:
        case Ops.Atan:
        case Ops.Sqrt: {
            return compileNumericExpression(expression, context);
        }
        case Ops.Case: {
            return compileCaseExpression(expression, context);
        }
        case Ops.Match: {
            return compileMatchExpression(expression, context);
        }
        case Ops.Interpolate: {
            return compileInterpolateExpression(expression, context);
        }
        default: {
            throw new Error(`Unsupported operator ${operator}`);
        }
        // TODO: unimplemented
        // Ops.Zoom
        // Ops.Time
        // Ops.Between
        // Ops.In
        // Ops.Array
        // Ops.Color
        // Ops.Band
        // Ops.Palette
    }
}


/**
 * @param expression The call expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileAssertionExpression(
    expression: CallExpression, context: ParsingContext
): ExpressionEvaluator {
    const type = expression.operator;
    const length = expression.args.length;

    const args = new Array(length);
    for (let i = 0; i < length; ++i) {
        args[i] = compileExpression(expression.args[i], context);
    }
    switch (type) {
        case Ops.Coalesce: {
            return (context) => {
                for (let i = 0; i < length; ++i) {
                    const value = args[i](context);
                    if (typeof value !== 'undefined' && value !== null) {
                        return value;
                    }
                }
                throw new Error('Expected one of the values to be non-null');
            };
        }
        case Ops.Number:
        case Ops.String: {
            return (context) => {
                for (let i = 0; i < length; ++i) {
                    const value = args[i](context);
                    if (typeof value === type) {
                        return value;
                    }
                }
                throw new Error(`Expected one of the values to be a ${type}`);
            };
        }
        default: {
            throw new Error(`Unsupported assertion operator ${type}`);
        }
    }
}


/**
 * @param expression The call expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileAccessorExpression(
    expression: CallExpression,
    context: ParsingContext
): ExpressionEvaluator {
    const nameExpression = expression.args[0] as LiteralExpression;
    const name = nameExpression.value as string;
    switch (expression.operator) {
        case Ops.Get: {
            return (context) => context.properties[name];
        }
        case Ops.Var: {
            return (context) => context.variables[name];
        }
        default: {
            throw new Error(
                `Unsupported accessor operator ${expression.operator}`
            );
        }
    }
}


/**
 * @param expression The call expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileComparisonExpression(
    expression: CallExpression, context: ParsingContext
): BooleanEvaluator {
    const op = expression.operator;
    const left = compileExpression(expression.args[0], context);
    const right = compileExpression(expression.args[1], context);
    switch (op) {
        case Ops.Equal: {
            return (context) => left(context) === right(context);
        }
        case Ops.NotEqual: {
            return (context) => left(context) !== right(context);
        }
        case Ops.LessThan: {
            return (context) => left(context) < right(context);
        }
        case Ops.LessThanOrEqualTo: {
            return (context) => left(context) <= right(context);
        }
        case Ops.GreaterThan: {
            return (context) => left(context) > right(context);
        }
        case Ops.GreaterThanOrEqualTo: {
            return (context) => left(context) >= right(context);
        }
        default: {
            throw new Error(`Unsupported comparison operator ${op}`);
        }
    }
}


/**
 * @param expression The call expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileLogicalExpression(
    expression: CallExpression, context: ParsingContext
): BooleanEvaluator {
    const op = expression.operator;
    const length = expression.args.length;

    const args = new Array(length);
    for (let i = 0; i < length; ++i) {
        args[i] = compileExpression(expression.args[i], context);
    }
    switch (op) {
        case Ops.Any: {
            return (context) => {
                for (let i = 0; i < length; ++i) {
                    if (args[i](context)) {
                        return true;
                    }
                }
                return false;
            };
        }
        case Ops.All: {
            return (context) => {
                for (let i = 0; i < length; ++i) {
                    if (!args[i](context)) {
                        return false;
                    }
                }
                return true;
            };
        }
        case Ops.Not: {
            return (context) => !args[0](context);
        }
        default: {
            throw new Error(`Unsupported logical operator ${op}`);
        }
    }
}


/**
 * @param expression The call expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileNumericExpression(
    expression: CallExpression, context: ParsingContext
): NumberEvaluator {
    const op = expression.operator;
    const length = expression.args.length;

    const args = new Array(length);
    for (let i = 0; i < length; ++i) {
        args[i] = compileExpression(expression.args[i], context);
    }
    switch (op) {
        case Ops.Multiply: {
            return (context) => {
                let value = 1;
                for (let i = 0; i < length; ++i) {
                    value *= args[i](context);
                }
                return value;
            };
        }
        case Ops.Divide: {
            return (context) => args[0](context) / args[1](context);
        }
        case Ops.Add: {
            return (context) => {
                let value = 0;
                for (let i = 0; i < length; ++i) {
                    value += args[i](context);
                }
                return value;
            };
        }
        case Ops.Subtract: {
            return (context) => args[0](context) - args[1](context);
        }
        case Ops.Clamp: {
            return (context) => {
                const value = args[0](context);
                const min = args[1](context);
                if (value < min) {
                    return min;
                }
                const max = args[2](context);
                if (value > max) {
                    return max;
                }
                return value;
            };
        }
        case Ops.Mod: {
            return (context) => args[0](context) % args[1](context);
        }
        case Ops.Pow: {
            return (context) => Math.pow(args[0](context), args[1](context));
        }
        case Ops.Abs: {
            return (context) => Math.abs(args[0](context));
        }
        case Ops.Floor: {
            return (context) => Math.floor(args[0](context));
        }
        case Ops.Ceil: {
            return (context) => Math.ceil(args[0](context));
        }
        case Ops.Round: {
            return (context) => Math.round(args[0](context));
        }
        case Ops.Sin: {
            return (context) => Math.sin(args[0](context));
        }
        case Ops.Cos: {
            return (context) => Math.cos(args[0](context));
        }
        case Ops.Atan: {
            if (length === 2) {
                return (context) => (
                    Math.atan2(args[0](context), args[1](context))
                );
            }
            return (context) => Math.atan(args[0](context));
        }
        case Ops.Sqrt: {
            return (context) => Math.sqrt(args[0](context));
        }
        default: {
            throw new Error(`Unsupported numeric operator ${op}`);
        }
    }
}


/**
 * @param expression The call expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileCaseExpression(
    expression: CallExpression, context: ParsingContext
): ExpressionEvaluator {
    const length = expression.args.length;
    const args = new Array(length);
    for (let i = 0; i < length; ++i) {
        args[i] = compileExpression(expression.args[i], context);
    }
    return (context) => {
        for (let i = 0; i < length - 1; i += 2) {
            const condition = args[i](context);
            if (condition) {
                return args[i + 1](context);
            }
        }
        return args[length - 1](context);
    };
}


/**
 * @param expression The call expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileMatchExpression(
    expression: CallExpression, context: ParsingContext
): ExpressionEvaluator {
    const length = expression.args.length;
    const args = new Array(length);
    for (let i = 0; i < length; ++i) {
        args[i] = compileExpression(expression.args[i], context);
    }
    return (context) => {
        const value = args[0](context);
        for (let i = 1; i < length; i += 2) {
            if (value === args[i](context)) {
                return args[i + 1](context);
            }
        }
        return args[length - 1](context);
    };
}

/**
 * @param expression The call expression.
 * @param context The parsing context.
 * @return The evaluator function.
 */
function compileInterpolateExpression(
    expression: CallExpression, context: ParsingContext
): ExpressionEvaluator {
    const length = expression.args.length;
    const args = new Array(length);
    for (let i = 0; i < length; ++i) {
        args[i] = compileExpression(expression.args[i], context);
    }
    return (context) => {
        const base = args[0](context);
        const value = args[1](context);

        let previousInput;
        let previousOutput;
        for (let i = 2; i < length; i += 2) {
            const input = args[i](context);
            let output = args[i + 1](context);
            const isColor = Array.isArray(output);
            if (isColor) {
                output = withAlpha(output);
            }
            if (input >= value) {
                if (i === 2) {
                    return output;
                }
                if (isColor) {
                    return interpolateColor(
                        base,
                        value,
                        previousInput,
                        previousOutput,
                        input,
                        output,
                    );
                }
                return interpolateNumber(
                    base,
                    value,
                    previousInput,
                    previousOutput,
                    input,
                    output,
                );
            }
            previousInput = input;
            previousOutput = output;
        }
        return previousOutput;
    };
}

/**
 * @param base The base.
 * @param value The value.
 * @param input1 The first input value.
 * @param output1 The first output value.
 * @param input2 The second input value.
 * @param output2 The second output value.
 * @return The interpolated value.
 */
function interpolateNumber(
    base: number,
    value: number,
    input1: number,
    output1: number,
    input2: number,
    output2: number
): number {
    const delta = input2 - input1;
    if (delta === 0) {
        return output1;
    }
    const along = value - input1;
    const factor =
        base === 1
            ? along / delta
            : (Math.pow(base, along) - 1) / (Math.pow(base, delta) - 1);
    return output1 + factor * (output2 - output1);
}

/**
 * @param base The base.
 * @param value The value.
 * @param input1 The first input value.
 * @param rgba1 The first output value.
 * @param input2 The second input value.
 * @param rgba2 The second output value.
 * @return The interpolated color.
 */
function interpolateColor(
    base: number,
    value: number,
    input1: number,
    rgba1: Color,
    input2: number,
    rgba2: Color
): Color {
    const delta = input2 - input1;
    if (delta === 0) {
        return rgba1;
    }
    const lcha1 = rgbaToLcha(rgba1);
    const lcha2 = rgbaToLcha(rgba2);
    let deltaHue = lcha2[2] - lcha1[2];
    if (deltaHue > 180) {
        deltaHue -= 360;
    } else if (deltaHue < -180) {
        deltaHue += 360;
    }

    const lcha: Color = [
        interpolateNumber(base, value, input1, lcha1[0], input2, lcha2[0]),
        interpolateNumber(base, value, input1, lcha1[1], input2, lcha2[1]),
        lcha1[2] + interpolateNumber(base, value, input1, 0, input2, deltaHue),
        interpolateNumber(base, value, input1, rgba1[3], input2, rgba2[3]),
    ];
    return normalize(lchaToRgba(lcha));
}
