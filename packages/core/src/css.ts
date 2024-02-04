
/**
 * Properties for a CSS font.
 */
export interface FontParameters {
    /**
     * Style.
     */
    style: string;

    /**
     * Variant.
     */
    variant: string;

    /**
     * Weight.
     */
    weight: string;

    /**
     * Size.
     */
    size: string;

    /**
     * Line height.
     */
    lineHeight: string;

    /**
     * Font family as provided in the string.
     */
    family: string;

    /**
     * Font families (the value of `family` split into tokens).
     */
    families: string[];
}


/**
 * The CSS class for hidden feature.
 */
export const CLASS_HIDDEN: string = 'ol-hidden';


/**
 * The CSS class that we'll give the DOM elements to have them selectable.
 */
export const CLASS_SELECTABLE: string = 'ol-selectable';


/**
 * The CSS class that we'll give the DOM elements to have them unselectable.
 */
export const CLASS_UNSELECTABLE: string = 'ol-unselectable';


/**
 * The CSS class for unsupported feature.
 */
export const CLASS_UNSUPPORTED: string = 'ol-unsupported';


/**
 * The CSS class for controls.
 */
export const CLASS_CONTROL: string = 'ol-control';


/**
 * The CSS class that we'll give the DOM elements that are collapsed, i.e.
 * to those elements which usually can be expanded.
 */
export const CLASS_COLLAPSED: string = 'ol-collapsed';


/**
 * The regular expression for parsing any css font.
 *
 * @example
 * ```js
 * const parts = rx.exec(str);
 * const fontStyle   = parts[1] || 'normal';
 * const fontVariant = parts[2] || 'normal';
 * const fontWeight  = parts[3] || 'normal';
 * const fontSize    = parts[4];
 * const lineHeight  = parts[5];
 * const fontFamily  = parts[6];
 * ```
 * @see https://stackoverflow.com/questions/10135697/regex-to-parse-any-css-font
 */
const fontRegEx = new RegExp(
    [
        '^\\s*(?=(?:(?:[-a-z]+\\s*){0,2}(italic|oblique))?)',
        '(?=(?:(?:[-a-z]+\\s*){0,2}(small-caps))?)',
        '(?=(?:(?:[-a-z]+\\s*){0,2}(bold(?:er)?|lighter|[1-9]00 ))?)',
        '(?:(?:normal|\\1|\\2|\\3)\\s*){0,3}((?:xx?-)?',
        '(?:small|large)|medium|smaller|larger|[\\.\\d]+',
        '(?:\\%|in|[cem]m|ex|p[ctx]))',
        '(?:\\s*\\/\\s*(normal|[\\.\\d]+(?:\\%|in|[cem]m|ex|p[ctx])?))',
        '?\\s*([-,\\"\\\'\\sa-z]+?)\\s*$',
    ].join(''),
    'i',
);


/**
 * The index of the matches in the font regex.
 * @see https://stackoverflow.com/questions/10135697/regex-to-parse-any-css-font
 */
const fontRegExMatchIndex = [
    'style',
    'variant',
    'weight',
    'size',
    'lineHeight',
    'family',
];


/**
 * Get the list of font families from a font spec.
 *
 * Note that this doesn't work for font families that have commas in them.
 * Also note that the default size is `1.2em`.
 *
 * @param fontSpec The CSS font property.
 * @return The font parameters (or null if the input spec is invalid).
 * @see https://stackoverflow.com/questions/10135697/regex-to-parse-any-css-font
 */
export function getFontParameters(fontSpec: string): FontParameters | null {
    const match = fontSpec.match(fontRegEx);
    if (!match) {
        return null;
    }
    const style: Partial<FontParameters> = {
        lineHeight: 'normal',
        size: '1.2em',
        style: 'normal',
        weight: 'normal',
        variant: 'normal',
        family: '',
    };
    for (let i = 0, ii = fontRegExMatchIndex.length; i < ii; ++i) {
        const value = match[i + 1];
        if (value !== undefined) {
            style[
                fontRegExMatchIndex[i] as keyof FontParameters
            ] = value as (string & string[]);
        }
    }
    style.families = style.family!.split(/,\s?/);
    return style as FontParameters;
};
