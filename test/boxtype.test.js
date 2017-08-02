'use strict';

if (typeof exploreFunction !== 'function') {
    require('quokka-signet-explorer').before();
}

const assert = require('chai').assert;
// const prettyJson = require('./test-utils/prettyJson');
// const sinon = require('sinon');


describe('boxtype', function () {
    require('./test-utils/approvals-config');

    var boxtype;
    var signet;

    beforeEach(function () {
        signet = require('signet')();
        boxtype = require('../index.js')(signet);
    });

    describe('some', function () {

        it('should return the passed value when called', function () {
            const result = boxtype.some(5);
            assert.equal(result, 5);
        });

        it('should unbox and return a value when value is boxed', function () {
            const myValue = boxtype.typeWith('int')(99);
            const result = boxtype.some(myValue);
            assert.strictEqual(result, 99);
        });

        it('should return none when called with undefined', function () {
            const result = boxtype.some();
            assert.equal(result, boxtype.none);
        });

    });

    describe('none', function () {

        it('should return none when called', function () {
            const result = boxtype.none();
            assert.equal(result, boxtype.none);
        });

        it('should return None when calling toString', function () {
            assert.equal(boxtype.none.toString(), 'None');
        });

        it('should return the value from valueOf', function () {
            assert.equal(boxtype.none.valueOf(), boxtype.none);
        });

    });

    describe('just', function () {

        it('should box value in just', function () {
            const result = boxtype.just(99);
            assert.equal(result(), 99);
        });

        it('should return Just<string>(foo) when calling toString', function () {
            const justFoo = boxtype.just('foo');
            assert.equal(justFoo.toString(), '[Just string](foo)');
        });

        it('should return the value from valueOf', function () {
            const justBar = boxtype.just('bar');
            assert.equal(justBar.valueOf(), 'bar');
        });

    });

    describe('maybe', function () {

        it('should return boxed value', function () {
            const maybe5 = boxtype.maybe('int')(5);
            assert.equal(maybe5(), 5);
        });

        it('should return none on undefined', function () {
            const maybe5 = boxtype.maybe('int')();
            assert.equal(maybe5(), boxtype.none);
        });

    });

    describe('either', function () {

        it('should return correct value as boxed value', function () {
            const either1or10 = boxtype.either('int', 1)(10);
            assert.equal(either1or10(), 10);
        });

        it('should return default value when original value is incorrect', function () {
            const either1or10 = boxtype.either('int', 1)(false);
            assert.equal(either1or10(), 1);
        });

    });

    describe('register', function () {

        it('should register a boxtype for use', function () {
            boxtype.register('Container');

            const boxedValue = boxtype.boxWith('Container')('int')(99);
            const typeCheck = signet.isTypeOf('Container<int>')(boxedValue);

            assert.equal(boxedValue.toString(), '[Container int](99)');
            assert.equal(typeCheck, true);
        });

        it('should return a boxing function', function () {
            const boxInContainer = boxtype.register('Container');

            const boxedValue = boxInContainer('int')(99);
            const typeCheck = signet.isTypeOf('Container<int>')(boxedValue);

            assert.equal(boxedValue.toString(), '[Container int](99)');
            assert.equal(typeCheck, true);
        });

        it('should allow for defining a type check at registration', function () {
            const boxInTypedContainer = boxtype.register('TypedContainer', 'composite<^array, object>');

            assert.throws(boxInTypedContainer('object').bind(null, []));
        });

    });

    describe('boxWith', function () {

        it('should box a value when no type is provided', function () {
            boxtype.register('Container');

            const boxedValue = boxtype.boxWith('Container')()(99.5);
            const typeCheck = signet.isTypeOf('Container<number>')(boxedValue);

            assert.equal(boxedValue.toString(), '[Container number](99.5)');
            assert.equal(typeCheck, true);
        });

        it('should throw an error no box type exists', function () {
            const message = 'No box type "BadBox" exists';
            assert.throws(boxtype.boxWith.bind(null, 'BadBox'), message);
        });

        it('should throw an error when trying to box the wrong type', function () {
            boxtype.register('Container');

            const boxPassedValue = boxtype.boxWith('Container')('int');

            const message = 'Cannot cast value "foo" of type string to int';
            assert.throws(boxPassedValue.bind(null, 'foo'), message);
        });

    });

    describe('typeWith', function () {

        it('should box value in a generic type wrapper', function () {
            const originalValue = [1, 2, 3, 4];
            const myValue = boxtype.typeWith('array<int>')(originalValue);
            const typeOk = signet.isTypeOf('TypedValue<array<int>>')(myValue);

            assert.equal(myValue.toString(), '[TypedValue array<int>](1,2,3,4)');
            assert.equal(myValue.valueOf().toString(), originalValue.toString());
            assert.equal(typeOk, true);
        });

    });

    describe('boxing and unboxing', function () {

        it('should shallow clone objects on boxing', function () {
            let originalData = { foo: 'bar' };
            const myValue = boxtype.boxWith('TypedValue')('object')(originalData);

            originalData.baz = 'quux';
            const myReturnedValue = myValue.valueOf();

            assert.equal(myReturnedValue.baz, undefined);
        });

        it('should shallow clone objects on unboxing', function () {
            const myValue = boxtype.boxWith('TypedValue')('object')({ foo: 'bar' });
            let firstUnbox = myValue();
            firstUnbox.baz = 'quux';

            const secondUnbox = myValue();

            assert.equal(secondUnbox.baz, undefined);
        });

        it('should perform a transformation function when provided to unboxing action', function () {
            function transform (value) {
                let newObj = {};
                newObj[value.foo] = 'foo';

                return newObj;
            }

            const myValue = boxtype.typeWith('object')({ foo: 'bar' });
            const myResult = myValue(transform);

            assert.equal(myResult.bar, 'foo');
            assert.equal(myResult.foo, undefined);
        });

        it('should recursively unbox values', function () {
            const myBoxedValue = boxtype.typeWith('int')(10);
            const myDoublyBoxedValue = boxtype.typeWith('TypedValue<int>')(myBoxedValue);

            assert.strictEqual(myDoublyBoxedValue(), 10);
        });

        it('should recursively unbox values to specified depth', function () {
            const myBoxedValue = boxtype.typeWith('int')(10);
            const myDoublyBoxedValue = boxtype.typeWith('TypedValue<int>')(myBoxedValue);
            const myUnboxedValue = myDoublyBoxedValue(null, 1);

            assert.equal(signet.isTypeOf('TypedValue<int>')(myUnboxedValue), true);
        });

    });

});

if (typeof global.runQuokkaMochaBdd === 'function') {
    runQuokkaMochaBdd();
}
