import { HttpError } from '../utils/http.js';

export function validate(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      return next(new HttpError(400, issues[0]?.message || 'Please check the highlighted fields.', { issues }));
    }
    req.validated = parsed.data;
    return next();
  };
}
