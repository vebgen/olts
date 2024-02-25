import { Color } from "@olts/core/color";


// These are re-defined here to avoid circular dependencies between
// packages. Should be used only in the style package.
//
// See packages/expressions/src/expression.ts
export type ExpressionValue = number[] | Color | string | number | boolean;
export type LiteralValue = boolean | number | string | number[];
export type EncodedExpression = LiteralValue | ExpressionValue[];
