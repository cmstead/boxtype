(function (registryFactory) {
    let isNode = typeof module !== undefined && typeof module.exports !== undefined

    if (isNode) {
        module.exports = registryFactory;
    } else if (typeof signet === 'object' && typeof matchlight === 'object') {
        window.boxtypeRegistryFactory = registryFactory;
    } else {
        throw new Error('The module boxtype requires Signet and Matchlight to run.');
    }


})(function (
    signet,
    match,
    setStandardProperties,
    throwOnBadType,
    shallowClone,
    setProperty) {
    'use strict';

    let boxTypeRegistry = {};

    const isBoxType = signet.isTypeOf('boxType');
    const isNone = signet.isTypeOf('None');
    const isFunction = signet.isTypeOf('function');
    const isObjectInstance = signet.isTypeOf('composite<not<null>, object>');
    const isString = signet.isTypeOf('string');
    const isType = signet.isTypeOf('type');
    const isUndefined = signet.isTypeOf('undefined');

    const buildSignetTypeCheck = signet.sign(
        '() => value:*, options:[array<string>] => boolean',

        function buildSignetTypeCheck() {
            return function (value, options) {
                const contentValue = value();
                return signet.isTypeOf(options[0])(contentValue);
            }
        }
    );

    const identity = signet.sign(
        'a:* => *',

        function identity(a) {
            return a;
        }
    );

    const buildBoxType = signet.enforce(
        'cloneAction:function, safeValue:* ' +
        '=> transform:[variant<null, function>], unboxDepth:[int] ' +
        '=> *',

        (cloneAction, boxedValue) => (transform, unboxDepth) => {
            const unboxTo = isUndefined(unboxDepth) ? Number.MAX_SAFE_INTEGER : unboxDepth;
            const returnValue = match(boxedValue, (matchCase, matchDefault) => {
                matchCase(isNone, (value) => value);
                matchCase(
                    (value) => isBoxType(value) && unboxTo > 1,
                    (value) => cloneAction(value(null, unboxTo - 1)));
                matchDefault((value) => cloneAction(value));
            });

            const transformation = isFunction(transform) ? transform : identity;

            return transformation(returnValue);
        }
    );

    const getValueTypeString = signet.sign(
        'value:*, valueType:[string] => string',

        function getValueTypeString(value, valueType) {
            return match(valueType, (matchCase, matchDefault) => {
                matchCase(isString, valueType => valueType);
                matchDefault(() => typeof value);
            });
        }
    );

    function isVariant(typeStr) {
        return /(^|\:)\s*variant/.test(typeStr);
    }

    const boxValue = signet.sign(
        'value:*, boxTypeName:string, valueType:[composite<type, string>] => function',

        function boxValue(value, boxTypeName, valueType) {
            throwOnBadType(value, valueType);

            const valueTypeStr = getValueTypeString(value, valueType);
            const cloneAction = isObjectInstance(value) ? shallowClone : identity;

            const safeValue = cloneAction(value);
            const boxType = buildBoxType(cloneAction, safeValue);

            if (isVariant(valueType)) {
                const typeTag = signet.whichVariantType(valueType)(value);
                setProperty(boxType, 'typeTag', typeTag);
            }

            return setStandardProperties(boxType, boxTypeName, valueTypeStr);
        }
    );

    const boxWithType = signet.sign(
        'boxTypeName:string, boxBaseType:[type] => valueType:[composite<type, string>] => value:* => function',

        function boxWithType(boxTypeName, baseType) {
            const boxBaseType = isType(baseType) ? signet.isTypeOf(baseType) : () => true;

            return function (valueType) {
                return function (value) {
                    if (!boxBaseType(value)) {
                        throw new Error(`Cannot cast value of type ${typeof value} to ${boxTypeName}`);
                    }
                    return boxValue(value, boxTypeName, valueType);
                };
            };
        }
    );

    const register = signet.enforce(
        'boxTypeName:string, baseType:[type] => boxTypeConstructor:function',

        function register(boxTypeName, baseType) {
            const boxingFunction = boxWithType(boxTypeName, baseType);

            boxTypeRegistry[boxTypeName] = boxingFunction;
            signet.subtype('boxType')(boxTypeName, buildSignetTypeCheck());

            return boxingFunction;
        }
    );

    const get = signet.enforce(
        'boxType:string => ?function',

        function get(boxType) {
            return boxTypeRegistry[boxType];
        }
    );

    return {
        get: get,
        register: register
    };

});
