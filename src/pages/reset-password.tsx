import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Label } from "@/components/ui/label";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";
import { ThemeToggle } from "@/components/refine-ui/theme/theme-toggle";
import { apiClient } from "@/providers/api-client";

type ResetTokenDetails = {
  user: {
    id: number;
    name: string;
    email: string;
  };
  expiresAt: string;
};

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [details, setDetails] = useState<ResetTokenDetails | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("رابط إعادة التعيين غير مكتمل.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    apiClient<ResetTokenDetails>(`/api/auth/password-reset/${encodeURIComponent(token)}`)
      .then((data) => {
        if (!isMounted) return;
        setDetails(data);
      })
      .catch((verifyError) => {
        if (!isMounted) return;
        setError(verifyError instanceof Error ? verifyError.message : "رابط إعادة التعيين غير صالح.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient("/api/auth/password-reset/complete", {
        method: "POST",
        body: {
          token,
          password,
        },
      });
      setIsComplete(true);
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذر حفظ كلمة المرور الجديدة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemeProvider>
      <main className="relative flex min-h-svh items-center justify-center bg-background px-4 py-8" dir="rtl">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle className="h-11 w-11 rounded-xl border border-border bg-card" />
        </div>

        <Card className="mx-auto w-full max-w-[480px]">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wrench size={22} />
            </div>
            <CardTitle className="text-3xl">إعادة تعيين كلمة المرور</CardTitle>
            <CardDescription>
              أدخل كلمة مرور جديدة لحسابك في نظام مركز الصيانة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                جاري التحقق من رابط إعادة التعيين...
              </p>
            ) : isComplete ? (
              <div className="grid gap-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
                    <ShieldCheck className="size-4" />
                    تم حفظ كلمة المرور الجديدة.
                  </div>
                  يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
                </div>
                <Button asChild>
                  <Link to="/login">
                    الذهاب إلى تسجيل الدخول
                    <ArrowRight className="size-4 rotate-180" />
                  </Link>
                </Button>
              </div>
            ) : error && !details ? (
              <div className="grid gap-4">
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {error}
                </p>
                <Button asChild variant="outline">
                  <Link to="/login">العودة إلى تسجيل الدخول</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {details ? (
                  <p className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    سيتم تحديث كلمة المرور للحساب: <span className="font-semibold text-foreground">{details.user.email}</span>
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <InputPassword
                    id="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <InputPassword
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                {error ? (
                  <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </ThemeProvider>
  );
}
