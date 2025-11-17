import * as React from 'react';
import { ChevronDown } from 'lucide-react';

export type ExportFormat = 'css' | 'sass' | 'tailwind' | 'stylus' | 'js' | 'json' | 'less';

interface FormatOption {
  value: ExportFormat;
  label: string;
  icon?: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'css', label: 'CSS' },
  { value: 'sass', label: 'Sass' },
  { value: 'tailwind', label: 'Tailwind' },
  { value: 'stylus', label: 'Stylus' },
  { value: 'js', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'less', label: 'Less' }
];

interface FormatSelectorProps {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
  className?: string;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = FORMAT_OPTIONS.find((opt) => opt.value === value) || FORMAT_OPTIONS[1]; // Default to Sass

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (format: ExportFormat) => {
    onChange(format);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-slate-800 ${
                option.value === value
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-300'
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
