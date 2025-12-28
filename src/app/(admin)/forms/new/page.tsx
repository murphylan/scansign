'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      alert('请输入表单标题');
      return;
    }

    if (fields.length === 0) {
      alert('请至少添加一个字段');
      return;
    }

    // 检查字段标题
    for (const field of fields) {
      if (!field.label.trim()) {
        alert('请填写所有字段的标题');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          config: {
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
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/forms/${data.data.id}`);
      } else {
        const error = await res.json();
        alert(error.error || '创建失败');
      }
    } catch {
      alert('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/forms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">创建表单</h1>
          <p className="text-muted-foreground mt-1">
            设计信息收集表单
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">表单标题 *</Label>
              <Input
                id="title"
                placeholder="如：活动报名表"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                placeholder="表单的简单描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 添加字段 */}
        <Card>
          <CardHeader>
            <CardTitle>添加字段</CardTitle>
            <CardDescription>选择要添加的字段类型</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {(Object.entries(FIELD_TYPE_CONFIG) as [FieldType, { label: string; icon: string }][]).map(
                ([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addField(type)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors"
                  >
                    <span className="text-xl">{config.icon}</span>
                    <span className="text-xs">{config.label}</span>
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* 字段列表 */}
        {fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>表单字段 ({fields.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`border rounded-lg transition-colors ${
                    editingFieldId === field.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  {/* 字段头部 */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg">{FIELD_TYPE_CONFIG[field.type].icon}</span>
                    <div className="flex-1">
                      <span className="font-medium">{field.label}</span>
                      {field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
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
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 字段编辑 */}
                  {editingFieldId === field.id && (
                    <div className="p-4 pt-0 space-y-4 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>字段标题</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="字段标题"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>占位提示</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="请输入..."
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded"
                        />
                        <span>必填</span>
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
                                className="text-muted-foreground hover:text-destructive"
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
                            <Plus className="h-4 w-4 mr-1" />
                            添加选项
                          </Button>
                        </div>
                      )}

                      {/* 评分配置 */}
                      {field.type === 'rating' && (
                        <div className="space-y-2">
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
            </CardContent>
          </Card>
        )}

        {/* 提交配置 */}
        <Card>
          <CardHeader>
            <CardTitle>提交设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>提交按钮文字</Label>
                <Input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="提交"
                />
              </div>
              <div className="space-y-2">
                <Label>成功提示语</Label>
                <Input
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="提交成功！"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                className="rounded"
              />
              <span>提交前显示预览确认</span>
            </label>

            <div className="space-y-2">
              <Label>提交后跳转URL（可选）</Label>
              <Input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://example.com/thank-you"
              />
            </div>
          </CardContent>
        </Card>

        {/* 高级设置 */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <CardTitle className="flex items-center justify-between">
              高级设置
              {showAdvanced ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
          </CardHeader>
          {showAdvanced && (
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/50">
                <input
                  type="checkbox"
                  checked={requirePhone}
                  onChange={(e) => setRequirePhone(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <span className="font-medium">需要手机号</span>
                  <p className="text-xs text-muted-foreground">用户需输入手机号才能提交</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/50">
                <input
                  type="checkbox"
                  checked={limitOne}
                  onChange={(e) => setLimitOne(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <span className="font-medium">每人限提交一次</span>
                  <p className="text-xs text-muted-foreground">同一手机号只能提交一次</p>
                </div>
              </label>
            </CardContent>
          )}
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3">
          <Link href="/forms">
            <Button type="button" variant="outline">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? '创建中...' : '创建表单'}
          </Button>
        </div>
      </form>
    </div>
  );
}

