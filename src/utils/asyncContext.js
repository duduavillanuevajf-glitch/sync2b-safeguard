'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function run(context, callback) {
  return storage.run(context, callback);
}

function getContext() {
  return storage.getStore() || {};
}

function get(key) {
  return (storage.getStore() || {})[key];
}

function set(key, value) {
  const store = storage.getStore();
  if (store) store[key] = value;
}

module.exports = { run, getContext, get, set };
