import { extend } from './array';

/**
 * When using {@link makeChildAppender} or {@link makeSimpleNodeFactory}, the
 * top `objectStack` item needs to have this structure.
 */
export interface NodeStackItem {
    node: Element;
}


/**
 * A function that can parse an XML node.
 */
export type Parser = (elem: Element, objectStack: any[]) => void;


/**
 * A function that can read values.
 *
 * @param node Node.
 * @param objectStack Object stack.
 */
export type MakeArrayExtender<T> = (
    this: T,
    node: Node,
    objectStack: Array<any>
) => (Array<T> | undefined);


/**
 *
 */
export type Serializer = (arg1: Element, arg2: any, arg3: any[]) => void;


/**
 *
 */
export const XML_SCHEMA_INSTANCE_URI: string =
    'http://www.w3.org/2001/XMLSchema-instance';


/**
 * Creates a new element with the passed namespace URI and qualified name
 * inside the provided document.
 *
 * @param namespaceURI Namespace URI.
 * @param qualifiedName Qualified name.
 * @return Newly created node.
 */
export function createElementNS(
    namespaceURI: string, qualifiedName: string
): Element {
    return getDocument().createElementNS(namespaceURI, qualifiedName);
}


/**
 * Recursively grab all text content of child nodes into a single string.
 *
 * @param node Node.
 * @param normalizeWhitespace Normalize whitespace: remove all line breaks.
 * @return All text content.
 * @api
 */
export function getAllTextContent(
    node: Node, normalizeWhitespace: boolean
): string {
    return getAllTextContent_(node, normalizeWhitespace, []).join('');
}


/**
 * Recursively grab all text content of child nodes into a single string.
 *
 * @param node Node.
 * @param normalizeWhitespace Normalize whitespace: remove all line breaks.
 * @param accumulator Accumulator.
 * @return Accumulator.
 * @private
 */
export function getAllTextContent_(
    node: Node, normalizeWhitespace: boolean, accumulator: string[]
): string[] {
    if (
        node.nodeType == Node.CDATA_SECTION_NODE ||
        node.nodeType == Node.TEXT_NODE
    ) {
        if (normalizeWhitespace) {
            accumulator.push(
                String(node.nodeValue).replace(/(\r\n|\r|\n)/g, '')
            );
        } else {
            accumulator.push(node.nodeValue!);
        }
    } else {
        let n;
        for (n = node.firstChild; n; n = n.nextSibling) {
            getAllTextContent_(n, normalizeWhitespace, accumulator);
        }
    }
    return accumulator;
}


/**
 * Check if the object is a document.
 *
 * @param object Object.
 * @return Is a document.
 */
export function isDocument(object: any): boolean {
    return 'documentElement' in object;
}


/**
 * Get the attribute value of a node within a namespace.
 *
 * @param node Node.
 * @param namespaceURI Namespace URI.
 * @param name Attribute name.
 * @return Value
 */
export function getAttributeNS(
    node: Element, namespaceURI: string | null, name: string
): string {
    return node.getAttributeNS(namespaceURI, name) || '';
}


/**
 * Parse an XML string to an XML Document.
 *
 * @param xml XML string to parse.
 * @return Document.
 * @api
 */
export function parse(xml: string): Document {
    return new DOMParser().parseFromString(xml, 'application/xml');
}


/**
 * Make an array extender function for extending the array at the top of the
 * object stack.
 *
 * @param valueReader Value reader.
 * @param thisArg The object to use as `this` in `valueReader`.
 * @return Parser.
 */
export function makeArrayExtender<T>(
    valueReader: MakeArrayExtender<T>,
    thisArg?: T
): Parser {
    return (
        function (this: T, node: Node, objectStack: Array<any>) {
            const value = valueReader.call(
                thisArg !== undefined ? thisArg : this,
                node,
                objectStack,
            );
            if (value !== undefined) {
                const array = objectStack[objectStack.length - 1];
                extend(array, value);
            }
        }
    );
}

