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

    // let boxTypeRegistry = {};

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
        return () => `${boxFn.boxType}<${boxFn.currentType}>(${boxFn().toString()})`
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


    return {
        either: either,
        just: just,
        maybe: maybe,
        none: none,
        some: some
    };

});
