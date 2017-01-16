# fn-to-method-codeshift

## Initial code

`calc.js` exports single function that adds two numbers.

```js
// calc.js
module.exports = function add(a, b) { return a + b }
// index.js
const add = require('./calc')
console.log('2 + 3 =', add(2, 3))
// node index.js
// 2 + 3 = 5
```

## Transform setup

Let us initialize the transform that does not change the source
code yet.

```js
// transform.js
const j = require('jscodeshift')

function transform (file, api, options) {
  console.log('transforming', file.path)

  const parsed = j(file.source)
  const transformed = parsed

  const outputOptions = {
    quote: 'single'
  }
  return transformed.toSource(outputOptions)
}
module.exports = transform
```

We can add the script command to the `package.json` and the
dependency on [jscodeshift](https://github.com/facebook/jscodeshift#readme)

```json
{
  "scripts": {
    "test": "jscodeshift index.js -t transform.js --dry --print"
  },
  "devDependencies": {
    "jscodeshift": "0.3.30"
  }
}
```

We are running the transform in "dry" mode that will NOT overwrite the
source file `index.js`. It will also print the output source code for
now by `--print` option.

## Change `calc` API

Ket us change the API exported by the `calc.js` file. Instead of directly
exporting a single function, let us export an object with `add` property.
This allows us to add `sub`, `mul` and any other function in the future.

```js
// calc.js
module.exports = {
  add: function add(a, b) { return a + b }
}
```

Our module `calc.js` changed its external "public" API, thus this is a major
change according to [semantic versioning](http://semver.org/). Every existing
client will crash when trying to use the new version.

```
console.log('2 + 3 =', add(2, 3))
                       ^
TypeError: add is not a function
```

Let us create a code transform that will change any client from using the
exported function to use the exported "add" property.

```js
// existing client
const add = require('./calc')
// transformed client
const add = rewuire('./calc').add
```

## Input abstract syntax tree

We can print the abstract syntax tree of an example client `index.js` to see
the initial code. Let us remove all code from the `index.js` leaving only
the `const add = require('./calc')` line for simplicity. Let us also print
the parsed object inside the `transform.js`

```js
const parsed = j(file.source)
console.log(parsed)
```

Calling `npm test` produces the following

```
transforming index.js
Collection {
  _parent: undefined,
  __paths:
   [ NodePath {
       value: [Object],
       parentPath: null,
       name: null,
       __childCache: null } ],
  _types: [ 'File', 'Node', 'Printable' ] }
```

Ok, just printing the top level "NodePath" object is not good enough.
We really want to traverse all nodes in the tree and only print the
`require('./calc')` calls. Luckily, the parsed object implements "Collections"
methods, just like an Array. We can print all "CallExpression" nodes for
example. Each "NodePath" object has "value" property with actual parsed
values (without links to the parent and children nodes, these are inside
"NodePath" itself)

```js
const parsed = j(file.source)
  parsed.find(j.CallExpression)
    .forEach(function (path) {
      console.log(path.value)
    })
```

The above code finds a single node

```
transforming index.js
Node {
  type: 'CallExpression',
  start: 12,
  end: 29,
  loc:
   SourceLocation {
     start: Position { line: 1, column: 12 },
     end: Position { line: 1, column: 29 },
     lines: Lines {},
     indent: 0 },
  callee:
   Node {
     type: 'Identifier',
     start: 12,
     end: 19,
     loc: SourceLocation { start: [Object], end: [Object], lines: Lines {}, indent: 0 },
     name: 'require',
     typeAnnotation: null },
  arguments:
   [ Node {
       type: 'Literal',
       start: 20,
       end: 28,
       loc: [Object],
       value: './calc',
       rawValue: './calc',
       raw: '\'./calc\'',
       regex: null } ],
  trailingComments: null }
```

We are only interested in the call expressions `require('./calc')` thus
we can filter our node collection. Let us filter "NodePath" objects

```js
const isRequire = n =>
  n && n.callee && n.callee.name === 'require'
const isUnary = args =>
  Array.isArray(args) && args.length === 1
const isCalc = arg => arg.value === './calc'
const isRequireCalc = n =>
  isRequire(n) && isUnary(n.arguments) && isCalc(n.arguments[0])
function transform (file, api, options) {
  const parsed = j(file.source)
  parsed.find(j.CallExpression)
    .filter(path => isRequireCalc(path.value))
    .forEach(function (path) {
      console.log(path.value)
    })
}
```
This should produce the same list, but if we had other function calls in our
program, only the `require('./calc')` would be processed.

## Desired output

I found that the easiest way to transform one abstract syntax into another one
is to take the desired output and call the transform function on it,
printing all the nodes. In our case, let us just create a file `desired.js`
with simple `require('./calc').add` line.

Then I would see the created AST online at
[http://astexplorer.net/](http://astexplorer.net/).

File `index.js` with just `require('./calc')` source code has the following
tree.

```json
{
  "type": "Program",
  "start": 0,
  "end": 18,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 17,
      "expression": {
        "type": "CallExpression",
        "start": 0,
        "end": 17,
        "callee": {
          "type": "Identifier",
          "start": 0,
          "end": 7,
          "name": "require"
        },
        "arguments": [
          {
            "type": "Literal",
            "start": 8,
            "end": 16,
            "value": "./calc",
            "raw": "'./calc'"
          }
        ]
      }
    }
  ],
  "sourceType": "module"
}
```

Same file with `require('./calc').add` produces slightly more complex tree

```json
{
  "type": "Program",
  "start": 0,
  "end": 22,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 21,
      "expression": {
        "type": "MemberExpression",
        "start": 0,
        "end": 21,
        "object": {
          "type": "CallExpression",
          "start": 0,
          "end": 17,
          "callee": {
            "type": "Identifier",
            "start": 0,
            "end": 7,
            "name": "require"
          },
          "arguments": [
            {
              "type": "Literal",
              "start": 8,
              "end": 16,
              "value": "./calc",
              "raw": "'./calc'"
            }
          ]
        },
        "property": {
          "type": "Identifier",
          "start": 18,
          "end": 21,
          "name": "add"
        },
        "computed": false
      }
    }
  ],
  "sourceType": "module"
}
```

Thus we need to transform every `require('./calc')` "CallExpression" into
a "MemberExpression" with additional property "add".

## Transformation

We are going to replace each filtered call expression with a member expression.
We can tell the Collections api to replace the current syntax tree node with
new value using `replaceWith` method.

```js
parsed.find(j.CallExpression)
  .filter(path => isRequireCalc(path.value))
  .replaceWith(function (path) {
    // return new AST node
  })
```

`jscodeshift` includes helpful
[builder](https://github.com/facebook/jscodeshift#builders) functions that
match 1 to 1 the AST names, just in lowercase. Here is our transformation

```js
.replaceWith(function (path) {
  return j.memberExpression(
    path.value,
    j.identifier('add')
  )
})
```

Notice the trick - we are reusing the existing "CallExpression" in
`path.value` so we do not have to construct `require('./calc')` node again.
We just use it as the first argument in `j.memberExpression` which is the
"object".

The transformation prints the code result `require('./calc').add` which
matches what we need. Let us remove "--dry" parameter and save the output
file. The diff shows the change.

```diff
-const add = require('./calc')
+const add = require('./calc').add
 console.log('2 + 3 =', add(2, 3))
```

The transformed `index.js` now works with our new API.

```sh
node index.js
2 + 3 = 5
```