/**
 * A function that can read values.
 *
 * @param node Node.
 * @param objectStack Object stack.
 */
export type MakeArrayPusher<T> = (
    this: T,
    node: Element,
    objectStack: any[]
) => any;


/**
 * Make an array pusher function for pushing to the array at the top of the
 * object stack.
 *
 * @param valueReader Value reader.
 * @param thisArg The object to use as `this` in `valueReader`.
 * @return Parser.
 */
export function makeArrayPusher<T>(
    valueReader: MakeArrayPusher<T>,
    thisArg?: T
): Parser {
    return (
        function (this: T, node: Element, objectStack: Array<any>) {
            const value = valueReader.call(
                thisArg !== undefined ? thisArg : this,
                node,
                objectStack,
            );
            if (value !== undefined) {
                const array = /** @type {Array<*>} */ (
                    objectStack[objectStack.length - 1]
                );
                array.push(value);
            }
        }
    );
}


/**
 * A function that can read values.
 *
 * @param node Node.
 * @param objectStack Object stack.
 */
export type MakeReplacer<T> = (
    this: T,
    node: Node,
    objectStack: any[]
) => any;


/**
 * Make an object stack replacer function for replacing the object at the
 * top of the stack.
 *
 * @param valueReader Value reader.
 * @param thisArg The object to use as `this` in `valueReader`.
 * @return Parser.
 */
export function makeReplacer<T>(
    valueReader: MakeReplacer<T>,
    thisArg?: T
): Parser {
    return (
        function (this: T, node: Node, objectStack: Array<any>) {
            const value = valueReader.call(
                thisArg !== undefined ? thisArg : this,
                node,
                objectStack,
            );
            if (value !== undefined) {
                objectStack[objectStack.length - 1] = value;
            }
        }
    );
}


/**
 * A function that can read values.
 *
 * @param node Node.
 * @param objectStack Object stack.
 */
export type MakeObjectPropertyPusher<T> = (
    this: T,
    node: Element,
    objectStack: any[]
) => any;


/**
 * Make an object property pusher function for adding a property to the
 * object at the top of the stack.
 *
 * @param valueReader Value reader.
 * @param property Property.
 * @param thisArg The object to use as `this` in `valueReader`.
 * @return Parser.
 */
export function makeObjectPropertyPusher<T>(
    valueReader: MakeObjectPropertyPusher<T>,
    property?: string,
    thisArg?: T
): Parser {
    return (
        function (this: T, node: Element, objectStack: Array<any>) {
            const value = valueReader.call(
                thisArg !== undefined ? thisArg : this,
                node,
                objectStack,
            );
            if (value !== undefined) {
                const object = /** @type {!Object} */ (
                    objectStack[objectStack.length - 1]
                );
                const name = property !== undefined ? property : node.localName;
                let array: string[];
                if (name in object) {
                    array = object[name];
                } else {
                    array = [];
                    object[name] = array;
                }
                array.push(value);
            }
        }
    );
}


/**
 * A function that can read values.
 *
 * @param node Node.
 * @param objectStack Object stack.
 */
export type MakeObjectPropertySetter<T> = (
    this: T,
    node: Element,
    objectStack: any[]
) => any;


/**
 * Make an object property setter function.
 *
 * @param valueReader Value reader.
 * @param property Property.
 * @param thisArg The object to use as `this` in `valueReader`.
 * @return Parser.
 */
export function makeObjectPropertySetter<T>(
    valueReader: MakeObjectPropertySetter<T>,
    property?: string,
    thisArg?: T
): Parser {
    return (
        function (this: T, node: Element, objectStack: Array<any>) {
            const value = valueReader.call(
                thisArg !== undefined ? thisArg : this,
                node,
                objectStack,
            );
            if (value !== undefined) {
                const object = /** @type {!Object} */ (
                    objectStack[objectStack.length - 1]
                );
                const name = property !== undefined ? property : node.localName;
                object[name] = value;
            }
        }
    );
}


