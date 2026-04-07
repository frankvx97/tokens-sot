import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';

export type ExportFormat = 'css' | 'sass' | 'tailwind' | 'tailwindv4' | 'stylus' | 'js' | 'json' | 'less';

interface FormatOption {
  value: ExportFormat;
  label: string;
  icon?: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'css', label: 'CSS' },
  { value: 'sass', label: 'Sass' },
  { value: 'tailwind', label: 'Tailwind v3' },
  { value: 'tailwindv4', label: 'Tailwind v4' },
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
  const selectedOption = FORMAT_OPTIONS.find((opt) => opt.value === value) || FORMAT_OPTIONS[1];

  return (
    <div className={className}>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as ExportFormat)}
      >
        <SelectTrigger className="w-40">
          <SelectValue>{selectedOption.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {FORMAT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
