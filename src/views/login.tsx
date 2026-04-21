"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { notify } from "@/lib/notify";
import {
  Eye,
  EyeOff,
  Store,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AR } from "@/lib/i18n";
import { useAuth } from "@/store";
import { signInWithGoogle } from "@/lib/supabase";
import { authService } from "@/services/auth.service";

const loginSchema = z.object({
  email: z.string().email(AR.validation.email),
  password: z.string().min(6, AR.validation.minLength.replace("{min}", "6")),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'SHOP_OWNER' || user.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, router]);

  // Email verification state
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Success messages from URL params
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const verified = searchParams.get("verified");
    const reset = searchParams.get("reset");
    if (verified === "true") {
      setSuccessMessage("تم تأكيد بريدك الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول.");
    }
    if (reset === "true") {
      setSuccessMessage("تم تغيير كلمة المرور بنجاح! سجّل الدخول بكلمة المرور الجديدة.");
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const { error } = await authService.resendVerification(unverifiedEmail);
      if (error) {
        notify.error("فشل إعادة إرسال رسالة التأكيد");
      } else {
        notify.success("تم إعادة إرسال رسالة التأكيد");
        startCooldown();
      }
    } catch {
      notify.error("حدث خطأ غير متوقع");
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setShowVerificationAlert(false);
    setSuccessMessage("");
    try {
      const { error, user } = await login(
        data.email.trim().toLowerCase(),
        data.password
      );
      if (error) {
        // Check for email not verified
        if (error.message === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(data.email.trim().toLowerCase());
          setShowVerificationAlert(true);
          setIsLoading(false);
          return;
        }

        // Map common errors to Arabic
        const errorMap: Record<string, string> = {
          "Invalid login credentials": "بيانات الدخول غير صحيحة",
          "Email not confirmed": "يرجى تأكيد البريد الإلكتروني",
        };
        const message =
          errorMap[error.message] || error.message || "فشل تسجيل الدخول";
        notify.error(message);
        setIsLoading(false);
        return;
      }
      notify.success(AR.auth.loginSuccess);
      setIsLoading(false);

      // Redirect based on user role or redirect param
      const redirectTo = searchParams.get("redirect");
      if (redirectTo) {
        router.push(redirectTo);
      } else if (user?.role === "SHOP_OWNER" || user?.role === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch {
      notify.error("حدث خطأ غير متوقع");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        notify.error(error.message || "فشل تسجيل الدخول بجوجل");
      }
    } catch {
      notify.error("حدث خطأ غير متوقع");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Top Hero Section */}
      <div className="bg-gradient-to-br from-primary to-primary/80 pt-16 pb-28 px-4 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-4 w-12 h-12 border-2 border-white/20 rounded-full"></div>
        <div className="absolute top-1/4 right-8 w-6 h-6 bg-white/20 rounded-full"></div>
        
        <Link href="/" className="relative z-10 inline-flex flex-col items-center gap-4 mb-2">
          <div className="p-3 bg-white rounded-2xl shadow-lg">
            <img src="/logo.png" alt="Shopydash Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="font-bold text-3xl md:text-4xl text-white tracking-tight text-center max-w-[280px]" style={{ fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif" }}>
            مرحباً بك في <br /> Shopydash
          </h1>
        </Link>
      </div>

      {/* Bottom Form Section */}
      <div className="flex-1 px-4 -mt-16 sm:-mt-20 w-full max-w-[420px] mx-auto relative z-20 pb-12">
        <div className="bg-card rounded-[2.5rem] p-6 sm:p-8 shadow-2xl mb-8 border border-border/50">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">{AR.auth.login}</h2>
            <p className="text-muted-foreground text-sm mt-2">
              أدخل بياناتك للدخول إلى حسابك
            </p>
          </div>

          <div className="space-y-6">
            {/* Success message */}
            {successMessage && (
              <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  {successMessage}
                </p>
              </div>
            )}

            {/* Email not verified alert */}
            {showVerificationAlert && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      البريد الإلكتروني غير مُفعّل
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                      يرجى التحقق من بريدك الإلكتروني والضغط على رابط التأكيد.
                      تحقق من مجلد البريد غير المرغوب فيه (Spam).
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs rounded-xl h-10 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-100"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0 || isResending}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`}
                  />
                  {resendCooldown > 0
                    ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                    : "إعادة إرسال رسالة التأكيد"}
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground ml-1" required>
                  {AR.auth.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  autoComplete="username"
                  error={!!errors.email}
                  className="rounded-2xl h-[52px] bg-muted/40 border-border/50 focus:bg-background px-4 transition-colors text-right"
                  dir="rtl"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive ml-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground ml-1" required>
                  {AR.auth.password}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    error={!!errors.password}
                    className="rounded-2xl h-[52px] bg-muted/40 border-border/50 focus:bg-background px-4 pl-12 transition-colors text-right"
                    dir="rtl"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive ml-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {AR.auth.forgotPassword}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full rounded-full h-[56px] text-base font-bold shadow-lg shadow-primary/25 mt-2"
                size="lg"
                loading={isLoading}
              >
                {AR.auth.login}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground">أو</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full h-[56px] text-base font-medium border-border/60 hover:bg-muted/50 transition-colors"
              size="lg"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <span className="animate-spin mr-3">⏳</span>
              ) : (
                <svg className="w-5 h-5 ml-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              تسجيل الدخول بجوجل
            </Button>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                {AR.auth.noAccount}{" "}
                <Link
                  href="/register"
                  className="text-primary hover:text-primary/80 font-bold transition-colors"
                >
                  {AR.auth.registerNow}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
