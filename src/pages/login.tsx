import { FormEvent, useState } from "react";
import { useLogin } from "@refinedev/core";
import { ArrowLeft, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Label } from "@/components/ui/label";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";
import { ThemeToggle } from "@/components/refine-ui/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";

export function LoginPage() {
  const { mutateAsync: login, isPending } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = await login({ email, password });

    if (!result.success) {
      setError(result.error?.message ?? "Login failed");
    }
  };

  return (
    <ThemeProvider>
      <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(65,178,135,0.2),transparent_26rem),radial-gradient(circle_at_bottom_left,rgba(124,94,240,0.16),transparent_20rem)]" />
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle className="glass-panel h-11 w-11 rounded-2xl" />
        </div>

        <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="page-hero hidden min-h-[640px] lg:flex lg:flex-col lg:justify-between">
            <div>
              <Badge className="brand-chip mb-5 border-0 shadow-none">
                <Sparkles className="size-3.5" />
                واجهة تشغيل حديثة لمركز الصيانة
              </Badge>
              <h1 className="section-title max-w-2xl">
                إدارة الحالات والمبيعات والمخزون من مساحة واحدة أكثر وضوحًا.
              </h1>
              <p className="section-subtitle max-w-xl">
                تسجيل الحالات، متابعة الفنيين، تتبع القطع، والمبيعات اليومية
                ضمن تجربة عربية أنظف وأكثر حياة.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureTile
                icon={<Wrench className="size-5" />}
                title="تشغيل الحالات"
                description="لوحات واضحة للحالة والتشخيص والتنفيذ والاستلام."
                tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              />
              <FeatureTile
                icon={<ShieldCheck className="size-5" />}
                title="تتبّع العمليات"
                description="مؤشرات مرئية وتدفق عمل منظم وآمن للفريق."
                tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
              />
            </div>
          </div>

          <Card className="mx-auto w-full max-w-[480px] self-center">
            <CardHeader className="pb-2">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-primary text-primary-foreground shadow-md">
                <Wrench size={24} />
              </div>
              <CardTitle className="text-3xl">تسجيل الدخول</CardTitle>
              <CardDescription>
                ادخل إلى نظام الصيانة لمتابعة الحالات والمخزون والمبيعات.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <InputPassword
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                {error && (
                  <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                  {isPending ? "جاري تسجيل الدخول..." : "دخول إلى النظام"}
                  {!isPending && <ArrowLeft className="size-4 rotate-180" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </ThemeProvider>
  );
}

function FeatureTile({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <div className="glass-panel rounded-[1.5rem] p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-black text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}
