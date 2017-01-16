const j = require('jscodeshift')

const isRequire = n =>
  n && n.callee && n.callee.name === 'require'
const isUnary = args =>
  Array.isArray(args) && args.length === 1
const isCalc = arg => arg.value === './calc'
const isRequireCalc = n =>
  isRequire(n) && isUnary(n.arguments) && isCalc(n.arguments[0])

function transform (file, api, options) {
  console.log('transforming', file.path)

  const parsed = j(file.source)
  parsed.find(j.CallExpression)
    .filter(path => isRequireCalc(path.value))
    .forEach(function (path) {
      console.log(path.value)
    })

  const transformed = parsed

  const outputOptions = {
    quote: 'single'
  }
  return transformed.toSource(outputOptions)
}

module.exports = transform