/**
 * A function that creates nodes.
 *
 * @param node Node.
 * @param value Value.
 * @param objectStack Object stack.
 */
export type MakeChildAppender<T, V> = (
    this: T,
    node: Node,
    value: V,
    objectStack: any[]
) => void;


/**
 * Create a serializer that appends nodes written by its `nodeWriter` to its
 * designated parent.
 *
 * The parent is the `node` of the {@link NodeStackItem} at
 * the top of the `objectStack`.
 *
 * @param nodeWriter Node writer.
 * @param thisArg The object to use as `this` in `nodeWriter`.
 * @return Serializer.
 */
export function makeChildAppender<T, V>(
    nodeWriter: MakeChildAppender<T, V>,
    thisArg: T
): Serializer {
    return function (this: T, node, value, objectStack) {
        nodeWriter.call(
            thisArg !== undefined ? thisArg : this,
            node,
            value,
            objectStack,
        );
        const parent: NodeStackItem = objectStack[objectStack.length - 1];
        const parentNode = parent.node;
        parentNode.appendChild(node);
    };
}


/**
 * A function that creates nodes.
 *
 * @param node Node.
 * @param value Value.
 * @param objectStack Object stack.
 */
export type MakeArraySerializer<T, V> = (
    this: T,
    node: Element,
    value: V,
    objectStack: any[]
) => void;


/**
 * Create a serializer that calls the provided `nodeWriter` from
 * {@link serialize}.
 *
 * This can be used by the parent writer to have the `nodeWriter` called with an
 * array of values when the `nodeWriter` was designed to serialize a single
 * item. An example would be a LineString geometry writer, which could be reused
 * for writing MultiLineString geometries.
 *
 * @param nodeWriter Node writer.
 * @param thisArg The object to use as `this` in `nodeWriter`.
 * @return Serializer.
 */
export function makeArraySerializer<T, V>(
    this: T,
    nodeWriter: MakeArraySerializer<T, V>,
    thisArg: T
): Serializer {
    let serializersNS: Record<string, Record<string, Serializer>>;
    let nodeFactory: NodeFactory<T>;
    return function (node: Element, value: any, objectStack: any[]) {
        if (serializersNS === undefined) {
            serializersNS = {};
            const serializers: Record<string, Serializer> = {};
            serializers[node.localName] = nodeWriter;
            serializersNS[node.namespaceURI!] = serializers;
            nodeFactory = makeSimpleNodeFactory(node.localName);
        }
        (serialize as any)(serializersNS, nodeFactory, value, objectStack);
    };
}


/**
 * A function that creates nodes.
 *
 * @param value Value.
 * @param objectStack Object stack.
 * @param newNodeName Node name.
 * @return Node.
 */
export type MakeSimpleNodeFactory = (
    value: any,
    objectStack: any[],
    newNodeName?: string
) => (Node | undefined);


/**
 * Create a node factory which can use the `keys` passed to
 * {@link serialize} or {@link pushSerializeAndPop} as node names,
 * or a fixed node name.
 *
 * The namespace of the created nodes can either be fixed,
 * or the parent namespace will be used.
 *
 * @param fixedNodeName Fixed node name which will be used for all
 *     created nodes. If not provided, the 3rd argument to the resulting node
 *     factory needs to be provided and will be the nodeName.
 * @param fixedNamespaceURI Fixed namespace URI which will be used for
 *     all created nodes. If not provided, the namespace of the parent node will
 *     be used.
 * @return Node factory.
 */
