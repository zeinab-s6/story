export function validateFeedbackInput(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['بدنه درخواست باید یک شیء JSON باشد.'] };
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push('امتیاز باید عدد صحیح بین ۱ تا ۵ باشد.');
  }

  let note = null;
  if (body.note !== undefined && body.note !== null && body.note !== '') {
    if (typeof body.note !== 'string') {
      errors.push('یادداشت باید متن باشد.');
    } else {
      note = body.note.trim().slice(0, 500);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { rating, note },
  };
}

export default validateFeedbackInput;
