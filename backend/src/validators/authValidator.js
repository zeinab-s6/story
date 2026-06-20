export function validateAuthInput(body, mode) {
  const errors = [];
  const email = body?.email?.trim().toLowerCase() || '';
  const password = body?.password || '';
  const displayName = body?.displayName?.trim() || '';

  if (!email) {
    errors.push('ایمیل الزامی است.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('فرمت ایمیل معتبر نیست.');
  }

  if (!password) {
    errors.push('رمز عبور الزامی است.');
  } else if (password.length < 6) {
    errors.push('رمز عبور باید حداقل ۶ کاراکتر باشد.');
  }

  if (mode === 'register') {
    if (!displayName) {
      errors.push('نام نمایشی الزامی است.');
    } else if (displayName.length > 60) {
      errors.push('نام نمایشی خیلی طولانی است.');
    }
  }

  if (errors.length) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { email, password, displayName: displayName || email.split('@')[0] },
  };
}
