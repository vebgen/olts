

import { Transform } from "@olts/core/transform";

/**
 *
 */
export const WebGLWorkerMessageTypes = {
    GENERATE_POLYGON_BUFFERS: 'GENERATE_POLYGON_BUFFERS',
    GENERATE_POINT_BUFFERS: 'GENERATE_POINT_BUFFERS',
    GENERATE_LINE_STRING_BUFFERS: 'GENERATE_LINE_STRING_BUFFERS',
} as const;


/**
 * A type that represents all possible message types that the webgl worker can
 * send to the main thread.
 */
export type WebGLWorkerMessageType = typeof WebGLWorkerMessageTypes[
    keyof typeof WebGLWorkerMessageTypes
];


/**
 * This message will trigger the generation of a vertex and an index buffer
 * based on the given render instructions.
 *
 * When the buffers are generated, the worked will send a message of the same
 * type to the main thread, with the generated buffers in it.
 *
 * Note that any addition properties present in the message *will* be sent back
 * to the main thread.
 */
export interface WebGLWorkerGenerateBuffersMessage {
    /**
     * Message id; will be used both in request and response as a means of
     * identification
     */
    id: number;

    /**
     * Message type.
     */
    type: WebGLWorkerMessageType;

    /**
     * Render instructions raw binary buffer.
     */
    renderInstructions: ArrayBuffer;

    /**
     * Amount of hit detection + custom attributes count in the render
     * instructions.
     */
    customAttributesSize?: number;

    /**
     * Vertices array raw binary buffer (sent by the worker).
     */
    vertexBuffer?: ArrayBuffer;

    /**
     * Indices array raw binary buffer (sent by the worker).
     */
    indexBuffer?: ArrayBuffer;

    /**
     * Transformation matrix used to project the instructions coordinates.
     */
    renderInstructionsTransform?: Transform;
}
