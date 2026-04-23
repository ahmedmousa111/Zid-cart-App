import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, BarChart3, Zap, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <span className="font-bold text-xl tracking-tight text-primary">استرجاع</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">المميزات</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">كيف نعمل</a>
          <a href="#pricing" className="hover:text-primary transition-colors">الأسعار</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            تسجيل الدخول
          </Link>
          <Link href="/login">
            <Button>ابدأ الآن مجاناً</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-8 text-center md:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="w-4 h-4" />
              <span>زيادة في المبيعات بنسبة 30%</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
              لا تترك أرباحك <br />
              <span className="text-primary">في سلة المهملات</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              استرجع السلات المهجورة تلقائياً عبر رسائل نصية وبريد إلكتروني مخصصة. 
              ضاعف مبيعات متجرك الإلكتروني بخطوات بسيطة وبدون مجهود إضافي.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14">
                  ابدأ تجربتك المجانية
                  <ArrowLeft className="mr-2 w-5 h-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">لا يتطلب بطاقة ائتمانية</p>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl blur-3xl"></div>
            <div className="relative border bg-card shadow-2xl rounded-2xl overflow-hidden">
              <div className="h-12 border-b bg-muted/50 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <h3 className="font-bold">أحمد محمد</h3>
                    <p className="text-sm text-muted-foreground">ترك 3 منتجات في السلة</p>
                  </div>
                  <span className="font-bold text-lg text-primary">850 ر.س</span>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-4 items-center bg-muted/50 p-3 rounded-lg">
                    <div className="w-12 h-12 bg-background rounded border"></div>
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-background rounded"></div>
                      <div className="h-3 w-16 bg-background rounded mt-2"></div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center bg-muted/50 p-3 rounded-lg">
                    <div className="w-12 h-12 bg-background rounded border"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-background rounded"></div>
                      <div className="h-3 w-20 bg-background rounded mt-2"></div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex gap-2">
                  <Button variant="outline" className="flex-1 h-10 text-xs">إرسال بريد</Button>
                  <Button className="flex-1 h-10 text-xs bg-green-600 hover:bg-green-700">رسالة واتساب</Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="max-w-6xl mx-auto px-6 md:px-12">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">لماذا منصة استرجاع؟</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                صممنا أدواتنا خصيصاً لتلائم السوق العربي وتزيد من نسبة تحويل عملائك بأقل مجهود.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Zap className="w-6 h-6 text-primary" />,
                  title: "أتمتة ذكية",
                  desc: "قم بإعداد حملاتك مرة واحدة، ودع النظام يرسل التذكيرات في الأوقات الأمثل لزيادة نسبة الشراء."
                },
                {
                  icon: <BarChart3 className="w-6 h-6 text-primary" />,
                  title: "تحليلات دقيقة",
                  desc: "تتبع كل ريال تم استرداده بفضل لوحة تحكم مفصلة تظهر أداء كل رسالة وكل قناة تسويقية."
                },
                {
                  icon: <ShieldCheck className="w-6 h-6 text-primary" />,
                  title: "ربط سلس وسريع",
                  desc: "اربط متجرك (سلة، زد، وغيرها) بضغطة زر واحدة وابدأ في استرجاع المبيعات فوراً."
                }
              ].map((feature, i) => (
                <div key={i} className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
            <div className="bg-primary rounded-3xl p-12 md:p-20 text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10 space-y-8">
                <h2 className="text-3xl md:text-5xl font-bold">مستعد لزيادة أرباحك اليوم؟</h2>
                <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                  انضم إلى مئات المتاجر التي تثق بمنصة استرجاع لمضاعفة مبيعاتها بشكل يومي.
                </p>
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="text-lg px-10 h-14 mt-4">
                    أنشئ حسابك الآن
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t py-12 px-6 md:px-12 text-center md:text-right">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
                <ShoppingCart className="w-3 h-3" />
              </div>
              <span className="font-bold text-lg text-primary">استرجاع</span>
            </div>
            <p className="text-sm text-muted-foreground">
              المنصة الأذكى لزيادة مبيعات المتاجر الإلكترونية في العالم العربي.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">المنتج</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary">المميزات</a></li>
              <li><a href="#" className="hover:text-primary">الأسعار</a></li>
              <li><a href="#" className="hover:text-primary">الربط</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">الشركة</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary">من نحن</a></li>
              <li><a href="#" className="hover:text-primary">المدونة</a></li>
              <li><a href="#" className="hover:text-primary">وظائف</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">الدعم</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary">مركز المساعدة</a></li>
              <li><a href="#" className="hover:text-primary">اتصل بنا</a></li>
              <li><a href="#" className="hover:text-primary">شروط الاستخدام</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t text-sm text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} منصة استرجاع. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}