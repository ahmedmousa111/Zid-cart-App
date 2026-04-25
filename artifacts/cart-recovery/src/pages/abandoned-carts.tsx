import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  ShoppingCart,
  Megaphone,
  Settings,
  LogOut,
  Bell,
  Search,
  Mail,
  Phone,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";
import type { AbandonedCart } from "@/lib/supabase";
import { apiFetch, ApiError } from "@/lib/api";
import { Wordmark } from "@/components/brand/logo";

const STATUS_LABELS: Record<AbandonedCart["status"], string> = {
  pending: "قيد الانتظار",
  contacted: "تم التواصل",
  recovered: "تم الاسترجاع",
  lost: "مفقودة",
};

const STATUS_VARIANTS: Record<
  AbandonedCart["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  contacted: "outline",
  recovered: "default",
  lost: "destructive",
};

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type ApiCart = Omit<AbandonedCart, "store_id" | "created_at">;

function CartActions({ cart }: { cart: ApiCart }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const contactMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true }>("/campaigns/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cart.id }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carts"] });
      toast({
        title: "تم إرسال رسالة الاسترجاع",
        description: `إلى ${cart.customer_name ?? "العميل"}`,
      });
    },
    onError: (err: ApiError) => {
      toast({
        title: "تعذّر الإرسال",
        description:
          err.message === "no_contact_channel"
            ? "لا يوجد بريد أو رقم جوال للعميل"
            : err.message,
        variant: "destructive",
      });
    },
  });

  const recoverMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true }>(
        `/campaigns/${encodeURIComponent(cart.id)}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "recovered" }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carts"] });
      toast({
        title: "تم تأكيد الاسترجاع",
        description: cart.customer_name ?? cart.id,
      });
    },
    onError: (err: ApiError) => {
      toast({
        title: "تعذّر تحديث الحالة",
        description:
          err.message === "campaign_not_found"
            ? "أرسل رسالة الاسترجاع أولًا"
            : err.message,
        variant: "destructive",
      });
    },
  });

  if (cart.status === "recovered" || cart.status === "lost") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const sendLabel =
    cart.status === "contacted" ? "إرسال مجددًا" : "إرسال تنبيه";

  return (
    <div className="flex gap-2 justify-end flex-wrap">
      <Button
        size="sm"
        variant="outline"
        onClick={() => contactMutation.mutate()}
        disabled={contactMutation.isPending}
      >
        {contactMutation.isPending ? (
          <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
        ) : (
          <Send className="w-3.5 h-3.5 ml-1.5" />
        )}
        {sendLabel}
      </Button>
      {cart.status === "contacted" && (
        <Button
          size="sm"
          onClick={() => recoverMutation.mutate()}
          disabled={recoverMutation.isPending}
        >
          {recoverMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
          )}
          تم الاسترجاع
        </Button>
      )}
    </div>
  );
}

export default function AbandonedCarts() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useQuery<
    { carts: ApiCart[] },
    ApiError
  >({
    queryKey: ["carts"],
    queryFn: () => apiFetch<{ carts: ApiCart[] }>("/carts"),
    retry: false,
  });

  useEffect(() => {
    if (error?.status === 401) {
      setLocation("/login");
    }
  }, [error, setLocation]);

  const carts = data?.carts ?? [];

  const filtered = carts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (c.customer_name?.toLowerCase().includes(q) ?? false) ||
      (c.customer_email?.toLowerCase().includes(q) ?? false) ||
      (c.customer_phone?.toLowerCase().includes(q) ?? false)
    );
  });

  const totalValue = carts.reduce((sum, c) => sum + Number(c.cart_total), 0);
  const recoveredCount = carts.filter((c) => c.status === "recovered").length;
  const pendingCount = carts.filter((c) => c.status === "pending").length;
  const recoveryRate = carts.length
    ? Math.round((recoveredCount / carts.length) * 100)
    : 0;
  const currency = carts[0]?.currency ?? "SAR";

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-l border-sidebar-border flex flex-col shrink-0 sticky top-0 md:h-screen">
        <div className="h-20 border-b border-sidebar-border flex items-center px-6">
          <Wordmark />
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-4 px-2">
            القائمة الرئيسية
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium"
            >
              <LayoutDashboard className="w-5 h-5" />
              لوحة التحكم
            </Link>
            <Link
              href="/dashboard/abandoned-carts"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium"
            >
              <ShoppingCart className="w-5 h-5" />
              السلات المهجورة
            </Link>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium"
            >
              <Megaphone className="w-5 h-5" />
              الحملات
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium"
            >
              <Settings className="w-5 h-5" />
              الإعدادات
            </a>
          </nav>
        </div>

        <div className="p-4 border-t mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={async () => {
              await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
              });
              setLocation("/login");
            }}
          >
            <LogOut className="w-5 h-5 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="font-bold text-lg hidden sm:block">السلات المهجورة</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold shadow-sm">
              أ.م
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">السلات المهجورة</h1>
              <p className="text-muted-foreground mt-1">
                تابع كل سلة لم يُكمل صاحبها الشراء، وأعد جذب العملاء بحملات ذكية.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : null}
              تحديث
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  إجمالي السلات
                </CardTitle>
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{carts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  قيمة السلات
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalValue, currency)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  قيد الانتظار
                </CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  معدل الاسترجاع
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recoveryRate}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>قائمة السلات</CardTitle>
                  <CardDescription>
                    جميع السلات التي تم التخلي عنها مرتبة من الأحدث.
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="ابحث باسم العميل أو البريد..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 mx-auto text-muted-foreground/60 animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">
                    جاري جلب السلات من متجرك على Zid...
                  </p>
                </div>
              ) : error && error.status !== 401 ? (
                <div className="py-12 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto text-destructive/70 mb-3" />
                  <p className="font-medium">تعذّر جلب السلات من Zid</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    تأكد من ربط متجرك بنجاح، ثم حاول مرة أخرى.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => refetch()}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="font-medium">لا توجد سلات مهجورة بعد</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ستظهر هنا أي سلة لم يُكمل العميل شراءها.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">التواصل</TableHead>
                        <TableHead className="text-right">المنتجات</TableHead>
                        <TableHead className="text-right">القيمة</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">تاريخ الهجر</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((cart) => (
                        <TableRow key={cart.id}>
                          <TableCell className="font-medium">
                            {cart.customer_name ?? "عميل مجهول"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                              {cart.customer_email && (
                                <span className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5" />
                                  {cart.customer_email}
                                </span>
                              )}
                              {cart.customer_phone && (
                                <span className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5" />
                                  {cart.customer_phone}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{cart.items_count} منتج</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(
                              Number(cart.cart_total),
                              cart.currency,
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[cart.status]}>
                              {STATUS_LABELS[cart.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {formatDate(cart.abandoned_at)}
                          </TableCell>
                          <TableCell>
                            <CartActions cart={cart} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
