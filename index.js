(function (moduleFactory) {
    let isNode = typeof module !== undefined && typeof module.exports !== undefined

    if (isNode) {
        module.exports = function (signet) {
            const registryFactory = require('./bin/registry');
            const matchlight = require('matchlight')(signet);
            return moduleFactory(signet, matchlight.match, registryFactory);
        }
    } else if (typeof signet === 'object' && typeof matchlight === 'object') {
        window.boxtype = moduleFactory(signet, matchlight.match, boxtypeRegistryFactory);
    } else {
        throw new Error('The module boxtype requires Signet and Matchlight to run.');
    }

})(function (signet, match, registryFactory) {
    'use strict';

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
    const isBoxType = signet.isTypeOf('boxType');
    // const isNone = signet.isTypeOf('None');
    const isUndefined = signet.isTypeOf('undefined');

    const setProperty = signet.enforce(
        'boxFn:function, key:string, property:* => undefined',

        function setProperty(boxFn, key, property) {
            Object.defineProperty(boxFn, key, {
                writeable: false,
                value: property
            });
        }
    );

    const setGetter = signet.enforce(
        'boxFn:function, key:string, property:* => undefined',

        function setGetter(boxFn, key, getter) {
            Object.defineProperty(boxFn, key, {
                get: getter
            });
        }
    );

    const getTypeGetter = signet.enforce(
        '() => * => string',

        function getTypeGetter() {
            return function typeGetter() {
                return match(this.typeTag, (matchCase, matchDefault) => {
                    matchCase(isUndefined, () => this.valueType);
                    matchDefault(() => this.typeTag);
                });
            }
        }
    );

    const buildToString = signet.enforce(
        'boxFn:function => () => string',

        function buildToString(boxFn) {
            return () => `[${boxFn.boxType} ${boxFn.currentType}](${boxFn().toString()})`
        }
    );

    const setStandardMetadata = signet.enforce(
        'boxFn:function, boxType:string, valueType:[string] => function',

        function setStandardMetadata(boxFn, boxType, valueType) {
            setProperty(boxFn, 'isBoxType', () => true);
            setProperty(boxFn, 'boxType', boxType);
            setProperty(boxFn, 'valueType', valueType);
            setGetter(boxFn, 'currentType', getTypeGetter());

            return boxFn;
        }
    );

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

    const some = signet.enforce(
        'value:* => unBoxed:*',

        function some(value) {
            return match(value, (matchCase, matchDefault) => {
                matchCase(isUndefined, () => none);
                matchCase(isBoxType, () => value());
                matchDefault(() => value);
            });
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

    const isType = signet.isTypeOf('type');

    function throwOnBadType(value, valueType) {
        if (isType(valueType) && !signet.isTypeOf(valueType)(value)) {
            throw new Error(`Cannot cast value "${value}" of type ${typeof value} to ${valueType}`);
        }
    }

    function shallowClone(obj) {
        const keys = Object.keys(obj);
        let container = isArray(obj) ? [] : {};

        return keys.reduce((result, key) => {
            result[key] = obj[key];
            return result;
        }, container);
    }

    const registry = registryFactory(
        signet,
        match,
        setStandardProperties,
        throwOnBadType,
        shallowClone,
        setProperty
    );

    const boxWith = signet.enforce(
        'boxTypeName:string => valueType:?composite<string, type> => value:* => boxType',

        function (boxType) {
            const boxTypeConstructor = registry.get(boxType);

            if (isUndefined(boxTypeConstructor)) {
                throw new Error(`'No box type "${boxType}" exists'`);
            }

            return boxTypeConstructor;
        }
    );

    registry.register('TypedValue');

    const typeWith = signet.sign(
        'typeName:string => boxType',

        function typeWith(typeName) {
            return boxWith('TypedValue')(typeName);
        }
    );

    return {
        typeWith: typeWith,
        boxWith: boxWith,
        either: either,
        just: just,
        maybe: maybe,
        none: none,
        register: registry.register,
        some: some
    };

});
