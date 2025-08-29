import React from 'react';
import { InputProps } from '../../types/qc.types';

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  step,
  onKeyPress,
  className = '',
  size = 'md',
}) => {
  const baseClasses = 'w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const combinedClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <div>
      {label && (
        <label className={`block font-medium text-gray-700 mb-2 ${labelSizeClasses[size]}`}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        onKeyPress={onKeyPress}
        className={combinedClasses}
      />
    </div>
  );
};

export default Input;