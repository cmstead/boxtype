# Boxtype #

## The type-safe, (almost) thread-safe type boxing library ##

Boxtype is a library to box up values for safe use and transport.  It's quick and easy to create and use type boxes. It keeps tricky fingers off your enclosed data. All you need is a little signet and a little desire to keep your values safe!

### Installation ###

Just install it and you're ready to go!

```bash
npm i boxtype --save
```

### Setup ###

To use boxtype you'll need signet, which comes as a dependency of boxtype.  Just require the libraries, do a little setup and you're off to the races.

```
const signet = require('signet')();
const boxtype = require('boxtype')(signet);
```

### Inspiration ###

This library was born out of a conversation between [https - //github.com/cmstead](Chris Stead) and [https - //github.com/jason-kerney](Jason Kerney) contemplating the idea of types and type safety, while looking at this code - 

```
const cons = (a, b) => (x) => x ? a : b;
const car = list => list(true);
const cdr = list => list(false);
```

### API ###

Boxtype comes with a small, but action-packed API which supports boxing with TypedValue, Maybe, Either and Just.  Need something else? It's your world, build away!

- typeWith - `typeName:string => boxType`
- boxWith - `boxTypeName:string => valueType:?composite<string, type> => value:* => boxType`
- either - `type:composite<string, type>, defaultValue:* => * => Either<*>`
- just - `value:* => Just<() => value:*>`
- maybe - `type:composite<string, type> => value:* => Maybe<*>`
- none - `() => None` (None is actually the instance of 'none')
- register - `boxTypeName:string, baseType:[type] => boxTypeConstructor:function`
- some - `value:* => unBoxed:*`

All boxtype boxes -- except Either, Just, Maybe and None -- adhere to the following API:

- Value box: `transform:[variant<null, function>], unboxDepth:[int] => *` -- (Performs recursive unboxing, stops when reaching optional depth)
- toString - `() => typeAndValue:string`
- valueOf - `() => *` -- (Performs recursive unboxing)

