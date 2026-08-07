export const validateODValue = (value: string): { isValid: boolean; error?: string } => {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid numeric OD value' };
  }

  if (numValue < 0) {
    return { isValid: false, error: 'OD value cannot be negative' };
  }

  if (numValue > 10) {
    return { isValid: false, error: 'OD value seems unusually high (>10)' };
  }

  return { isValid: true };
};
