/**
 * Configuration Modal for Export Settings
 */

import * as React from 'react';
import { X } from 'lucide-react';
import type { ExportOptions, TokenCasing, ColorFormat, DimensionUnit } from '@/shared/types';
import { useAppDispatch, useAppState } from '../../state/app-state';

interface ConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-sm font-medium text-slate-200">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

interface ToggleOption {
  label: string;
  value: string;
  description?: string;
}

interface ToggleGroupProps {
  label: string;
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
}

const ToggleGroup: React.FC<ToggleGroupProps> = ({ label, options, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-400">{label}</label>
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            value === option.value
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, description, checked, onChange }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 transition-colors hover:bg-slate-900">
    <div className="flex h-5 items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
      />
    </div>
    <div className="flex-1">
      <div className="text-sm font-medium text-slate-200">{label}</div>
      {description && <div className="mt-1 text-xs text-slate-500">{description}</div>}
    </div>
  </label>
);

export const ConfigureModal: React.FC<ConfigureModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const [localSettings, setLocalSettings] = React.useState<ExportOptions>(state.settings.exportOptions);

  // Update local settings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(state.settings.exportOptions);
    }
  }, [isOpen, state.settings.exportOptions]);

  if (!isOpen) return null;

  const handleSave = () => {
    dispatch({ type: 'UPDATE_EXPORT_OPTIONS', payload: localSettings });
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(state.settings.exportOptions);
    onClose();
  };

  const updateSetting = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const casingOptions: ToggleOption[] = [
    { label: 'camelCase', value: 'lowerCamelCase' },
    { label: 'PascalCase', value: 'PascalCase' },
    { label: 'kebab-case', value: 'kebab-case' },
    { label: 'snake_case', value: 'snake_case' },
    { label: 'UPPER_SNAKE', value: 'UPPER_SNAKE_CASE' }
  ];

  const colorOptions: ToggleOption[] = [
    { label: 'Hex', value: 'hex' },
    { label: 'RGB', value: 'rgb' },
    { label: 'HSL', value: 'hsl' }
  ];

  const unitOptions: ToggleOption[] = [
    { label: 'px', value: 'px' },
    { label: 'rem', value: 'rem' }
  ];

  const fileStrategyOptions: ToggleOption[] = [
    { label: 'Single File', value: 'single' },
    { label: 'Multiple Files', value: 'multiple' }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Export Configuration</h2>
          <button
            onClick={handleCancel}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Naming Convention */}
            <SettingsSection title="Naming Convention">
              <ToggleGroup
                label="Token Casing"
                options={casingOptions}
                value={localSettings.casing}
                onChange={(value) => updateSetting('casing', value as TokenCasing)}
              />
            </SettingsSection>

            {/* Color Format */}
            <SettingsSection title="Color Format">
              <ToggleGroup
                label="Output Format"
                options={colorOptions}
                value={localSettings.color}
                onChange={(value) => updateSetting('color', value as ColorFormat)}
              />
            </SettingsSection>

            {/* Unit Format */}
            <SettingsSection title="Unit Format">
              <ToggleGroup
                label="Dimension Units"
                options={unitOptions}
                value={localSettings.unit}
                onChange={(value) => updateSetting('unit', value as DimensionUnit)}
              />
            </SettingsSection>

            {/* Export Strategy */}
            <SettingsSection title="Export Strategy">
              <ToggleGroup
                label="File Organization"
                options={fileStrategyOptions}
                value={localSettings.exportFileStrategy}
                onChange={(value) => updateSetting('exportFileStrategy', value as 'single' | 'multiple')}
              />
            </SettingsSection>

            {/* Advanced Options */}
            <SettingsSection title="Advanced Options">
              <Checkbox
                label="Separate Modes into Files"
                description="Create separate files for each mode when using multiple file strategy"
                checked={localSettings.separateModes}
                onChange={(checked) => updateSetting('separateModes', checked)}
              />
              <Checkbox
                label="Ignore Aliases"
                description="Export resolved values instead of variable references"
                checked={localSettings.ignoreAliases}
                onChange={(checked) => updateSetting('ignoreAliases', checked)}
              />
            </SettingsSection>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
          <button
            onClick={handleCancel}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
};
