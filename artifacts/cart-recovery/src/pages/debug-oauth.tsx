import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useState } from "react";

type OauthDebug = {
  authorize_endpoint: string;
  token_endpoint: string;
  client_id: string | null;
  client_id_length: number;
  client_secret_configured: boolean;
  client_secret_length: number;
  redirect_uri: string;
  full_authorize_url: string;
  notes: string[];
};

function Field({
  label,
  value,
  mono = true,
  copyable = false,
}: {
  label: string;
  value: string | number | boolean | null;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const display =
    value === null
      ? "(not set)"
      : typeof value === "boolean"
        ? value
          ? "yes"
          : "no"
        : String(value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {copyable && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(display);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            <Copy className="w-3 h-3 ml-1" />
            {copied ? "تم النسخ" : "نسخ"}
          </Button>
        )}
      </div>
      <div
        className={`rounded-md border bg-muted/30 p-3 text-sm break-all ${
          mono ? "font-mono" : ""
        }`}
        dir="ltr"
      >
        {display}
      </div>
    </div>
  );
}

export default function DebugOauth() {
  const { data, isLoading, error, refetch } = useQuery<OauthDebug>({
    queryKey: ["debug-oauth"],
    queryFn: () => apiFetch<OauthDebug>("/debug/oauth"),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-muted/20 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            تشخيص OAuth مع Zid
          </h1>
          <p className="text-muted-foreground mt-1">
            هذه الصفحة تعرض الإعدادات الفعلية المستخدمة لتسجيل الدخول عبر Zid،
            دون كشف القيم الحساسة.
          </p>
        </div>

        {isLoading && (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-destructive/70 mb-2" />
              <p className="font-medium">تعذّر جلب بيانات التشخيص</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
              >
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>حالة الإعدادات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">ZID_CLIENT_ID</span>
                  {data.client_id ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      موجود ({data.client_id_length} حرف)
                    </Badge>
                  ) : (
                    <Badge variant="destructive">مفقود</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">ZID_CLIENT_SECRET</span>
                  {data.client_secret_configured ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      موجود ({data.client_secret_length} حرف)
                    </Badge>
                  ) : (
                    <Badge variant="destructive">مفقود</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>القيم المرسلة إلى Zid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field label="Authorize Endpoint" value={data.authorize_endpoint} copyable />
                <Field label="Client ID" value={data.client_id} copyable />
                <Field label="Redirect URI (سجّله في Zid حرفيًا)" value={data.redirect_uri} copyable />
                <Field
                  label="Full Authorize URL (افتحه في تبويب جديد لتجربته)"
                  value={data.full_authorize_url}
                  copyable
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ملاحظات تشخيصية</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pr-5" dir="rtl">
                  {data.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button asChild>
                <a
                  href={data.full_authorize_url.replace(
                    "DIAGNOSTIC_STATE_PLACEHOLDER",
                    "test",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  افتح URL في تبويب جديد
                </a>
              </Button>
              <Button variant="outline" onClick={() => refetch()}>
                تحديث
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
