import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/providers/api-client";

type Invitation = {
  id: number;
  role: string;
  status: string;
  name?: string | null;
  expiresAt: string;
};

const roleLabels: Record<string, string> = {
  technician: "فني",
  store_manager: "مسؤول مخزن",
  receptionist: "موظف استقبال",
  admin: "إدارة",
};

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("رابط الدعوة غير صالح.");
      setIsLoading(false);
      return;
    }

    apiClient<Invitation>(`/api/invitations/${token}`)
      .then((data) => {
        setInvitation(data);
        setName(data.name ?? "");
      })
      .catch((error) => {
        setError(
          error instanceof Error ? error.message : "تعذر تحميل الدعوة"
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient(`/api/invitations/${token}/accept`, {
        method: "POST",
        body: { name, email, password },
      });

      navigate("/login");
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر قبول الدعوة");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-muted/40 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl">قبول الدعوة</CardTitle>
          {invitation && (
            <p className="text-sm text-muted-foreground">
              الدور: {roleLabels[invitation.role] ?? invitation.role}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">جاري تحميل الدعوة...</p>
          ) : error && !invitation ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
              <Button asChild variant="outline">
                <Link to="/login">العودة لتسجيل الدخول</Link>
              </Button>
            </div>
          ) : invitation?.status !== "pending" ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                هذه الدعوة غير متاحة أو انتهت صلاحيتها.
              </p>
              <Button asChild variant="outline">
                <Link to="/login">العودة لتسجيل الدخول</Link>
              </Button>
            </div>
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
              <div className="grid gap-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                <Check />
                {isSubmitting ? "جاري التفعيل..." : "تفعيل الحساب"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
