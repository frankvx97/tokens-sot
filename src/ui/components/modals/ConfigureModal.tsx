/**
 * Configuration Modal for Export Settings
 */

import * as React from 'react';
import type { ExportOptions, TokenCasing, ColorFormat, DimensionUnit, TypographyFormat } from '@/shared/types';
import type { NormalizedToken } from '@/shared/types';
import { cn } from '@/ui/utils/cn';
import { useAppDispatch, useAppState } from '../../state/app-state';
import { getSelectedTokens } from '../../state/selectors';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Label } from '../ui/label';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

interface ConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The currently selected export format from the format dropdown */
  activeFormat?: string;
  /** Callback to sync format changes back to the main view */
  onFormatChange?: (format: string) => void;
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
}

interface OptionGroupProps {
  label: string;
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
}

const OptionGroup: React.FC<OptionGroupProps> = ({ label, options, value, onChange }) => (
  <div className="space-y-2">
    <Label className="text-xs text-slate-400">{label}</Label>
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue == null) return;
        onChange(nextValue);
      }}
      className={cn(
        'grid gap-2 rounded-lg bg-slate-900/60 p-1',
        options.length === 2 ? 'grid-cols-2' :
        options.length <= 3 ? 'grid-cols-3' :
        'grid-cols-4'
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          tone="muted"
          className="h-9 border-slate-700 bg-slate-900/40 text-xs text-slate-200 hover:bg-slate-800/60 data-[state=on]:border-accent data-[state=on]:bg-accent/20 data-[state=on]:text-slate-50 sm:text-sm"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  </div>
);

interface RadioCardsGroupProps {
  label: string;
  name: string;
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
}

const RadioCardsGroup: React.FC<RadioCardsGroupProps> = ({ label, name, options, value, onChange }) => (
  <fieldset className="space-y-2">
    <Label className="text-xs text-slate-400">{label}</Label>
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'flex h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors',
              isSelected
                ? 'border-accent bg-accent/20 text-slate-50'
                : 'border-slate-700 bg-slate-900/40 text-slate-200 hover:bg-slate-800/60'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  </fieldset>
);

interface CheckboxRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CheckboxRow: React.FC<CheckboxRowProps> = ({ label, description, checked, onChange }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 transition-colors hover:bg-slate-900">
    <div className="pt-0.5">
      <Checkbox
        checked={checked}
        onCheckedChange={(nextChecked) => {
          if (nextChecked === 'indeterminate') {
            return;
          }
          onChange(nextChecked);
        }}
      />
    </div>
    <div className="flex-1">
      <div className="text-sm font-medium text-slate-200">{label}</div>
      {description && <div className="mt-1 text-xs text-slate-500">{description}</div>}
    </div>
  </label>
);

export const ConfigureModal: React.FC<ConfigureModalProps> = ({ isOpen, onClose, activeFormat, onFormatChange }) => {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const [localSettings, setLocalSettings] = React.useState<ExportOptions>(state.settings.exportOptions);

  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(state.settings.exportOptions);
    }
  }, [isOpen, state.settings.exportOptions]);

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

  // Extract unique font families from selected typography tokens
  const uniqueFontFamilies = React.useMemo(() => {
    const tokens = getSelectedTokens(state);
    const families = new Set<string>();
    tokens.forEach((token: NormalizedToken) => {
      if (token.kind === 'typography') {
        token.modes.forEach((mode) => {
          if (mode.value?.type === 'typography') {
            families.add(mode.value.value.fontFamily);
          }
        });
      }
    });
    return Array.from(families).sort();
  }, [state]);

  // Body/paragraph typography tokens available for the body-baseline picker.
  // Matches against Figma group path (e.g. "body", "paragraph", "paragraphs").
  const bodyTokenOptions = React.useMemo(() => {
    const tokens = getSelectedTokens(state);
    return tokens
      .filter(
        (token: NormalizedToken) =>
          token.kind === 'typography' &&
          (token.groupPath ?? []).some((g) => /^(body|paragraphs?)$/i.test(g))
      )
      .map((token: NormalizedToken) => ({
        id: token.id,
        label: [...(token.groupPath ?? []), token.name].join(' / ')
      }));
  }, [state]);

  const updateFontFallback = (family: string, fallback: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      fontFallbacks: {
        ...(prev.fontFallbacks ?? {}),
        [family]: fallback
      }
    }));
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

  const formatOptions: ToggleOption[] = [
    { label: 'CSS', value: 'css' },
    { label: 'Sass', value: 'sass' },
    { label: 'TW v3', value: 'tailwind' },
    { label: 'TW v4', value: 'tailwindv4' },
    { label: 'Less', value: 'less' },
    { label: 'Stylus', value: 'stylus' },
    { label: 'JS', value: 'js' },
    { label: 'JSON', value: 'json' },
  ];

  const fileStrategyOptions: ToggleOption[] = [
    { label: 'Single File', value: 'single' },
    { label: 'Multiple Files', value: 'multiple' }
  ];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
        }
      }}
    >
      <DialogContent className="max-w-2xl rounded-xl border-slate-800 bg-slate-950 p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-800 px-6 py-4">
          <DialogTitle>Export Configuration</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure naming, formatting, and export structure for generated token files.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <SettingsSection title="Output Format">
              <OptionGroup
                label="Language"
                options={formatOptions}
                value={activeFormat ?? 'css'}
                onChange={(value) => onFormatChange?.(value)}
              />
            </SettingsSection>

            <SettingsSection title="Naming Convention">
              <RadioCardsGroup
                label="Token Casing"
                name="token-casing"
                options={casingOptions}
                value={localSettings.casing}
                onChange={(value) => updateSetting('casing', value as TokenCasing)}
              />
            </SettingsSection>

            <SettingsSection title="Color Format">
              <OptionGroup
                label="Output Format"
                options={colorOptions}
                value={localSettings.color}
                onChange={(value) => updateSetting('color', value as ColorFormat)}
              />
            </SettingsSection>

            <SettingsSection title="Unit Format">
              <OptionGroup
                label="Dimension Units"
                options={unitOptions}
                value={localSettings.unit}
                onChange={(value) => updateSetting('unit', value as DimensionUnit)}
              />
            </SettingsSection>

            {/* Typography Format toggle — only for Sass/Less */}
            {(activeFormat === 'sass' || activeFormat === 'less') && (
              <SettingsSection title="Typography">
                <OptionGroup
                  label="Typography Format"
                  options={[
                    { label: 'Default', value: 'default' },
                    { label: 'Mixins', value: 'mixins' },
                  ]}
                  value={localSettings.typographyFormat ?? 'default'}
                  onChange={(value) => updateSetting('typographyFormat', value as TypographyFormat)}
                />
              </SettingsSection>
            )}

            {/* CSS Typography format toggle */}
            {activeFormat === 'css' && (
              <SettingsSection title="Typography">
                <OptionGroup
                  label="Typography Format"
                  options={[
                    { label: 'Classes', value: 'classes' },
                    { label: 'Custom Properties', value: 'properties' },
                  ]}
                  value={localSettings.cssTypographyFormat ?? 'classes'}
                  onChange={(value) => updateSetting('cssTypographyFormat', value as 'classes' | 'properties')}
                />
              </SettingsSection>
            )}

            {/* CSS HTML element defaults */}
            {activeFormat === 'css' && (
              <SettingsSection title="HTML Element Defaults">
                <CheckboxRow
                  label="Include body baseline"
                  description="Emits a body { ... } rule using a selected body/paragraph token."
                  checked={localSettings.cssIncludeBodyBaseline ?? false}
                  onChange={(checked) => updateSetting('cssIncludeBodyBaseline', checked)}
                />
                {localSettings.cssIncludeBodyBaseline && (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                    <span className="min-w-[100px] shrink-0 text-sm font-medium text-slate-200">Body token</span>
                    <select
                      value={localSettings.cssBodyBaselineTokenId ?? ''}
                      onChange={(e) => updateSetting('cssBodyBaselineTokenId', e.target.value || undefined)}
                      className="flex-1 rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-200 focus:border-accent focus:outline-none"
                    >
                      <option value="">Select a token…</option>
                      {bodyTokenOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {localSettings.cssIncludeBodyBaseline && bodyTokenOptions.length === 0 && (
                  <div className="px-3 text-xs text-slate-500">
                    No body/paragraph typography tokens in the current selection. Organize typography styles under a group named “body” or “paragraph” in Figma.
                  </div>
                )}
                <CheckboxRow
                  label="Include h1–h6 element defaults"
                  description="Maps heading tokens (group “headings”) to h1…h6 by font-size rank."
                  checked={localSettings.cssIncludeHeadingDefaults ?? false}
                  onChange={(checked) => updateSetting('cssIncludeHeadingDefaults', checked)}
                />
                <CheckboxRow
                  label="Add text-wrap: balance to headings"
                  description="Applies text-wrap: balance to heading utility classes and h1–h6 rules."
                  checked={localSettings.cssHeadingTextWrapBalance ?? false}
                  onChange={(checked) => updateSetting('cssHeadingTextWrapBalance', checked)}
                />
              </SettingsSection>
            )}

            {/* JSON-specific options */}
            {activeFormat === 'json' && (
              <SettingsSection title="JSON Options">
                <CheckboxRow
                  label="Use DTCG format"
                  description="Export tokens using the Design Token Community Group standard (W3C)"
                  checked={localSettings.useDTCG ?? false}
                  onChange={(checked) => updateSetting('useDTCG', checked)}
                />
              </SettingsSection>
            )}

            <SettingsSection title="Export Strategy">
              <OptionGroup
                label="File Organization"
                options={fileStrategyOptions}
                value={localSettings.exportFileStrategy}
                onChange={(value) => updateSetting('exportFileStrategy', value as 'single' | 'multiple')}
              />
            </SettingsSection>

            <SettingsSection title="Advanced Options">
              <CheckboxRow
                label="Separate Modes into Files"
                description="Create separate files for each mode when using multiple file strategy"
                checked={localSettings.separateModes}
                onChange={(checked) => updateSetting('separateModes', checked)}
              />
              <CheckboxRow
                label="Include Top-Level Name"
                description="Prefix token names with their collection or style type."
                checked={localSettings.includeTopLevelName}
                onChange={(checked) => updateSetting('includeTopLevelName', checked)}
              />
              <CheckboxRow
                label="Ignore Aliases"
                description="Export resolved values instead of variable references"
                checked={localSettings.ignoreAliases}
                onChange={(checked) => updateSetting('ignoreAliases', checked)}
              />
            </SettingsSection>

            {/* Font Fallbacks */}
            {uniqueFontFamilies.length > 0 && (
              <SettingsSection title="Font Fallbacks">
                <div className="space-y-2">
                  {uniqueFontFamilies.map((family) => {
                    const isMonoLike = /mono|code|consolas/i.test(family);
                    const placeholder = isMonoLike
                      ? 'ui-monospace, monospace'
                      : 'system-ui, sans-serif';
                    return (
                      <div key={family} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                        <span className="min-w-[100px] shrink-0 text-sm font-medium text-slate-200">{family}</span>
                        <input
                          type="text"
                          value={localSettings.fontFallbacks?.[family] ?? ''}
                          onChange={(e) => updateFontFallback(family, e.target.value)}
                          placeholder={placeholder}
                          className="flex-1 rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </SettingsSection>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-800 px-6 py-4">
          <Button onClick={handleCancel} variant="outline" type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} type="button">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
