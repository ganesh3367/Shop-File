import { Router } from 'express';

// Express 4 doesn't catch rejected promises from async handlers; forward them to the error handler.
const wrap = (fn) => (fn.length >= 4 ? fn : (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next));

/** A Router whose handlers and middleware may be async functions. */
export function asyncRouter() {
  const router = Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'use']) {
    const original = router[method].bind(router);
    router[method] = (...args) => original(...args.map((a) => (typeof a === 'function' ? wrap(a) : a)));
  }
  return router;
}
