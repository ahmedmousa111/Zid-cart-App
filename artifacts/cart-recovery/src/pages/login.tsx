import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ArrowRight, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  zid_denied: "تم رفض الإذن من قِبَل Zid. يرجى المحاولة مرة أخرى.",
  missing_code: "لم يتم استلام رمز التفويض من Zid.",
  invalid_state: "انتهت صلاحية جلسة تسجيل الدخول. حاول مجدداً.",
  token_exchange_failed: "فشل تبادل الرمز مع Zid. تأكد من إعدادات تطبيقك.",
  storage_failed: "تعذّر حفظ بيانات الاعتماد. حاول مرة أخرى.",
  server_error: "حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.",
};

export default function Login() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err && ERROR_MESSAGES[err]) {
      setError(ERROR_MESSAGES[err]);
    }
  }, []);

  const handleZidLogin = () => {
    const url = "/api/auth/zid";
    try {
      const top = window.top;
      if (top && top !== window.self) {
        top.location.href = url;
        return;
      }
    } catch {
      // cross-origin top frame blocks navigation; fall through
    }
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </Link>

        <div className="bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-10 text-center border-b border-card-border">
            <div className="flex justify-center mb-5">
              <Logo className="h-14 w-14" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              مرحباً بعودتك إلى عائد
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              سجل دخولك بحساب متجرك على Zid لمتابعة سلاتك المهجورة
            </p>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="button"
              onClick={handleZidLogin}
              className="w-full h-12 text-base font-bold shadow-sm hover:shadow-md transition-all"
            >
              تسجيل الدخول عبر Zid
            </Button>

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              بالنقر على الزر، ستتم إعادة توجيهك إلى Zid لمنح منصة عائد
              صلاحية الوصول إلى متجرك.
            </p>

            <div className="text-center text-sm text-muted-foreground border-t pt-6">
              ليس لديك متجر على Zid؟{" "}
              <a
                href="https://zid.sa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-bold hover:underline"
              >
                ابدأ من هنا
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
