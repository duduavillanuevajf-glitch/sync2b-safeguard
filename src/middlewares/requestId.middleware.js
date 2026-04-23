'use strict';

const { v4: uuid } = require('uuid');
const context = require('../utils/asyncContext');

const HEADER = process.env.CORRELATION_ID_HEADER || 'X-Request-ID';

function requestId(req, res, next) {
  const id = req.headers[HEADER.toLowerCase()] || uuid();
  req.requestId = id;
  res.locals.requestId = id;
  res.setHeader(HEADER, id);

  context.run({ requestId: id }, next);
}

module.exports = requestId;
