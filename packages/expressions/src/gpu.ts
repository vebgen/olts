import { asArray } from '@olts/core/color';
import PaletteTexture from '../webgl/PaletteTexture';
import {
    BooleanType,
    CallExpression,
    ColorType,
    NoneType,
    NumberArrayType,
    NumberType,
    Ops,
    StringType,
    computeGeometryType,
    isType,
    overlapsType,
    parse,
    typeName,
} from './expression';
import { Uniforms } from '../renderer/webgl/TileLayer';

/**
 * @param operator Operator
 * @param {CompilationContext} context Compilation context
 * @return A function name based on the operator, unique in the given context
 */
function computeOperatorFunctionName(operator: string, context: CompilationContext): string {
    return `operator_${operator}_${Object.keys(context.functions).length}`;
}

/**
 * Will return the number as a float with a dot separator, which is required by GLSL.
 * @param v Numerical value.
 * @return The value as string.
 */
export function numberToGlsl(v: number): string {
    const s = v.toString();
    return s.includes('.') ? s : s + '.0';
}

/**
 * Will return the number array as a float with a dot separator, concatenated with ', '.
 * @param {number[]} array Numerical values array.
 * @return The array as a vector, e. g.: `vec3(1.0, 2.0, 3.0)`.
 */
export function arrayToGlsl(array: number[]): string {
    if (array.length < 2 || array.length > 4) {
        throw new Error(
            '`formatArray` can only output `vec2`, `vec3` or `vec4` arrays.',
        );
    }
    return `vec${array.length}(${array.map(numberToGlsl).join(', ')})`;
}

/**
 * Will normalize and converts to string a `vec4` color array compatible with GLSL.
 * @param {string|import("../color").Color} color Color either in string format or [r, g, b, a] array format,
 * with RGB components in the 0..255 range and the alpha component in the 0..1 range.
 * Note that the final array will always have 4 components.
 * @return The color expressed in the `vec4(1.0, 1.0, 1.0, 1.0)` form.
 */
export function colorToGlsl(color: string | import("../../core/src/color").Color): string {
    const array = asArray(color);
    const alpha = array.length > 3 ? array[3] : 1;
    // all components are premultiplied with alpha value
    return arrayToGlsl([
        (array[0] / 255) * alpha,
        (array[1] / 255) * alpha,
        (array[2] / 255) * alpha,
        alpha,
    ]);
}

/** @type {Record<string, number>} */
const stringToFloatMap: { [s: string]: number; } = {};
let stringToFloatCounter = 0;

/**
 * Returns a stable equivalent number for the string literal.
 * @param string String literal value
 * @return Number equivalent
 */
export function getStringNumberEquivalent(string: string): number {
    if (!(string in stringToFloatMap)) {
        stringToFloatMap[string] = stringToFloatCounter++;
    }
    return stringToFloatMap[string];
}

/**
 * Returns a stable equivalent number for the string literal, for use in shaders. This number is then
 * converted to be a GLSL-compatible string.
 * Note: with a float precision of `mediump`, the amount of unique strings supported is 16,777,216
 * @param string String literal value
 * @return GLSL-compatible string containing a number
 */
export function stringToGlsl(string: string): string {
    return numberToGlsl(getStringNumberEquivalent(string));
}

/**
 * Get the uniform name given a variable name.
 * @param variableName The variable name.
 * @return The uniform name.
 */
export function uniformNameForVariable(variableName: string): string {
    return 'u_var_' + variableName;
}

/**
 * @typedef {import('./expression').ParsingContext} ParsingContext
 */
/**
 *
 * @typedef {import("./expression").Expression} Expression
 */
/**
 *
 * @typedef {import("./expression").LiteralExpression} LiteralExpression
 */

/**
 * @typedef {Object} CompilationContextProperty
 * @property name Name
 * @property type Resolved property type
 * @property {function(import("../Feature").FeatureLike): *} [evaluator] Function used for evaluating the value;
 */

/**
 * @typedef {Object} CompilationContextVariable
 * @property name Name
 * @property type Resolved variable type
 * @property {function(Object): *} [evaluator] Function used for evaluating the value; argument is the style variables object
 */

/**
 * @typedef {Object} CompilationContext
 * @property {boolean} [inFragmentShader] If false, means the expression output should be made for a vertex shader
 * @property {Record<string, CompilationContextProperty>} properties The values for properties used in 'get' expressions.
 * @property {Record<string, CompilationContextVariable>} variables The values for variables used in 'var' expressions.
 * @property {Record<string, string>} functions Lookup of functions used by the style.
 * @property [bandCount] Number of bands per pixel.
 * @property {PaletteTexture[]} [paletteTextures] List of palettes used by the style.
 * @property {import("../style/webgl").WebGLStyle} style Literal style.
 */

