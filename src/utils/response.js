'use strict';

function success(res, data, { message = null, meta = null, status = 200 } = {}) {
  const payload = { success: true, data };
  if (message) payload.message = message;
  if (meta) payload.meta = meta;
  if (res.locals.requestId) payload.requestId = res.locals.requestId;
  return res.status(status).json(payload);
}

function created(res, data, message = null) {
  return success(res, data, { message, status: 201 });
}

function noContent(res) {
  return res.status(204).end();
}

function paginated(res, rows, { total, page, limit }) {
  const totalPages = Math.ceil(total / limit);
  return success(res, rows, {
    meta: {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
}

module.exports = { success, created, noContent, paginated };
