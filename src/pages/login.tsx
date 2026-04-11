import { FormEvent, useState } from "react";
import { useLogin } from "@refinedev/core";
import { ArrowLeft, ShieldCheck, Wrench } from "lucide-react";
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
      <main className="relative flex min-h-svh items-center justify-center bg-background px-4 py-8">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle className="h-11 w-11 rounded-xl border border-border bg-card" />
        </div>

        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="page-hero hidden min-h-[560px] lg:flex lg:flex-col lg:justify-between">
            <div>
              <Badge className="brand-chip mb-4 border-0 shadow-none">
                Maintenance Center
              </Badge>
              <h1 className="section-title max-w-2xl">
                واجهة أخف وأوضح لإدارة الحالات والمخزون والمبيعات.
              </h1>
              <p className="section-subtitle max-w-xl">
                دخول سريع إلى نظام الصيانة مع تجربة بيضاء نظيفة وتركيز أوضح على
                البيانات المهمة بدل الزخرفة الثقيلة.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureTile
                icon={<Wrench className="size-5" />}
                title="متابعة الحالات"
                description="تشخيص، تنفيذ، واستلام داخل مسار واضح وسريع."
              />
              <FeatureTile
                icon={<ShieldCheck className="size-5" />}
                title="تشغيل موثوق"
                description="واجهة أخف مع تركيز أكبر على البيانات والعمل اليومي."
              />
            </div>
          </div>

          <Card className="mx-auto w-full max-w-[460px] self-center">
            <CardHeader className="pb-2">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wrench size={22} />
              </div>
              <CardTitle className="text-3xl">تسجيل الدخول</CardTitle>
              <CardDescription>
                ادخل إلى النظام لمتابعة الحالات والمخزون والمبيعات.
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
                  <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-card p-5 shadow-2xs">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-black text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}
