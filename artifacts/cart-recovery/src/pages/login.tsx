import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login and redirect to dashboard
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </Link>
        
        <div className="bg-card border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 text-center border-b bg-muted/10">
            <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-primary-foreground mb-4 shadow-inner">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">مرحباً بعودتك</h1>
            <p className="text-muted-foreground mt-2">سجل دخولك لمتابعة سلاتك المهجورة</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                className="h-12 text-left" 
                dir="ltr"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <a href="#" className="text-xs text-primary hover:underline font-medium">نسيت كلمة المرور؟</a>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="h-12 text-left"
                dir="ltr"
                required 
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base font-bold shadow-sm hover:shadow-md transition-all">
              تسجيل الدخول
            </Button>
            
            <div className="text-center text-sm text-muted-foreground mt-4">
              ليس لديك حساب؟ <a href="#" className="text-primary font-bold hover:underline">سجل الآن</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}