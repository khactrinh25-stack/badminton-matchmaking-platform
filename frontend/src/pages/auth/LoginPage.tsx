import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, LogIn, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { extractApiErrorMessage } from '../../services/api';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const redirectTo = (location.state as LocationState | null)?.from?.pathname || '/sessions';

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.access_token, data.user);
      navigate(redirectTo, { replace: true });
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedPhone = phoneNumber.trim();
    if (!/^0\d{9}$/.test(trimmedPhone)) {
      setValidationError('Số điện thoại phải gồm đúng 10 chữ số bắt đầu bằng số 0.');
      return;
    }

    if (!password) {
      setValidationError('Vui lòng nhập mật khẩu.');
      return;
    }

    loginMutation.mutate({
      phone_number: trimmedPhone,
      password,
    });
  };

  const errorMessage =
    validationError ||
    (loginMutation.isError
      ? extractApiErrorMessage(loginMutation.error, 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
      : null);

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-b from-emerald-50 via-slate-50 to-slate-100 px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-md mb-3">
            <LogIn className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Cầu Lông Vãng Lai</h1>
          <p className="text-sm text-slate-600 mt-1">
            Đăng nhập để tìm sân gần bạn và đặt chỗ nhanh chóng
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Đăng nhập tài khoản</h2>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-slate-700 mb-1.5">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="phone_number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="0901234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
