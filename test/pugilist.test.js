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

    beforeEach(function () {
        const signet = require('signet')();
        boxtype = require('../index.js')(signet);
    });

    describe('some', function () {

        it('should return the passed value when called', function () {
            const result = boxtype.some(5);
            assert.equal(result, 5);
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
            assert.equal(justFoo.toString(), 'Just<string>(foo)');
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

        });

    });

});

if (typeof global.runQuokkaMochaBdd === 'function') {
    runQuokkaMochaBdd();
}
