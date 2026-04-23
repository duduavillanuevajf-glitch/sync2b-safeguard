'use strict';

const { ValidationError } = require('../utils/errors');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return next(new ValidationError('Dados inválidos', details));
    }

    req[property] = value;
    next();
  };
}

module.exports = { validate };
