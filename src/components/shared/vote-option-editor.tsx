'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { VoteOption, VoteTemplate } from '@/types/vote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Trash2,
  GripVertical,
  Upload,
  X,
  Image as ImageIcon,
  User,
} from 'lucide-react';

interface VoteOptionEditorProps {
  options: VoteOption[];
  onChange: (options: VoteOption[]) => void;
  template: VoteTemplate;
  minOptions?: number;
  maxOptions?: number;
}

export function VoteOptionEditor({
  options,
  onChange,
  template,
  minOptions = 2,
  maxOptions = 20,
}: VoteOptionEditorProps) {
  const hasImage = template === 'image' || template === 'candidate' || template === 'versus';
  const isVersus = template === 'versus';
  const isCandidate = template === 'candidate';

  const addOption = () => {
    if (options.length >= maxOptions) return;
    onChange([
      ...options,
      {
        id: crypto.randomUUID(),
        title: '',
        count: 0,
      },
    ]);
  };

  const removeOption = (id: string) => {
    if (options.length <= minOptions) return;
    onChange(options.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, updates: Partial<VoteOption>) => {
    onChange(options.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  // PK对决模式
  if (isVersus) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {options.slice(0, 2).map((option, index) => (
            <VersusOptionCard
              key={option.id}
              option={option}
              index={index}
              onChange={(updates) => updateOption(option.id, updates)}
            />
          ))}
        </div>
        <div className="text-center">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-lg font-bold">
            ⚔️ VS ⚔️
          </span>
        </div>
      </div>
    );
  }

  // 选手模式 - 卡片网格布局
  if (isCandidate) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {options.map((option, index) => (
            <CandidateOptionCard
              key={option.id}
              option={option}
              index={index}
              onChange={(updates) => updateOption(option.id, updates)}
              onRemove={() => removeOption(option.id)}
              canRemove={options.length > minOptions}
            />
          ))}
        </div>
        {options.length < maxOptions && (
          <Button
            type="button"
            variant="outline"
            onClick={addOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加选手
          </Button>
        )}
      </div>
    );
  }

  // 图文模式 - 列表布局
  if (hasImage) {
    return (
      <div className="space-y-4">
        {options.map((option, index) => (
          <ImageOptionCard
            key={option.id}
            option={option}
            index={index}
            onChange={(updates) => updateOption(option.id, updates)}
            onRemove={() => removeOption(option.id)}
            canRemove={options.length > minOptions}
          />
        ))}
        {options.length < maxOptions && (
          <Button
            type="button"
            variant="outline"
            onClick={addOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加选项
          </Button>
        )}
      </div>
    );
  }

  // 简单模式 - 文字列表
  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <div key={option.id} className="flex items-center gap-2">
          <div className="text-muted-foreground cursor-grab">
            <GripVertical className="h-5 w-5" />
          </div>
          <span className="w-6 text-muted-foreground text-sm">{index + 1}.</span>
          <Input
            placeholder={`选项 ${index + 1}`}
            value={option.title}
            onChange={(e) => updateOption(option.id, { title: e.target.value })}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeOption(option.id)}
            disabled={options.length <= minOptions}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {options.length < maxOptions && (
        <Button
          type="button"
          variant="outline"
          onClick={addOption}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加选项
        </Button>
      )}
    </div>
  );
}

// PK对决选项卡片
interface VersusOptionCardProps {
  option: VoteOption;
  index: number;
  onChange: (updates: Partial<VoteOption>) => void;
}

function VersusOptionCard({ option, index, onChange }: VersusOptionCardProps) {
  const colors = [
    'from-red-500 to-orange-500',
    'from-blue-500 to-cyan-500',
  ];

  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden bg-gradient-to-br p-1',
      colors[index] || colors[0]
    )}>
      <div className="bg-card rounded-lg p-4 space-y-4">
        <ImageUploader
          value={option.image}
          onChange={(image) => onChange({ image })}
          placeholder={index === 0 ? '选手A' : '选手B'}
          aspectRatio="square"
        />
        <Input
          placeholder={index === 0 ? '选手A名称' : '选手B名称'}
          value={option.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="text-center font-semibold"
        />
        <Input
          placeholder="描述（可选）"
          value={option.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="text-sm"
        />
      </div>
    </div>
  );
}

// 选手卡片
interface CandidateOptionCardProps {
  option: VoteOption;
  index: number;
  onChange: (updates: Partial<VoteOption>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function CandidateOptionCard({
  option,
  index,
  onChange,
  onRemove,
  canRemove,
}: CandidateOptionCardProps) {
  return (
    <div className="relative group rounded-xl border bg-card overflow-hidden">
      {/* 删除按钮 */}
      {canRemove && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onRemove}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* 序号 */}
      <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center text-xs font-bold">
        {index + 1}
      </div>

      {/* 头像区域 */}
      <ImageUploader
        value={option.image}
        onChange={(image) => onChange({ image })}
        placeholder="选手照片"
        aspectRatio="square"
        className="border-b"
      />

      {/* 信息区域 */}
      <div className="p-3 space-y-2">
        <Input
          placeholder="选手姓名"
          value={option.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="text-center font-medium"
        />
        <Input
          placeholder="简介（可选）"
          value={option.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="text-xs h-8"
        />
      </div>
    </div>
  );
}

// 图文选项卡片
interface ImageOptionCardProps {
  option: VoteOption;
  index: number;
  onChange: (updates: Partial<VoteOption>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function ImageOptionCard({
  option,
  index,
  onChange,
  onRemove,
  canRemove,
}: ImageOptionCardProps) {
  return (
    <div className="flex gap-4 p-4 rounded-xl border bg-card group">
      {/* 序号和拖拽 */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-muted-foreground cursor-grab">
          <GripVertical className="h-5 w-5" />
        </div>
        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {index + 1}
        </span>
      </div>

      {/* 图片上传 */}
      <div className="w-24 h-24 flex-shrink-0">
        <ImageUploader
          value={option.image}
          onChange={(image) => onChange({ image })}
          placeholder="图片"
          aspectRatio="square"
          size="sm"
        />
      </div>

      {/* 信息输入 */}
      <div className="flex-1 space-y-2">
        <Input
          placeholder={`选项 ${index + 1} 标题`}
          value={option.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="font-medium"
        />
        <Input
          placeholder="描述（可选）"
          value={option.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="text-sm"
        />
      </div>

      {/* 删除按钮 */}
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="self-start text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// 通用图片上传组件
interface ImageUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  placeholder?: string;
  aspectRatio?: 'square' | '16:9' | '4:3';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function ImageUploader({
  value,
  onChange,
  placeholder = '上传图片',
  aspectRatio = 'square',
  size = 'md',
  className,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const aspectClasses = {
    square: 'aspect-square',
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
  };

  const sizeClasses = {
    sm: 'min-h-20',
    md: 'min-h-32',
    lg: 'min-h-48',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    try {
      // 使用 base64
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target?.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (value) {
    return (
      <div
        className={cn(
          'relative bg-cover bg-center rounded-lg overflow-hidden group/img',
          aspectClasses[aspectRatio],
          sizeClasses[size],
          className
        )}
        style={{ backgroundImage: `url(${value})` }}
      >
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <label
      className={cn(
        'flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors',
        'border-border hover:border-primary hover:bg-primary/5',
        uploading && 'border-primary bg-primary/5',
        aspectClasses[aspectRatio],
        sizeClasses[size],
        className
      )}
    >
      {uploading ? (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        <>
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground">{placeholder}</span>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />
    </label>
  );
}
