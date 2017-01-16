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
  const transformed = parsed.find(j.ImportDeclaration)

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
