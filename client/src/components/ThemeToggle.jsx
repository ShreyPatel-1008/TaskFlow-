import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { preference, setTheme } = useTheme();

  const options = [
    { value: 'light', icon: Sun, label: 'Light mode' },
    { value: 'dark', icon: Moon, label: 'Dark mode' },
    { value: 'system', icon: Monitor, label: 'System preference' },
  ];

  return (
    <div className="theme-toggle-group">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          className={`theme-toggle-option${preference === value ? ' active' : ''}`}
          onClick={() => setTheme(value)}
          title={label}
          aria-label={label}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
