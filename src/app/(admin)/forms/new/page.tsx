'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  FormField,
  FieldType,
  FieldOption,
  FIELD_TYPE_CONFIG,
} from '@/types/form';
import { generateId } from '@/lib/utils/code-generator';
import { createFormAction } from '@/server/actions/formAction';

export default function NewFormPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 基本信息
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // 字段
  const [fields, setFields] = useState<FormField[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // 提交配置
  const [buttonText, setButtonText] = useState('提交');
  const [showPreview, setShowPreview] = useState(true);
  const [successMessage, setSuccessMessage] = useState('提交成功！感谢您的参与。');
  const [redirectUrl, setRedirectUrl] = useState('');

  // 规则
  const [requirePhone, setRequirePhone] = useState(true);
  const [limitOne, setLimitOne] = useState(true);

  function addField(type: FieldType) {
    const newField: FormField = {
      id: generateId(),
      type,
      label: FIELD_TYPE_CONFIG[type].label,
      required: true,
      options: ['radio', 'checkbox', 'select'].includes(type)
        ? [{ value: '1', label: '选项1' }, { value: '2', label: '选项2' }]
        : undefined,
      ratingConfig: type === 'rating' ? { max: 5, icon: 'star' } : undefined,
    };
    setFields([...fields, newField]);
    setEditingFieldId(newField.id);
  }

  function updateField(id: string, updates: Partial<FormField>) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id));
    if (editingFieldId === id) {
      setEditingFieldId(null);
    }
  }

  function addOption(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const newOptions = [
      ...(field.options || []),
      { value: String((field.options?.length || 0) + 1), label: `选项${(field.options?.length || 0) + 1}` },
    ];
    updateField(fieldId, { options: newOptions });
  }

  function updateOption(fieldId: string, optionIndex: number, updates: Partial<FieldOption>) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field?.options) return;
    const newOptions = field.options.map((opt, i) =>
      i === optionIndex ? { ...opt, ...updates } : opt
    );
    updateField(fieldId, { options: newOptions });
  }

  function removeOption(fieldId: string, optionIndex: number) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field?.options || field.options.length <= 2) return;
    const newOptions = field.options.filter((_, i) => i !== optionIndex);
    updateField(fieldId, { options: newOptions });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('请输入表单标题');
      return;
    }

    if (fields.length === 0) {
      toast.error('请至少添加一个字段');
      return;
    }

    // 检查字段标题
    for (const field of fields) {
      if (!field.label.trim()) {
        toast.error('请填写所有字段的标题');
        return;
      }
    }

    setLoading(true);
    try {
      const config = {
        fields,
        submit: {
          buttonText,
          showPreview,
          successMessage,
          redirectUrl: redirectUrl || undefined,
        },
        rules: {
          requirePhone,
          limitOne,
        },
      };

      const res = await createFormAction({
        title: title.trim(),
        description: description.trim() || undefined,
        config: JSON.parse(JSON.stringify(config)),
      });

      if (res.success) {
        toast.success('创建成功');
        router.push(`/forms/${res.data?.id}`);
      } else {
        toast.error(res.error || '创建失败');
      }
    } catch {
      toast.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/forms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">创建表单</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">设计信息收集表单</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 基本信息 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
              <FileText className="h-4 w-4 text-violet-600" strokeWidth={1.9} />
            </div>
            基本信息
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">表单标题 *</Label>
              <Input
                id="title"
                placeholder="如：活动报名表"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                placeholder="表单的简单描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 添加字段 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
          <h2 className="mb-1 text-[15px] font-semibold text-foreground">添加字段</h2>
          <p className="mb-4 text-xs text-muted-foreground">选择要添加的字段类型</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {(Object.entries(FIELD_TYPE_CONFIG) as [FieldType, { label: string; icon: string }][]).map(
              ([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addField(type)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/40 p-3 transition-colors active:bg-muted"
                >
                  <span className="text-xl">{config.icon}</span>
                  <span className="text-xs text-foreground">{config.label}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* 字段列表 */}
        {fields.length > 0 && (
          <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-foreground">
              表单字段
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">({fields.length})</span>
            </h2>
            <div className="space-y-3">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className={`overflow-hidden rounded-xl border transition-colors ${
                    editingFieldId === field.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  {/* 字段头部 */}
                  <div
                    className="flex cursor-pointer items-center gap-3 p-3"
                    onClick={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
                  >
                    <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="text-lg">{FIELD_TYPE_CONFIG[field.type].icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{field.label}</span>
                      {field.required && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </div>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {FIELD_TYPE_CONFIG[field.type].label}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(field.id);
                      }}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 字段编辑 */}
                  {editingFieldId === field.id && (
                    <div className="space-y-4 border-t border-border p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>字段标题</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="字段标题"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>占位提示</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="请输入..."
                          />
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">必填</span>
                      </label>

                      {/* 选项编辑（单选/多选/下拉） */}
                      {['radio', 'checkbox', 'select'].includes(field.type) && field.options && (
                        <div className="space-y-2">
                          <Label>选项</Label>
                          {field.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <Input
                                value={option.label}
                                onChange={(e) =>
                                  updateOption(field.id, optIndex, {
                                    label: e.target.value,
                                    value: e.target.value,
                                  })
                                }
                                placeholder={`选项 ${optIndex + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(field.id, optIndex)}
                                disabled={(field.options?.length || 0) <= 2}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(field.id)}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            添加选项
                          </Button>
                        </div>
                      )}

                      {/* 评分配置 */}
                      {field.type === 'rating' && (
                        <div className="space-y-1.5">
                          <Label>最高分</Label>
                          <Input
                            type="number"
                            min={3}
                            max={10}
                            value={field.ratingConfig?.max || 5}
                            onChange={(e) =>
                              updateField(field.id, {
                                ratingConfig: {
                                  ...field.ratingConfig,
                                  max: parseInt(e.target.value) || 5,
                                  icon: field.ratingConfig?.icon || 'star',
                                },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 提交设置 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-foreground">提交设置</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>提交按钮文字</Label>
                <Input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="提交"
                />
              </div>
              <div className="space-y-1.5">
                <Label>成功提示语</Label>
                <Input
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="提交成功！"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">提交前显示预览确认</span>
            </label>

            <div className="space-y-1.5">
              <Label>提交后跳转 URL（可选）</Label>
              <Input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://example.com/thank-you"
              />
            </div>
          </div>
        </div>

        {/* 高级设置 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-4 transition-colors active:bg-muted"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className="text-[15px] font-semibold text-foreground">高级设置</span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showAdvanced && (
            <div className="space-y-1 border-t border-border px-4 pb-4 pt-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors active:bg-muted">
                <input
                  type="checkbox"
                  checked={requirePhone}
                  onChange={(e) => setRequirePhone(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <p className="text-sm font-medium">需要手机号</p>
                  <p className="text-xs text-muted-foreground">用户需输入手机号才能提交</p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors active:bg-muted">
                <input
                  type="checkbox"
                  checked={limitOne}
                  onChange={(e) => setLimitOne(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <p className="text-sm font-medium">每人限提交一次</p>
                  <p className="text-xs text-muted-foreground">同一手机号只能提交一次</p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* 提交按钮 */}
        <div className="space-y-2 pb-2">
          <Button type="submit" disabled={loading} className="h-12 w-full text-base font-medium">
            {loading ? '创建中...' : '创建表单'}
          </Button>
          <Link href="/forms" className="block">
            <Button type="button" variant="outline" className="w-full">
              取消
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
