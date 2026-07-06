'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MobilePage,
  NavBar,
  BottomAction,
  LoadingScreen,
  Cells,
  Cell,
  ResultScreen,
} from '@/components/mobile';
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
    return <LoadingScreen />;
  }

  if (error && !form) {
    return (
      <ResultScreen
        tone="neutral"
        icon={<AlertCircle />}
        title="无法加载"
        description={error}
      />
    );
  }

  if (success) {
    return (
      <ResultScreen
        tone="success"
        icon={<CheckCircle2 />}
        title="提交成功"
        description={successMessage}
      >
        {redirectUrl && (
          <p className="text-sm text-muted-foreground">即将跳转...</p>
        )}
      </ResultScreen>
    );
  }

  const fields = form?.config.fields ?? [];

  // 预览确认页
  if (showPreview) {
    return (
      <MobilePage>
        <NavBar
          title="确认提交"
          subtitle="请确认以下信息无误"
          left={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreview(false)}
              aria-label="返回修改"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          }
        />

        <div className="pt-4">
          <Cells>
            {form?.config.rules?.requirePhone && (
              <Cell title="手机号" value={phone} />
            )}
            {fields.map((field) => (
              <Cell
                key={field.id}
                title={field.label}
                value={
                  <span className="block max-w-[55vw] text-right text-foreground">
                    {formatValue(formData[field.id], field)}
                  </span>
                }
              />
            ))}
          </Cells>
        </div>

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1" />

        <BottomAction>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1"
              onClick={() => setShowPreview(false)}
              disabled={submitting}
            >
              返回修改
            </Button>
            <Button className="h-12 flex-1 font-medium" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '确认提交'
              )}
            </Button>
          </div>
        </BottomAction>
      </MobilePage>
    );
  }

  return (
    <MobilePage>
      <NavBar title={form?.title} />

      {/* 头部品牌 */}
      <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <FileText className="h-8 w-8 text-white" />
        </div>
        {form?.description && (
          <p className="mt-3 text-sm text-muted-foreground">{form.description}</p>
        )}
      </div>

      {/* 表单主体：白色圆角面板 + 堆叠字段 */}
      <div className="mx-4 mt-2 space-y-5 rounded-xl bg-cell p-5 shadow-sm">
        {form?.config.rules?.requirePhone && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              手机号 <span className="text-primary">*</span>
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

        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="ml-1 text-primary">*</span>}
            </Label>

            {renderField(field, formData[field.id], (value) => updateFieldValue(field.id, value))}

            {fieldErrors[field.id] && (
              <p className="text-xs text-destructive">{fieldErrors[field.id]}</p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1" />

      <BottomAction sticky>
        <Button
          className="h-12 w-full text-base font-medium"
          onClick={form?.config.submit?.showPreview ? handlePreview : handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              提交中...
            </>
          ) : (
            form?.config.submit?.buttonText || '提交'
          )}
        </Button>
      </BottomAction>
    </MobilePage>
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
          className="flex min-h-[100px] w-full rounded-lg border border-border bg-cell px-4 py-2.5 text-base placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
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
                'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                value === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border active:bg-muted'
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
                  'flex h-5 w-5 items-center justify-center rounded-full border-2',
                  value === option.value ? 'border-primary' : 'border-muted-foreground/50'
                )}
              >
                {value === option.value && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
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
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                  isChecked
                    ? 'border-primary bg-primary/5'
                    : 'border-border active:bg-muted'
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
                    'flex h-5 w-5 items-center justify-center rounded border-2',
                    isChecked ? 'border-primary bg-primary' : 'border-muted-foreground/50'
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
          className="flex h-11 w-full rounded-lg border border-border bg-cell px-4 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
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
              className="p-1 transition-transform active:scale-90"
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors',
                  num <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
                )}
              />
            </button>
          ))}
          {rating > 0 && <span className="ml-2 text-lg font-medium">{rating}分</span>}
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