/**
 * @return {CompilationContext} A new compilation context.
 */
export function newCompilationContext(): CompilationContext {
    return {
        inFragmentShader: false,
        variables: {},
        properties: {},
        functions: {},
        bandCount: 0,
        style: {},
    };
}

const GET_BAND_VALUE_FUNC = 'getBandValue';

export const PALETTE_TEXTURE_ARRAY = 'u_paletteTextures';

/**
 * @typedef CompiledExpression
 */

/**
 * @typedef {function(CompilationContext, CallExpression, number): string} Compiler
 * Third argument is the expected value types
 */

/**
 * @param {import('./expression').EncodedExpression} encoded The encoded expression.
 * @param type The expected type.
 * @param {import('./expression').ParsingContext} parsingContext The parsing context.
 * @param {CompilationContext} compilationContext An existing compilation context
 * @return {CompiledExpression} The compiled expression.
 */
export function buildExpression(
    encoded: import('./expression').EncodedExpression,
    type: number,
    parsingContext: import('./expression').ParsingContext,
    compilationContext: CompilationContext,
): CompiledExpression {
    const expression = parse(encoded, parsingContext, type);
    if (isType(expression.type, NoneType)) {
        throw new Error(`No matching type was found`);
    }
    if (!overlapsType(type, expression.type)) {
        const expected = typeName(type);
        const actual = typeName(expression.type);
        throw new Error(
            `Expected expression to be of type ${expected}, got ${actual}`,
        );
    }
    return compile(expression, type, compilationContext);
}

/**
 * @param {function(CompiledExpression[], CompilationContext): string} output Function that takes in parsed arguments and returns a string
 * @return {function(CompilationContext, import("./expression").CallExpression, number): string} Compiler for the call expression
 */
function createCompiler(output: (arg0:CompiledExpression[], arg1: CompilationContext) => string): (arg0: CompilationContext, arg1: import("./expression").CallExpression, arg2: number) => string {
    return (context, expression, type) => {
        const length = expression.args.length;
        const args = new Array(length);
        for (let i = 0; i < length; ++i) {
            args[i] = compile(expression.args[i], type, context);
        }
        return output(args, context);
    };
}

/**
 * @type {Record<string, Compiler>}
 */
