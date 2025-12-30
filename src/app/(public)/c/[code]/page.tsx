'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserCheck,
  Phone,
  User,
  Building,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
} from 'lucide-react';

import {
  getCheckinByCodeAction,
  checkCheckinPhoneAction,
  doCheckinAction,
} from '@/server/actions/publicAction';

interface Department {
  id: string;
  name: string;
}

interface CheckinData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  config: {
    // 新结构
    fields?: {
      name?: boolean;
      phone?: boolean;
      department?: boolean;
    };
    allowRepeat?: boolean;
    departments?: Department[];
    // 旧结构（兼容）
    requireName?: boolean;
    requirePhone?: boolean;
    requireVerify?: boolean;
    allowDuplicate?: boolean;
  };
}

export default function CheckinMobilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkin, setCheckin] = useState<CheckinData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 表单状态
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  
  // 用户状态
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [needVerifyCode, setNeedVerifyCode] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  
  // 成功状态
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    message: string;
    verifyCode?: string;
    isUpdate: boolean;
  } | null>(null);

  const fetchCheckin = useCallback(async () => {
    const res = await getCheckinByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      setCheckin(res.data as CheckinData);
    } else {
      setError(res.error || '签到不存在或已结束');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchCheckin();
  }, [fetchCheckin]);

  // 检查手机号
  const checkPhone = useCallback(async () => {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return;
    
    setCheckingPhone(true);
    const res = await checkCheckinPhoneAction(resolvedParams.code, phone);
    const allowRepeat = checkin?.config.allowRepeat ?? checkin?.config.allowDuplicate ?? false;
    if (res.success && res.data?.exists) {
      setIsExistingUser(true);
      setNeedVerifyCode(!allowRepeat);
      if (res.data.name) {
        setName(res.data.name);
      }
      if (res.data.department) {
        setDepartmentId(res.data.department);
      }
    } else {
      setIsExistingUser(false);
      setNeedVerifyCode(false);
    }
    setCheckingPhone(false);
  }, [phone, resolvedParams.code, checkin?.config.allowRepeat, checkin?.config.allowDuplicate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkin) return;
    
    // 兼容新旧配置结构
    const needName = checkin.config.fields?.name ?? checkin.config.requireName ?? false;
    const needPhone = checkin.config.fields?.phone ?? checkin.config.requirePhone ?? true;
    
    setSubmitting(true);
    setError(null);
    
    const res = await doCheckinAction(resolvedParams.code, {
      phone: needPhone ? phone : undefined,
      name: needName ? name : undefined,
      department: departmentId || undefined,
    });
    
    if (res.success) {
      setSuccess(true);
      setSuccessData({
        message: '签到成功！',
        verifyCode: res.data?.verifyCode,
        isUpdate: isExistingUser,
      });
      toast.success('签到成功');
    } else {
      setError(res.error || '签到失败');
      toast.error(res.error || '签到失败');
    }
    
    setSubmitting(false);
  }, [checkin, resolvedParams.code, phone, name, departmentId, isExistingUser]);

  // 兼容新旧配置结构（用于渲染）
  const requireName = checkin?.config.fields?.name ?? checkin?.config.requireName ?? false;
  const requirePhone = checkin?.config.fields?.phone ?? checkin?.config.requirePhone ?? true;
  const requireDepartment = checkin?.config.fields?.department ?? false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !checkin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4">
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

  if (success && successData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md animate-fade-in-up">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-16 w-16 rounded-full bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {successData.isUpdate ? '信息更新成功' : '签到成功'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {name ? `${name}，` : ''}欢迎参加 {checkin?.title}
            </p>
            
            {successData.verifyCode && (
              <div className="bg-secondary/50 rounded-xl p-4 mb-4">
                <p className="text-sm text-muted-foreground mb-2">您的验证码</p>
                <p className="text-4xl font-bold font-mono tracking-widest text-primary">
                  {successData.verifyCode}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  请牢记此验证码，修改信息时需要使用
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const departments = (checkin?.config?.departments ?? []) as Department[];
  const showDepartmentField = requireDepartment && departments.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center animate-fade-in-up">
          <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{checkin?.title}</h1>
          {checkin?.description && (
            <p className="text-muted-foreground mt-2">{checkin.description}</p>
          )}
        </div>

        {/* Form */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>填写信息</CardTitle>
            <CardDescription>
              {isExistingUser 
                ? needVerifyCode 
                  ? '您已签到过，输入验证码可修改信息' 
                  : '您已签到过，可直接修改信息'
                : '请填写以下信息完成签到'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 手机号 */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  手机号 *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={checkPhone}
                  maxLength={11}
                  required
                />
                {checkingPhone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    检查中...
                  </p>
                )}
                {isExistingUser && !checkingPhone && (
                  <p className="text-xs text-blue-500">
                    您已签到过，可以修改信息
                  </p>
                )}
              </div>

              {/* 姓名 */}
              {requireName && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    姓名 *
                  </Label>
                  <Input
                    id="name"
                    placeholder="请输入姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* 部门 */}
              {showDepartmentField && (
                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    部门 *
                  </Label>
                  <select
                    id="department"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required
                  >
                    <option value="">请选择部门</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 验证码 */}
              {needVerifyCode && (
                <div className="space-y-2">
                  <Label htmlFor="verifyCode" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    验证码 *
                  </Label>
                  <Input
                    id="verifyCode"
                    placeholder="请输入验证码"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    首次签到时获得的验证码
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    提交中...
                  </>
                ) : isExistingUser ? (
                  '确认修改'
                ) : (
                  '确认签到'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
