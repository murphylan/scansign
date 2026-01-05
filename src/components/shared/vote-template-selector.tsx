'use client';

import { cn } from '@/lib/utils';
import { VoteTemplate, VOTE_TEMPLATES, VoteTemplateConfig } from '@/types/vote';
import { Check } from 'lucide-react';

interface VoteTemplateSelectorProps {
  value: VoteTemplate;
  onChange: (template: VoteTemplate) => void;
}

export function VoteTemplateSelector({ value, onChange }: VoteTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {VOTE_TEMPLATES.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          selected={value === template.id}
          onSelect={() => onChange(template.id)}
        />
      ))}
    </div>
  );
}

interface TemplateCardProps {
  template: VoteTemplateConfig;
  selected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200',
        'hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card hover:border-primary/50 hover:bg-secondary/30'
      )}
    >
      {/* 选中标记 */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      {/* 图标 */}
      <div className="text-4xl mb-3">{template.icon}</div>

      {/* 名称 */}
      <h3 className={cn(
        'font-semibold text-lg mb-1',
        selected ? 'text-primary' : 'text-foreground'
      )}>
        {template.name}
      </h3>

      {/* 描述 */}
      <p className="text-sm text-muted-foreground text-center">
        {template.description}
      </p>

      {/* 特性标签 */}
      <div className="flex gap-2 mt-3 flex-wrap justify-center">
        {template.hasImage && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            支持图片
          </span>
        )}
        {template.supportMultiple && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            单选/多选
          </span>
        )}
        {!template.supportMultiple && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            仅单选
          </span>
        )}
      </div>
    </button>
  );
}