const compilers: { [s: string]: Compiler; } = {
    [Ops.Get]: (context, expression) => {
        const firstArg = /** @type {LiteralExpression} */ (expression.args[0]);
        const propName = /** @type */ (firstArg.value);
        const isExisting = propName in context.properties;
        if (!isExisting) {
            context.properties[propName] = {
                name: propName,
                type: expression.type,
            };
        }
        const prefix = context.inFragmentShader ? 'v_prop_' : 'a_prop_';
        return prefix + propName;
    },
    [Ops.GeometryType]: (context, expression, type) => {
        const propName = 'geometryType';
        const isExisting = propName in context.properties;
        if (!isExisting) {
            context.properties[propName] = {
                name: propName,
                type: StringType,
                evaluator: (feature) => {
                    return computeGeometryType(feature.getGeometry());
                },
            };
        }
        const prefix = context.inFragmentShader ? 'v_prop_' : 'a_prop_';
        return prefix + propName;
    },
    [Ops.Var]: (context, expression) => {
        const firstArg = /** @type {LiteralExpression} */ (expression.args[0]);
        const varName = /** @type */ (firstArg.value);
        const isExisting = varName in context.variables;
        if (!isExisting) {
            context.variables[varName] = {
                name: varName,
                type: expression.type,
            };
        }
        return uniformNameForVariable(varName);
    },
    [Ops.Resolution]: () => 'u_resolution',
    [Ops.Zoom]: () => 'u_zoom',
    [Ops.Time]: () => 'u_time',
    [Ops.Any]: createCompiler((compiledArgs) => `(${compiledArgs.join(` || `)})`),
    [Ops.All]: createCompiler((compiledArgs) => `(${compiledArgs.join(` && `)})`),
    [Ops.Not]: createCompiler(([value]) => `(!${value})`),
    [Ops.Equal]: createCompiler(
        ([firstValue, secondValue]) => `(${firstValue} == ${secondValue})`,
    ),
    [Ops.NotEqual]: createCompiler(
        ([firstValue, secondValue]) => `(${firstValue} != ${secondValue})`,
    ),
    [Ops.GreaterThan]: createCompiler(
        ([firstValue, secondValue]) => `(${firstValue} > ${secondValue})`,
    ),
    [Ops.GreaterThanOrEqualTo]: createCompiler(
        ([firstValue, secondValue]) => `(${firstValue} >= ${secondValue})`,
    ),
    [Ops.LessThan]: createCompiler(
        ([firstValue, secondValue]) => `(${firstValue} < ${secondValue})`,
    ),
    [Ops.LessThanOrEqualTo]: createCompiler(
        ([firstValue, secondValue]) => `(${firstValue} <= ${secondValue})`,
    ),
    [Ops.Multiply]: createCompiler(
        (compiledArgs) => `(${compiledArgs.join(' * ')})`,
    ),
    [Ops.Divide]: createCompiler(
        ([firstValue, secondValue]) => `(${firstValue} / ${secondValue})`,
    ),
    [Ops.Add]: createCompiler((compiledArgs) => `(${compiledArgs.join(' + ')})`),
    [Ops.Subtract]: createCompiler(
        ([firstValue, secondValue]) => `(${firstValue} - ${secondValue})`,
    ),
    [Ops.Clamp]: createCompiler(
        ([value, min, max]) => `clamp(${value}, ${min}, ${max})`,
    ),
    [Ops.Mod]: createCompiler(([value, modulo]) => `mod(${value}, ${modulo})`),
    [Ops.Pow]: createCompiler(([value, power]) => `pow(${value}, ${power})`),
    [Ops.Abs]: createCompiler(([value]) => `abs(${value})`),
    [Ops.Floor]: createCompiler(([value]) => `floor(${value})`),
    [Ops.Ceil]: createCompiler(([value]) => `ceil(${value})`),
    [Ops.Round]: createCompiler(([value]) => `floor(${value} + 0.5)`),
    [Ops.Sin]: createCompiler(([value]) => `sin(${value})`),
    [Ops.Cos]: createCompiler(([value]) => `cos(${value})`),
    [Ops.Atan]: createCompiler(([firstValue, secondValue]) => {
        return secondValue !== undefined
            ? `atan(${firstValue}, ${secondValue})`
            : `atan(${firstValue})`;
    }),
    [Ops.Sqrt]: createCompiler(([value]) => `sqrt(${value})`),
    [Ops.Match]: createCompiler((compiledArgs) => {
        const input = compiledArgs[0];
        const fallback = compiledArgs[compiledArgs.length - 1];
        let result = null;
        for (let i = compiledArgs.length - 3; i >= 1; i -= 2) {
            const match = compiledArgs[i];
            const output = compiledArgs[i + 1];
            result = `(${input} == ${match} ? ${output} : ${result || fallback})`;
        }
        return result;
    }),
    [Ops.Between]: createCompiler(
        ([value, min, max]) => `(${value} >= ${min} && ${value} <= ${max})`,
    ),
    [Ops.Interpolate]: createCompiler(([exponent, input, ...compiledArgs]) => {
        let result = '';
        for (let i = 0; i < compiledArgs.length - 2; i += 2) {
            const stop1 = compiledArgs[i];
            const output1 = result || compiledArgs[i + 1];
            const stop2 = compiledArgs[i + 2];
            const output2 = compiledArgs[i + 3];
            let ratio;
            if (exponent === numberToGlsl(1)) {
                ratio = `(${input} - ${stop1}) / (${stop2} - ${stop1})`;
            } else {
                ratio = `(pow(${exponent}, (${input} - ${stop1})) - 1.0) / (pow(${exponent}, (${stop2} - ${stop1})) - 1.0)`;
            }
            result = `mix(${output1}, ${output2}, clamp(${ratio}, 0.0, 1.0))`;
        }
        return result;
    }),
    [Ops.Case]: createCompiler((compiledArgs) => {
        const fallback = compiledArgs[compiledArgs.length - 1];
        let result = null;
        for (let i = compiledArgs.length - 3; i >= 0; i -= 2) {
            const condition = compiledArgs[i];
            const output = compiledArgs[i + 1];
            result = `(${condition} ? ${output} : ${result || fallback})`;
        }
        return result;
    }),
    [Ops.In]: createCompiler(([needle, ...haystack], context) => {
        const funcName = computeOperatorFunctionName('in', context);
        const tests = [];
        for (let i = 0; i < haystack.length; i += 1) {
            tests.push(`  if (inputValue == ${haystack[i]}) { return true; }`);
        }
        context.functions[funcName] = `bool ${funcName}(float inputValue) {
${tests.join('\n')}
  return false;
}`;
        return `${funcName}(${needle})`;
    }),
    [Ops.Array]: createCompiler(
        (args) => `vec${args.length}(${args.join(', ')})`,
    ),
    [Ops.Color]: createCompiler((compiledArgs) => {
        if (compiledArgs.length === 1) {
            //grayscale
            return `vec4(vec3(${compiledArgs[0]} / 255.0), 1.0)`;
        }
        if (compiledArgs.length === 2) {
            //grayscale with alpha
            return `(${compiledArgs[1]} * vec4(vec3(${compiledArgs[0]} / 255.0), 1.0))`;
        }
        const rgb = compiledArgs.slice(0, 3).map((color) => `${color} / 255.0`);
        if (compiledArgs.length === 3) {
            return `vec4(${rgb.join(', ')}, 1.0)`;
        }
        const alpha = compiledArgs[3];
        return `(${alpha} * vec4(${rgb.join(', ')}, 1.0))`;
    }),
    [Ops.Band]: createCompiler(([band, xOffset, yOffset], context) => {
        if (!(GET_BAND_VALUE_FUNC in context.functions)) {
            let ifBlocks = '';
            const bandCount = context.bandCount || 1;
            for (let i = 0; i < bandCount; i++) {
                const colorIndex = Math.floor(i / 4);
                let bandIndex = i % 4;
                if (i === bandCount - 1 && bandIndex === 1) {
                    // LUMINANCE_ALPHA - band 1 assigned to rgb and band 2 assigned to alpha
                    bandIndex = 3;
                }
                const textureName = `${Uniforms.TILE_TEXTURE_ARRAY}[${colorIndex}]`;
                ifBlocks += `  if (band == ${i + 1}.0) {
    return texture2D(${textureName}, v_textureCoord + vec2(dx, dy))[${bandIndex}];
  }
`;
            }

            context.functions[GET_BAND_VALUE_FUNC] =
                `float getBandValue(float band, float xOffset, float yOffset) {
  float dx = xOffset / ${Uniforms.TEXTURE_PIXEL_WIDTH};
  float dy = yOffset / ${Uniforms.TEXTURE_PIXEL_HEIGHT};
${ifBlocks}
}`;
        }

        return `${GET_BAND_VALUE_FUNC}(${band}, ${xOffset ?? '0.0'}, ${yOffset ?? '0.0'
            })`;
    }),
    [Ops.Palette]: (context, expression) => {
        const [index, ...colors] = expression.args;
        const numColors = colors.length;
        const palette = new Uint8Array(numColors * 4);
        for (let i = 0; i < colors.length; i++) {
            const parsedValue = /** @type {string | number[]} */ (
        /** @type {LiteralExpression} */ (colors[i]).value
            );
            const color = asArray(parsedValue);
            const offset = i * 4;
            palette[offset] = color[0];
            palette[offset + 1] = color[1];
            palette[offset + 2] = color[2];
            palette[offset + 3] = color[3] * 255;
        }
        if (!context.paletteTextures) {
            context.paletteTextures = [];
        }
        const paletteName = `${PALETTE_TEXTURE_ARRAY}[${context.paletteTextures.length}]`;
        const paletteTexture = new PaletteTexture(paletteName, palette);
        context.paletteTextures.push(paletteTexture);
        const compiledIndex = compile(index, NumberType, context);
        return `texture2D(${paletteName}, vec2((${compiledIndex} + 0.5) / ${numColors}.0, 0.5))`;
    },
    // TODO: unimplemented
    // Ops.Number
    // Ops.String
    // Ops.Coalesce
    // Ops.Concat
};