export function makeSimpleNodeFactory(
    fixedNodeName?: string,
    fixedNamespaceURI?: string
): MakeSimpleNodeFactory {
    return (
        function (value: any, objectStack: any[], newNodeName?: string): Node {
            const context: NodeStackItem = (
                objectStack[objectStack.length - 1]
            );
            const node = context.node;
            let nodeName: string | undefined = fixedNodeName;
            if (nodeName === undefined) {
                nodeName = newNodeName;
            }

            const namespaceURI = fixedNamespaceURI !== undefined
                ? fixedNamespaceURI
                : node.namespaceURI;
            return createElementNS(namespaceURI!, nodeName!);
        }
    );
}


/**
 * A node factory that creates a node using the parent's `namespaceURI` and the
 * `nodeName` passed by {@link serialize} or {@link pushSerializeAndPop} to the
 * node factory.
 */
export const OBJECT_PROPERTY_NODE_FACTORY: MakeSimpleNodeFactory =
    makeSimpleNodeFactory();


/**
 * Create an array of `values` to be used with {@link serialize} or
 * {@link pushSerializeAndPop}, where `orderedKeys` has to be provided as
 * `key` argument.
 *
 * @param object Key-value pairs for the sequence. Keys can
 *     be a subset of the `orderedKeys`.
 * @param orderedKeys Keys in the order of the sequence.
 * @return Values in the order of the sequence. The resulting array
 *     has the same length as the `orderedKeys` array. Values that are not
 *     present in `object` will be `undefined` in the resulting array.
 */
export function makeSequence(
    object: Record<string, any>,
    orderedKeys: string[]
): any[] {
    const length = orderedKeys.length;
    const sequence = new Array(length);
    for (let i = 0; i < length; ++i) {
        sequence[i] = object[orderedKeys[i]];
    }
    return sequence;
}


/**
 * Create a namespaced structure, using the same values for each namespace.
 * This can be used as a starting point for versioned parsers, when only a few
 * values are version specific.
 *
 * @param namespaceURIs Namespace URIs.
 * @param structure Structure.
 * @param structureNS Namespaced structure to add to.
 * @return Namespaced structure.
 */
export function makeStructureNS<T>(
    namespaceURIs: string[],
    structure: T,
    structureNS?: Record<string, T>
): Record<string, T> {
    structureNS = structureNS !== undefined ? structureNS : {};
    let i, ii;
    for (i = 0, ii = namespaceURIs.length; i < ii; ++i) {
        structureNS[namespaceURIs[i]] = structure;
    }
    return structureNS;
}


/**
 * Parse a node using the parsers and object stack.
 * @param parsersNS Parsers by namespace.
 * @param node Node.
 * @param objectStack Object stack.
 * @param thisArg The object to use as `this`.
 */
export function parseNode(
    parsersNS: Record<string, Record<string, Parser>>,
    node: Element,
    objectStack: any[],
    thisArg?: any
) {
    let n;
    for (n = node.firstElementChild; n; n = n.nextElementSibling) {
        const parsers = parsersNS[n.namespaceURI!];
        if (parsers !== undefined) {
            const parser = parsers[n.localName];
            if (parser !== undefined) {
                parser.call(thisArg, n, objectStack);
            }
        }
    }
}


/**
 * Push an object on top of the stack, parse and return the popped object.
 *
 * @param object Object.
 * @param parsersNS Parsers by namespace.
 * @param node Node.
 * @param objectStack Object stack.
 * @param The object to use as `this`.
 * @return Object.
 */
export function pushParseAndPop<T>(
    object: T,
    parsersNS: Record<string, Record<string, Parser>>,
    node: Element,
    objectStack: any[],
    thisArg?: any
): T {
    objectStack.push(object);
    parseNode(parsersNS, node, objectStack, thisArg);
    return objectStack.pop();
}


/**
 * The `nodeFactory` creates the node whose namespace and name will be used to
 * choose a node writer from `serializersNS`.
 *
 * This separation allows us to decide what kind of node to create, depending on
 * the value we want to serialize. An example for this would be different
 * geometry writers based on the geometry type.
 */
export type NodeFactory<T> = (
    this: T, arg1: any, arg2: any[], arg3?: string
) => (Node | undefined)


