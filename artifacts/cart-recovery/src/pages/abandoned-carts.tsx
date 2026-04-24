import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import type { AbandonedCart } from "@/lib/supabase";

const DUMMY_CARTS: AbandonedCart[] = [
  {
    id: "1",
    store_id: "store-1",
    customer_name: "سارة عبدالله",
    customer_email: "sara@example.com",
    customer_phone: "+966500000001",
    cart_total: 780,
    currency: "SAR",
    items_count: 3,
    status: "pending",
    abandoned_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    recovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    store_id: "store-1",
    customer_name: "محمد الحربي",
    customer_email: "mohammed@example.com",
    customer_phone: "+966500000002",
    cart_total: 1450,
    currency: "SAR",
    items_count: 5,
    status: "contacted",
    abandoned_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    recovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    store_id: "store-1",
    customer_name: "نورة الشهري",
    customer_email: "noura@example.com",
    customer_phone: "+966500000003",
    cart_total: 320,
    currency: "SAR",
    items_count: 1,
    status: "recovered",
    abandoned_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    recovered_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    store_id: "store-1",
    customer_name: "خالد العتيبي",
    customer_email: "khalid@example.com",
    customer_phone: "+966500000004",
    cart_total: 2100,
    currency: "SAR",
    items_count: 4,
    status: "pending",
    abandoned_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    recovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "5",
    store_id: "store-1",
    customer_name: "ريم القحطاني",
    customer_email: "reem@example.com",
    customer_phone: "+966500000005",
    cart_total: 540,
    currency: "SAR",
    items_count: 2,
    status: "lost",
    abandoned_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    recovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "6",
    store_id: "store-1",
    customer_name: "عبدالرحمن الزهراني",
    customer_email: "abdulrahman@example.com",
    customer_phone: "+966500000006",
    cart_total: 980,
    currency: "SAR",
    items_count: 6,
    status: "contacted",
    abandoned_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    recovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "7",
    store_id: "store-1",
    customer_name: "هند الدوسري",
    customer_email: "hind@example.com",
    customer_phone: "+966500000007",
    cart_total: 1875,
    currency: "SAR",
    items_count: 7,
    status: "recovered",
    abandoned_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    recovered_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "8",
    store_id: "store-1",
    customer_name: "فهد السبيعي",
    customer_email: "fahad@example.com",
    customer_phone: "+966500000008",
    cart_total: 410,
    currency: "SAR",
    items_count: 2,
    status: "pending",
    abandoned_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    recovered_at: null,
    created_at: new Date().toISOString(),
  },
];

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

export default function AbandonedCarts() {
  const [carts] = useState<AbandonedCart[]>(DUMMY_CARTS);
  const [search, setSearch] = useState("");

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
      <aside className="w-full md:w-64 bg-card border-l flex flex-col shrink-0 sticky top-0 md:h-screen">
        <div className="h-16 border-b flex items-center px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="font-bold text-xl text-primary">استرجاع</span>
          </div>
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
          <Link href="/">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5 ml-2" />
              تسجيل الخروج
            </Button>
          </Link>
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
              {filtered.length === 0 ? (
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
