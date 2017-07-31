(function (moduleFactory) {
    let isNode = typeof module !== undefined && typeof module.exports !== undefined

    if (isNode) {
        module.exports = function (signet) {
            const matchlight = require('matchlight')(signet);
            return moduleFactory(signet, matchlight.match);
        }
    } else if (typeof signet === 'object' && typeof matchlight === 'object') {
        window.boxtype = moduleFactory(signet, matchlight.match);
    } else {
        throw new Error('The module boxtype requires Signet and Matchlight to run.');
    }

})(function (signet, match) {
    'use strict';

    let boxTypeRegistry = {};

    signet.subtype('function')('boxType', function (value) {
        return value.isBoxType();
    });

    signet.subtype('boxType')('None', (value) => value.boxType === 'None');
    signet.subtype('boxType')('Just', (value) => value.boxType === 'Just');
    signet.subtype('boxType')('Maybe{1}', (value, subtype) => {
        return value.boxType === 'Maybe'
            && (signet.isTypeOf(subtype[0])(value())
                || signet.isTypeOf('None')(value()));
    });

    signet.subtype('boxType')('Either{1}', (value, subtype) => {
        return value.boxType === 'Either'
            && signet.isTypeOf(subtype[0])(value());
    });

    const isArray = signet.isTypeOf('array');
    const isFunction = signet.isTypeOf('function');
    const isObjectInstance = signet.isTypeOf('composite<not<null>, object>');
    const isString = signet.isTypeOf('string');
    const isUndefined = signet.isTypeOf('undefined');

    function setProperty(boxFn, key, property) {
        Object.defineProperty(boxFn, key, {
            writeable: false,
            value: property
        });
    }

    function setGetter(boxFn, key, getter) {
        Object.defineProperty(boxFn, key, {
            get: getter
        });
    }

    function getGetter() {
        return function getter() {
            return match(this.typeTag, (matchCase, matchDefault) => {
                matchCase(isUndefined, () => this.valueType);
                matchDefault(() => this.typeTag);
            });
        }
    }

    function buildToString(boxFn) {
        return () => `[${boxFn.boxType} ${boxFn.currentType}](${boxFn().toString()})`
    }

    function setStandardMetadata(boxFn, boxType, valueType) {
        setProperty(boxFn, 'isBoxType', () => true);
        setProperty(boxFn, 'boxType', boxType);
        setProperty(boxFn, 'valueType', valueType);
        setGetter(boxFn, 'currentType', getGetter());

        return boxFn;
    }

    function setStandardFunctions(boxFn) {
        boxFn.toString = buildToString(boxFn);
        boxFn.valueOf = () => boxFn();

        return boxFn;
    }

    function setStandardProperties(boxType, typeName, valueType) {
        setStandardMetadata(boxType, typeName, valueType);
        return setStandardFunctions(boxType);

    }

    function buildEitherValue(type, justDefault, value) {
        return function () {
            return match(value, (matchCase, matchDefault, byType) => {
                matchCase(byType(type), (value) => just(value));
                matchDefault(() => justDefault);
            })();
        };
    }

    const none = signet.enforce(
        '() => None',
        function () {
            return none;
        }
    );

    setStandardMetadata(none, 'None');
    none.toString = () => 'None';
    none.valueOf = () => none;

    const just = signet.enforce(
        'value:* => Just<() => value:*>',
        function just(value) {
            function justValue() { return value; }
            return setStandardProperties(justValue, 'Just', typeof value);
        }
    );

    const maybe = signet.enforce(
        'type:composite<string, type> => value:* => Maybe<*>',
        function maybe(type) {
            return function (value) {
                const maybeValue = buildEitherValue(type, none, value);
                return setStandardProperties(maybeValue, 'Maybe', type);
            }
        }
    );

    const either = signet.enforce(
        'type:composite<string, type>, defaultValue:* => * => Either<*>',
        function either(type, defaultValue) {
            const justDefault = just(defaultValue);

            return function (value) {
                const eitherValue = buildEitherValue(type, justDefault, value);
                return setStandardProperties(eitherValue, 'Either', type);
            }
        }
    );

    const some = signet.enforce(
        'value:* => *',
        function some(value) {
            return match(value, (matchCase, matchDefault) => {
                matchCase(isUndefined, () => none);
                matchDefault(() => value);
            });
        }
    );

    function buildSignetTypeCheck() {
        return function (value, options) {
            const contentValue = value();
            return signet.isTypeOf(options[0])(contentValue);
        }
    }

    function register(boxTypeName) {
        const boxingFunction = boxWithType(boxTypeName);
        boxTypeRegistry[boxTypeName] = boxingFunction;
        signet.subtype('boxType')(boxTypeName, buildSignetTypeCheck());

        return boxingFunction;
    }

    const isType = signet.isTypeOf('type');

    function throwOnBadType(value, valueType) {
        if (isType(valueType) && !signet.isTypeOf(valueType)(value)) {
            throw new Error(`Cannot cast value "${value}" of type ${typeof value} to ${valueType}`);
        }
    }

    function shallowClone (obj) {
        const keys = Object.keys(obj);
        let container = isArray(obj) ? [] : {};

        return keys.reduce((result, key) => {
            result[key] = obj[key];
            return result;
        }, container);
    }

    function identity (a) {
        return a;
    }

    function boxValue(value, boxTypeName, valueType) {
        throwOnBadType(value, valueType);

        const cloneAction = isObjectInstance(value) ? shallowClone : identity;
        let safeValue = cloneAction(value);

        const valueTypeStr = match(valueType, (matchCase, matchDefault) => {
            matchCase(isString, valueType => valueType);
            matchDefault(() => typeof value);
        });

        function boxType(transform) {
            const returnValue = cloneAction(safeValue);
            const transformation = isFunction(transform) ? transform : identity;

            return transformation(returnValue);
        }

        return setStandardProperties(boxType, boxTypeName, valueTypeStr);
    }

    function boxWithType(boxTypeName) {
        return function (valueType) {
            return function (value) {
                return boxValue(value, boxTypeName, valueType);
            };
        };
    }

    const boxWith = signet.enforce(
        'boxTypeName:string => valueType:?composite<string, type> => value:* => *',
        function (boxType) {
            if(isUndefined(boxTypeRegistry[boxType])) {
                throw new Error (`'No box type "${boxType}" exists'`);
            }

            return boxTypeRegistry[boxType];
        }
    );

    register('TypedValue');

    function typeWith(typeName) {
        return boxWith('TypedValue')(typeName);
    }

    return {
        typeWith: typeWith,
        boxWith: boxWith,
        either: either,
        just: just,
        maybe: maybe,
        none: none,
        register: register,
        some: some
    };

});