/**
 * Walk through an array of `values` and call a serializer for each value.
 *
 * @param serializersNS Namespaced serializers.
 * @param nodeFactory Node factory.
 * @param values Values to serialize. An example would be an array
 *     of {@link Feature} instances.
 * @param objectStack Node stack.
 * @param keys Keys of the `values`. Will be passed to the
 *   `nodeFactory`. This is used for serializing object literals where the
 *   node name relates to the property key. The array length of `keys` has to
 *   match the length of `values`. For serializing a sequence, `keys`
 *   determines the order of the sequence.
 * @param thisArg The object to use as `this` for the node factory and
 *   serializers.
 */
export function serialize<T>(
    this: T,
    serializersNS: Record<string, Record<string, Serializer>>,
    nodeFactory: NodeFactory<T>,
    values: any[],
    objectStack: any[],
    keys?: string[],
    thisArg?: T,
) {
    const length = (keys !== undefined ? keys : values).length;
    let value, node: Element;
    for (let i = 0; i < length; ++i) {
        value = values[i];
        if (value !== undefined) {
            node = nodeFactory.call(
                thisArg !== undefined ? thisArg : this,
                value,
                objectStack,
                keys !== undefined ? keys[i] : undefined,
            ) as Element;
            if (node !== undefined) {
                serializersNS[node.namespaceURI!][node.localName].call(
                    thisArg,
                    node,
                    value,
                    objectStack,
                );
            }
        }
    }
}


/**
 * Push, serialize and pop.
 *
 * @param object Object.
 * @param serializersNS Namespaced serializers.
 * @param nodeFactory Node factory.
 * @param values Values to serialize. An example would be an array
 *   of {@link Feature} instances.
 * @param objectStack Node stack.
 * @param keys Keys of the `values`. Will be passed to the
 *     `nodeFactory`. This is used for serializing object literals where the
 *     node name relates to the property key. The array length of `keys` has
 *     to match the length of `values`. For serializing a sequence, `keys`
 *     determines the order of the sequence.
 * @param thisArg The object to use as `this` for the node factory and
 *     serializers.
 * @return Object.
 */
export function pushSerializeAndPop<O, T>(
    this: T,
    object: O,
    serializersNS: Record<string, Record<string, Serializer>>,
    nodeFactory: NodeFactory<T>,
    values: any[],
    objectStack: any[],
    keys?: string[],
    thisArg?: T,
): O | undefined {
    objectStack.push(object);
    (serialize as any)(
        serializersNS, nodeFactory, values, objectStack, keys, thisArg
    );
    return objectStack.pop();
}


let xmlSerializer_: XMLSerializer | undefined = undefined;


/**
 * Register a XMLSerializer. Can be used  to inject a XMLSerializer
 * where there is no globally available implementation.
 *
 * @param xmlSerializer A XMLSerializer.
 * @api
 */
export function registerXMLSerializer(xmlSerializer: XMLSerializer) {
    xmlSerializer_ = xmlSerializer;
}


/**
 * @return The XMLSerializer.
 */
export function getXMLSerializer(): XMLSerializer {
    if (xmlSerializer_ === undefined && typeof XMLSerializer !== 'undefined') {
        xmlSerializer_ = new XMLSerializer();
    }
    return xmlSerializer_!;
}


let document_: Document | undefined = undefined;


/**
 * Register a Document to use when creating nodes for XML serializations.
 *
 * Can be used to inject a Document where there is no globally available
 * implementation.
 *
 * @param document A Document.
 * @api
 */
export function registerDocument(document: Document) {
    document_ = document;
}


/**
 * Get a document that should be used when creating nodes for XML
 * serializations.
 *
 * @return The document.
 */
export function getDocument(): Document {
    if (document_ === undefined && typeof document !== 'undefined') {
        document_ = document.implementation.createDocument('', '', null);
    }
    return document_!;
}
