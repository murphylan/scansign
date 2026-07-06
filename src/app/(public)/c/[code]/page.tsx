'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  MobilePage,
  NavBar,
  SectionTitle,
  BottomAction,
  LoadingScreen,
  Cells,
  Field,
  ResultScreen,
  bareInputClass,
} from '@/components/mobile';
import { useSSE } from '@/hooks/use-sse';
import {
  UserCheck,
  Phone,
  User,
  Building,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  Clock,
  Users,
} from 'lucide-react';

import {
  getCheckinByCodeAction,
  checkCheckinPhoneAction,
  doCheckinAction,
} from '@/server/actions/publicAction';
import { getDeviceId, saveLocalCheckinRecord } from '@/lib/utils/fingerprint';

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
  // 有效期信息
  startTime?: number;
  endTime?: number;
  remainingSeconds?: number | null;
  isExpired?: boolean;
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

  // 倒计时状态
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // 个人第二屏：实时签到人数（复用大屏 SSE）
  const [liveCount, setLiveCount] = useState<number | null>(null);

  // 客户端挂载状态（解决 hydration 问题）
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCheckin = useCallback(async () => {
    const res = await getCheckinByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      const data = res.data as CheckinData;
      setCheckin(data);
      // 初始化倒计时
      if (data.remainingSeconds !== null && data.remainingSeconds !== undefined) {
        setRemainingTime(data.remainingSeconds);
      }
      if (data.isExpired) {
        setIsExpired(true);
      }
    } else {
      setError(res.error || '签到不存在或已结束');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchCheckin();
  }, [fetchCheckin]);

  // 倒计时 effect
  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0 || isExpired || success) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null || prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingTime, isExpired, success]);

  // 个人第二屏：签到成功后订阅大屏实时签到人数
  useSSE(
    success && checkin ? `/api/checkins/${checkin.id}/stream` : null,
    useCallback((data: unknown) => {
      const d = data as { type?: string; checkinCount?: number };
      if (typeof d.checkinCount === 'number') setLiveCount(d.checkinCount);
    }, [])
  );

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

    // 获取设备 ID 用于防恶意签到
    const deviceId = getDeviceId();

    const res = await doCheckinAction(resolvedParams.code, {
      phone: needPhone ? phone : undefined,
      name: needName ? name : undefined,
      department: departmentId || undefined,
      deviceId,
    });

    if (res.success) {
      // 保存签到记录到本地
      saveLocalCheckinRecord(resolvedParams.code);

      setSuccess(true);
      // isUpdate 来自服务端：true 表示更新了已有记录，false 表示首次签到
      const serverIsUpdate = res.data?.isUpdate ?? false;
      setSuccessData({
        message: serverIsUpdate ? '签到成功！' : '签到成功！',
        verifyCode: res.data?.verifyCode ?? undefined,
        isUpdate: serverIsUpdate,
      });
      toast.success(serverIsUpdate ? '欢迎回来！' : '签到成功');
    } else {
      setError(res.error || '签到失败');
      toast.error(res.error || '签到失败');
    }

    setSubmitting(false);
  }, [checkin, resolvedParams.code, phone, name, departmentId]);

  // 兼容新旧配置结构（用于渲染）
  const requireName = checkin?.config.fields?.name ?? checkin?.config.requireName ?? false;
  const requirePhone = checkin?.config.fields?.phone ?? checkin?.config.requirePhone ?? true;
  const requireDepartment = checkin?.config.fields?.department ?? false;

  if (loading) {
    return <LoadingScreen />;
  }

  if (error && !checkin) {
    return (
      <ResultScreen
        tone="neutral"
        icon={<AlertCircle />}
        title="无法加载"
        description={error}
      />
    );
  }

  // 签到已过期
  if (isExpired && !success) {
    return (
      <ResultScreen
        tone="neutral"
        icon={<Clock />}
        title="签到已结束"
        description={checkin ? `本次签到活动「${checkin.title}」已过期` : '本次签到活动已过期'}
      />
    );
  }

  // 成功 —— 个人第二屏
  if (success && successData) {
    return (
      <ResultScreen
        tone="success"
        icon={<CheckCircle2 />}
        title={successData.isUpdate ? '欢迎回来！' : '签到成功！'}
        description={`${name ? `${name}，` : ''}${successData.isUpdate ? '再次' : ''}欢迎参加 ${checkin?.title ?? ''}`}
      >
        <div className="space-y-3">
          {/* 实时签到人数（镜像大屏） */}
          <div className="rounded-xl bg-cell p-5 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">现场已签到</span>
            </div>
            <p className="mt-1 text-4xl font-bold text-primary tabular-nums">
              {liveCount ?? '—'}
              <span className="ml-1 text-base font-normal text-muted-foreground">人</span>
            </p>
          </div>

          {/* 我的验证码 */}
          {successData.verifyCode && !successData.isUpdate && (
            <div className="rounded-xl bg-cell p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">我的验证码</p>
              <p className="mt-1 font-mono text-4xl font-bold tracking-widest text-primary">
                {successData.verifyCode}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                请牢记，修改信息时需要使用
              </p>
            </div>
          )}
        </div>
      </ResultScreen>
    );
  }

  const departments = (checkin?.config?.departments ?? []) as Department[];
  const showDepartmentField = requireDepartment && departments.length > 0;

  return (
    <MobilePage>
      <NavBar
        title={checkin?.title}
        subtitle={
          mounted && remainingTime !== null && remainingTime > 0
            ? `剩余 ${Math.floor(remainingTime / 60)}:${(remainingTime % 60).toString().padStart(2, '0')}`
            : undefined
        }
      />

      {/* 头部品牌 */}
      <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <UserCheck className="h-8 w-8 text-white" />
        </div>
        {checkin?.description && (
          <p className="mt-3 text-sm text-muted-foreground">{checkin.description}</p>
        )}
        {mounted && remainingTime !== null && remainingTime > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-amber-700">
            <Clock className="h-4 w-4 animate-pulse" />
            剩余 {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <SectionTitle>
          {isExistingUser
            ? needVerifyCode
              ? '您已签到过，输入验证码可修改信息'
              : '您已签到过，可直接修改信息'
            : '请填写以下信息完成签到'}
        </SectionTitle>

        <Cells>
          <Field label="手机号" required htmlFor="phone" icon={<Phone className="h-4 w-4 text-muted-foreground" />}>
            <Input
              id="phone"
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={checkPhone}
              maxLength={11}
              required
              className={bareInputClass}
            />
          </Field>

          {requireName && (
            <Field label="姓名" required htmlFor="name" icon={<User className="h-4 w-4 text-muted-foreground" />}>
              <Input
                id="name"
                placeholder="请输入姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={bareInputClass}
              />
            </Field>
          )}

          {showDepartmentField && (
            <Field label="部门" required htmlFor="department" icon={<Building className="h-4 w-4 text-muted-foreground" />}>
              <Select
                id="department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                className={bareInputClass + ' pr-8'}
              >
                <option value="">请选择部门</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {needVerifyCode && (
            <Field label="验证码" required htmlFor="verifyCode" icon={<Key className="h-4 w-4 text-muted-foreground" />} hint="首次签到时获得的验证码">
              <Input
                id="verifyCode"
                placeholder="请输入验证码"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                maxLength={6}
                required
                className={bareInputClass}
              />
            </Field>
          )}
        </Cells>

        {checkingPhone && (
          <p className="px-5 pt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            检查中...
          </p>
        )}
        {isExistingUser && !checkingPhone && (
          <p className="px-5 pt-2 text-xs text-blue-500">您已签到过，可以修改信息</p>
        )}

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1" />

        <BottomAction sticky>
          <Button type="submit" className="h-12 w-full text-base font-medium" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                提交中...
              </>
            ) : isExistingUser ? (
              '确认修改'
            ) : (
              '确认签到'
            )}
          </Button>
        </BottomAction>
      </form>
    </MobilePage>
  );
}
