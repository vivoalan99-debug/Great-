import React, { useState, useEffect, useRef } from 'react';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
  formatType?: 'text' | 'number';
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({ 
  value: initialValue, 
  onChange, 
  debounce = 600, 
  formatType = 'text',
  className,
  ...props 
}) => {
  const [value, setValue] = useState<string | number>(initialValue);
  const isMounted = useRef(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!isMounted.current) {
        isMounted.current = true;
        return;
    }

    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (formatType === 'number') {
          const val = e.target.value;
          const num = val === '' ? 0 : parseFloat(val);
          setValue(isNaN(num) ? 0 : num);
      } else {
          setValue(e.target.value);
      }
  };

  // Ensure there's always a base style if className is missing, though usually it is passed.
  const finalClass = className || "w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <input
      {...props}
      className={finalClass}
      value={value}
      onChange={handleChange}
    />
  );
};