import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 🔥 1. أضف useNavigate
import { useAuth } from '@/contexts/AuthContext'; // 🔥 2. أضف useAuth
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, User, AlertCircle, Fingerprint } from 'lucide-react';
import logo from '@/assets/logo.png';
import heroBackground from '@/assets/hero-background.jpg';
import api from '@/lib/axios'; 

const LoginForm: React.FC = () => {
  const navigate = useNavigate(); // 🔥 3. للتوجيه بدون reload
  const { login } = useAuth(); // 🔥 4. دالة الـ login من الـ Context
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log("🚀 جاري محاولة تسجيل الدخول...");

      // 1. إرسال الطلب
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password: password
      });

      console.log("✅ استجابة السيرفر:", response);

      // 2. التحقق الآمن من البيانات
      const data = response.data;
      
      const token = data.token || data.data?.token;
      const user = data.user || data.data?.user;

      if (!token) {
        console.error("❌ لم يتم العثور على التوكن في الاستجابة:", data);
        setError("فشل تسجيل الدخول: استجابة غير صالحة من السيرفر");
        setIsLoading(false);
        return;
      }

      if (!user) {
        console.error("❌ لم يتم العثور على بيانات المستخدم في الاستجابة:", data);
        setError("فشل تسجيل الدخول: بيانات المستخدم غير صالحة");
        setIsLoading(false);
        return;
      }

      // 🔥 3. استخدام الـ Context بدل localStorage المباشر
      login(user, token);
      
      // 🔥 4. التوجيه بدون reload (أسرع بكتير)
      navigate('/', { replace: true });

    } catch (err: unknown) {
      let errorMessage = "حدث خطأ غير متوقع";

      if (axios.isAxiosError(err)) {
        if (err.response) {
          const status = err.response.status;
          const responseData = err.response.data as { message?: string } | undefined;

          if (status === 401) {
            errorMessage = responseData?.message || "بيانات الدخول غير صحيحة";
          } else if (status === 404) {
            errorMessage = "مسار API غير موجود. تأكد أن VITE_API_URL يشير إلى Backend الصحيح.";
          } else if (status === 422) {
            errorMessage = responseData?.message || "يرجى التأكد من البيانات المدخلة";
          } else if (status >= 500) {
            errorMessage = responseData?.message || `خطأ في السيرفر (${status})`;
          } else {
            errorMessage = responseData?.message || `فشل الطلب (${status})`;
          }
        } else if (err.request) {
          errorMessage = "تعذر الوصول إلى Backend (شبكة/CORS). تأكد من تشغيل Go Fiber على http://localhost:3000.";
        } else {
          errorMessage = err.message || "حدث خطأ أثناء إرسال الطلب";
        }
      } else {
        errorMessage = "حدث خطأ غير متوقع";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* الخلفية */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* الشعار */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150" />
            <img 
              src={logo} 
              alt="شعار قطاع الأمن المركزي" 
              className="relative w-40 h-40 object-contain mx-auto drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 0 20px hsl(var(--primary) / 0.3))' }}
              loading="eager"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-4">
            قسم التحريات
          </h1>
        </div>

        {/* كارت تسجيل الدخول */}
        <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-2xl blur-xl opacity-50" />
          
          <div className="relative bg-card/90 backdrop-blur-xl rounded-2xl border border-border/50 p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative bg-primary/10 p-4 rounded-full border border-primary/30">
                  <Fingerprint className="w-8 h-8 text-primary" />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-accent/50 bg-accent/10 animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-primary" />
                  اسم المستخدم
                </Label>
                <div className="relative group">
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="relative bg-input/50 backdrop-blur-sm border-border/50 text-foreground text-right h-12"
                    dir="rtl"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground flex items-center gap-2 text-sm">
                  <Lock className="w-4 h-4 text-primary" />
                  كلمة المرور
                </Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="relative bg-input/50 backdrop-blur-sm border-border/50 text-foreground text-right h-12"
                    dir="rtl"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold relative overflow-hidden group"
                style={{ 
                  background: 'var(--gradient-gold)',
                  boxShadow: 'var(--shadow-gold)' 
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    جاري التحقق...
                  </span>
                ) : (
                  <span className="flex items-center gap-3 text-primary-foreground">
                    <Lock className="w-5 h-5" />
                    تسجيل الدخول
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
        
        <p className="text-center text-muted-foreground text-xs tracking-wider mt-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          © 2026 قطاع الأمن المركزي - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
};

export default LoginForm;