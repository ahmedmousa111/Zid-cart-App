import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/logo";
import { apiFetch, ApiError } from "@/lib/api";
import {
  LayoutDashboard,
  ShoppingCart,
  Megaphone,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react";

type AuthMe = {
  authenticated: boolean;
  merchant?: { id: string; name: string | null; email: string | null };
};

function startZidConnect() {
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
}

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery<AuthMe>({
    queryKey: ["/auth/me"],
    queryFn: async () => {
      try {
        return await apiFetch<AuthMe>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return { authenticated: false };
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 30_000,
  });

  const isConnected = !!data?.authenticated;
  const merchantName = data?.merchant?.name?.trim() || "متجرك";

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-l border-sidebar-border flex flex-col shrink-0 sticky top-0 md:h-screen">
        <div className="h-20 border-b border-sidebar-border flex items-center px-6">
          <Wordmark />
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-4 px-2">القائمة الرئيسية</div>

          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium">
              <LayoutDashboard className="w-5 h-5" />
              لوحة التحكم
            </Link>
            <Link href="/dashboard/abandoned-carts" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium">
              <ShoppingCart className="w-5 h-5" />
              السلات المهجورة
              <span className="mr-auto bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">جديد</span>
            </Link>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium">
              <Megaphone className="w-5 h-5" />
              الحملات
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium">
              <Settings className="w-5 h-5" />
              الإعدادات
            </a>
          </nav>
        </div>

        <div className="p-4 border-t mt-auto">
          {isConnected ? (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
                window.location.href = "/login";
              }}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5 ml-2" />
              تسجيل الخروج
            </Button>
          ) : (
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <LogOut className="w-5 h-5 ml-2" />
                تسجيل الخروج
              </Button>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="font-bold text-lg hidden sm:block">نظرة عامة</h2>
            <div className="relative w-full max-w-md mr-auto sm:mr-8 hidden md:block">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن عميل، سلة، أو حملة..."
                className="w-full h-10 bg-muted/50 rounded-full pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all border-transparent focus:border-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-destructive border-2 border-card"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold shadow-sm">
              {isConnected ? merchantName.slice(0, 2) : "أ.م"}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-10 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center" data-testid="dashboard-loading">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : isConnected ? (
            <ConnectedView merchantName={merchantName} />
          ) : (
            <DisconnectedView errored={isError} />
          )}
        </div>
      </main>
    </div>
  );
}

function ConnectedView({ merchantName }: { merchantName: string }) {
  return (
    <div data-testid="dashboard-connected">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          مرحباً، {merchantName}
        </h1>
        <p className="text-muted-foreground mt-2">
          تم ربط متجرك بنجاح. منصة عائد تتابع الآن السلات المهجورة وتجهز حملات الاسترجاع.
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-card rounded-2xl border shadow-sm p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">المتجر متصل</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                نقوم بمزامنة بيانات السلات المهجورة من Zid في الخلفية. يمكنك مراجعة السلات وإطلاق رسائل الاسترجاع من صفحة السلات المهجورة.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/dashboard/abandoned-carts">
              <Button size="lg" className="w-full h-12 text-base shadow-md" data-testid="button-view-abandoned-carts">
                <ShoppingCart className="ml-2 w-5 h-5" />
                عرض السلات المهجورة
                <ArrowLeft className="mr-auto w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisconnectedView({ errored }: { errored: boolean }) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">مرحباً بك في منصة عائد</h1>
        <p className="text-muted-foreground mt-2">خطوة واحدة تفصلك عن استعادة مبيعاتك المفقودة.</p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-2xl border shadow-sm p-10 text-center space-y-6 relative overflow-hidden" data-testid="dashboard-empty">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>

          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <ShoppingCart className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold">اربط متجرك للبدء</h3>
            <p className="text-muted-foreground leading-relaxed">
              لم نتمكن من العثور على سلات مهجورة حتى الآن. قم بربط متجرك على Zid لتبدأ منصة عائد بجمع البيانات وإطلاق حملات الاسترجاع تلقائياً.
            </p>
            {errored && (
              <p className="text-xs text-destructive">
                تعذر التحقق من حالة الاتصال. حاول إعادة تحميل الصفحة.
              </p>
            )}
          </div>

          <div className="pt-4">
            <Button
              size="lg"
              className="w-full h-12 text-base shadow-md"
              onClick={startZidConnect}
              data-testid="button-connect-store"
            >
              <Plus className="ml-2 w-5 h-5" />
              ربط المتجر الإلكتروني
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            تحتاج مساعدة في الربط؟ <a href="#" className="text-primary hover:underline font-medium">شاهد الشرح التوضيحي</a>
          </p>
        </div>
      </div>
    </>
  );
}
