/**
 * All known instructions.
 */
export const Instructions = {
    BEGIN_GEOMETRY: 0,
    BEGIN_PATH: 1,
    CIRCLE: 2,
    CLOSE_PATH: 3,
    CUSTOM: 4,
    DRAW_CHARS: 5,
    DRAW_IMAGE: 6,
    END_GEOMETRY: 7,
    FILL: 8,
    MOVE_TO_LINE_TO: 9,
    SET_FILL_STYLE: 10,
    SET_STROKE_STYLE: 11,
    STROKE: 12,
} as const;


/**
 * An instruction.
 */
export type Instruction = typeof Instructions[keyof typeof Instructions];


export const fillInstruction: Array<Instruction> = [Instructions.FILL];
export const strokeInstruction: Array<Instruction> = [Instructions.STROKE];
export const beginPathInstruction: Array<Instruction> = [
    Instructions.BEGIN_PATH
];
export const closePathInstruction: Array<Instruction> = [
    Instructions.CLOSE_PATH
];


export default Instruction;