/**
 * @param {Expression} expression The expression.
 * @param returnType The expected return type.
 * @param {CompilationContext} context The compilation context.
 * @return {CompiledExpression} The compiled expression
 */
function compile(expression: Expression, returnType: number, context: CompilationContext): CompiledExpression {
    // operator
    if (expression instanceof CallExpression) {
        const compiler = compilers[expression.operator];
        if (compiler === undefined) {
            throw new Error(
                `No compiler defined for this operator: ${JSON.stringify(
                    expression.operator,
                )}`,
            );
        }
        return compiler(context, expression, returnType);
    }

    if ((expression.type & NumberType) > 0) {
        return numberToGlsl(/** @type */(expression.value));
    }

    if ((expression.type & BooleanType) > 0) {
        return expression.value.toString();
    }

    if ((expression.type & StringType) > 0) {
        return stringToGlsl(expression.value.toString());
    }

    if ((expression.type & ColorType) > 0) {
        return colorToGlsl(
      /** @type {number[] | string} */(expression.value),
        );
    }

    if ((expression.type & NumberArrayType) > 0) {
        return arrayToGlsl(/** @type {number[]} */(expression.value));
    }

    throw new Error(
        `Unexpected expression ${expression.value} (expected type ${typeName(
            returnType,
        )})`,
    );
}
