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
