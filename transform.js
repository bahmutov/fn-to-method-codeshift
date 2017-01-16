const j = require('jscodeshift')

function transform (file, api, options) {
  console.log('transforming', file.path)

  const parsed = j(file.source)
  parsed.find(j.CallExpression)
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
