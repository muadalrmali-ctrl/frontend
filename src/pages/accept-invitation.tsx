import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import type { BackendUser } from "@/providers/auth-provider";
import { getDefaultRouteForUser, ROLE_LABELS } from "@/lib/access-control";
import { apiClient } from "@/providers/api-client";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "@/providers/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Invitation = {
  id: number;
  role: string;
  status: "pending" | "used" | "expired" | "revoked";
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  expiresAt: string;
};

type AcceptInvitationResponse = {
  user: BackendUser;
  token: string;
};

const invitationStatusMessage: Record<Invitation["status"], string> = {
  pending: "",
  used: "تم استخدام رابط الدعوة بالفعل، ولا يمكن التسجيل به مرة أخرى.",
  expired: "انتهت صلاحية رابط الدعوة. اطلب من الإدارة إنشاء دعوة جديدة.",
  revoked: "تم إلغاء هذه الدعوة من الإدارة.",
};

export function AcceptInvitationPage() {
  const { token: tokenParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = tokenParam ?? searchParams.get("token") ?? "";
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLockedEmail = useMemo(() => Boolean(invitation?.email), [invitation?.email]);

  useEffect(() => {
    if (!token) {
      setError("رابط الدعوة غير صالح.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    apiClient<Invitation>(`/api/invitations/${token}`)
      .then((data) => {
        setInvitation(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error ? requestError.message : "تعذر تحميل بيانات الدعوة"
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await apiClient<AcceptInvitationResponse>(`/api/invitations/${token}/accept`, {
        method: "POST",
        body: {
          name,
          phone,
          email,
          password,
        },
      });

      localStorage.setItem(AUTH_TOKEN_KEY, result.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
      navigate(getDefaultRouteForUser(result.user), { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "تعذر إكمال التسجيل عبر الدعوة"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const unavailableMessage =
    invitation && invitation.status !== "pending"
      ? invitationStatusMessage[invitation.status]
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4" dir="rtl">
      <Card className="w-full max-w-xl rounded-2xl border-border/70">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">إنشاء حساب من رابط الدعوة</CardTitle>
            <CardDescription>
              أكمل بياناتك لتفعيل حسابك والدخول إلى نظام مركز الصيانة.
            </CardDescription>
          </div>
          {invitation ? (
            <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              الدور المحدد لك:{" "}
              <span className="font-semibold text-foreground">
                {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS] ?? invitation.role}
              </span>
            </div>
          ) : null}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">جارٍ التحقق من الدعوة...</p>
          ) : error && !invitation ? (
            <InviteMessage
              message={error}
              linkLabel="العودة إلى تسجيل الدخول"
              linkTo="/login"
            />
          ) : unavailableMessage ? (
            <InviteMessage
              message={unavailableMessage}
              linkLabel="العودة إلى تسجيل الدخول"
              linkTo="/login"
            />
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="name">الاسم</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    dir="ltr"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isLockedEmail}
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {error ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                <Check className="size-4" />
                {isSubmitting ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب وتسجيل الدخول"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function InviteMessage({
  message,
  linkLabel,
  linkTo,
}: {
  message: string;
  linkLabel: string;
  linkTo: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{message}</span>
        </div>
      </div>

      <Button asChild variant="outline">
        <Link to={linkTo}>{linkLabel}</Link>
      </Button>
    </div>
  );
}
