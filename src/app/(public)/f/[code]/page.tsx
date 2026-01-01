'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  getFormByCodeAction,
  submitFormAction,
} from '@/server/actions/publicAction';

interface FieldOption {
  value: string;
  label: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  ratingConfig?: {
    max: number;
  };
}

interface FormData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  config: {
    fields: FormField[];
    submit?: {
      buttonText?: string;
      showPreview?: boolean;
      successMessage?: string;
      redirectUrl?: string;
    };
    rules?: {
      requirePhone?: boolean;
      limitOne?: boolean;
    };
  };
}

export default function FormMobilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 表单数据
  const [phone, setPhone] = useState('');
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // 预览状态
  const [showPreview, setShowPreview] = useState(false);
  
  // 成功状态
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const fetchForm = useCallback(async () => {
    const res = await getFormByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      setForm(res.data as FormData);
    } else {
      setError(res.error || '表单不存在或已结束');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const updateFieldValue = useCallback((fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const validateField = useCallback((field: FormField, value: unknown): string | null => {
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        return `请填写${field.label}`;
      }
      if (Array.isArray(value) && value.length === 0) {
        return `请选择${field.label}`;
      }
    }
    return null;
  }, []);

  const validateAllFields = useCallback((): boolean => {
    if (!form) return false;
    
    const errors: Record<string, string> = {};
    
    for (const field of form.config.fields) {
      const error = validateField(field, formData[field.id]);
      if (error) {
        errors[field.id] = error;
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, formData, validateField]);

  const handlePreview = useCallback(() => {
    if (!validateAllFields()) {
      return;
    }
    setShowPreview(true);
  }, [validateAllFields]);

  const handleSubmit = useCallback(async () => {
    if (!form) return;
    
    setSubmitting(true);
    setError(null);
    
    const res = await submitFormAction(resolvedParams.code, {
      formData: {
        ...formData,
        ...(form.config.rules?.requirePhone && phone ? { phone } : {}),
      },
    });
    
    if (res.success) {
      setSuccess(true);
      setSuccessMessage(form.config.submit?.successMessage || '提交成功！');
      toast.success('提交成功');
      
      if (form.config.submit?.redirectUrl) {
        setRedirectUrl(form.config.submit.redirectUrl);
        setTimeout(() => {
          window.location.href = form.config.submit!.redirectUrl!;
        }, 2000);
      }
    } else {
      setError(res.error || '提交失败');
      setShowPreview(false);
      toast.error(res.error || '提交失败');
    }
    
    setSubmitting(false);
  }, [form, resolvedParams.code, phone, formData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-secondary/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">无法加载</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md animate-fade-in-up">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-16 w-16 rounded-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">提交成功</h2>
            <p className="text-muted-foreground">{successMessage}</p>
            {redirectUrl && (
              <p className="text-sm text-muted-foreground mt-4">
                即将跳转...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const fields = form?.config.fields ?? [];

  // 预览确认页
  if (showPreview) {
    return (
      <div className="min-h-screen bg-linear-to-b from-background to-secondary/30 p-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1 rounded hover:bg-secondary"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                确认提交
              </CardTitle>
              <CardDescription>请确认以下信息无误</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form?.config.rules?.requirePhone && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">手机号</span>
                  <span className="font-medium">{phone}</span>
                </div>
              )}
              {fields.map((field) => (
                <div key={field.id} className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{field.label}</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {formatValue(formData[field.id], field)}
                  </span>
                </div>
              ))}

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPreview(false)}
                  disabled={submitting}
                >
                  返回修改
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      提交中...
                    </>
                  ) : (
                    '确认提交'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-secondary/30 p-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center animate-fade-in-up">
          <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{form?.title}</h1>
          {form?.description && (
            <p className="text-muted-foreground mt-2">{form.description}</p>
          )}
        </div>

        {/* Form */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="pt-6 space-y-6">
            {/* 手机号 */}
            {form?.config.rules?.requirePhone && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  手机号 *
                </Label>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                />
              </div>
            )}

            {/* 动态字段 */}
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                
                {renderField(field, formData[field.id], (value) => updateFieldValue(field.id, value))}
                
                {fieldErrors[field.id] && (
                  <p className="text-xs text-destructive">{fieldErrors[field.id]}</p>
                )}
              </div>
            ))}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              className="w-full h-12 text-lg"
              onClick={form?.config.submit?.showPreview ? handlePreview : handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  提交中...
                </>
              ) : (
                form?.config.submit?.buttonText || '提交'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function renderField(
  field: FormField,
  value: unknown,
  onChange: (value: unknown) => void
) {
  switch (field.type) {
    case 'text':
    case 'phone':
    case 'email':
      return (
        <Input
          type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
          placeholder={field.placeholder || `请输入${field.label}`}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.type === 'phone' ? 11 : undefined}
        />
      );

    case 'textarea':
      return (
        <textarea
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder={field.placeholder || `请输入${field.label}`}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          placeholder={field.placeholder || `请输入${field.label}`}
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'time':
      return (
        <Input
          type="time"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                value === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-secondary/50'
              )}
            >
              <input
                type="radio"
                name={field.id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <div
                className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                  value === option.value
                    ? 'border-primary'
                    : 'border-muted-foreground/50'
                )}
              >
                {value === option.value && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                )}
              </div>
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      const selectedValues = (value as string[]) || [];
      return (
        <div className="space-y-2">
          {field.options?.map((option) => {
            const isChecked = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  isChecked
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-secondary/50'
                )}
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, option.value]);
                    } else {
                      onChange(selectedValues.filter((v) => v !== option.value));
                    }
                  }}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'h-5 w-5 rounded border-2 flex items-center justify-center',
                    isChecked
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50'
                  )}
                >
                  {isChecked && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12">
                      <path
                        fill="currentColor"
                        d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0L1.22 6.34a.75.75 0 0 1 1.06-1.06l2 2 4.97-4.97a.75.75 0 0 1 1.06 0Z"
                      />
                    </svg>
                  )}
                </div>
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      );

    case 'select':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">请选择</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'rating':
      const max = field.ratingConfig?.max || 5;
      const rating = (value as number) || 0;
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors',
                  num <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/30'
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-lg font-medium">{rating}分</span>
          )}
        </div>
      );

    default:
      return (
        <Input
          placeholder={field.placeholder || `请输入${field.label}`}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function formatValue(value: unknown, field: FormField): string {
  if (value === undefined || value === null || value === '') return '-';
  
  if (field.type === 'checkbox' && Array.isArray(value)) {
    const labels = value.map((v) => {
      const opt = field.options?.find((o) => o.value === v);
      return opt?.label || v;
    });
    return labels.join(', ');
  }
  
  if ((field.type === 'radio' || field.type === 'select') && field.options) {
    const opt = field.options.find((o) => o.value === value);
    return opt?.label || String(value);
  }
  
  if (field.type === 'rating') {
    return `${value}分`;
  }
  
  return String(value);
}
