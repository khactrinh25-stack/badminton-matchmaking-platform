import { Calendar, LogOut, MapPin, PlusCircle, User } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/sessions" className="flex items-center gap-2 text-emerald-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              BM
            </span>
            <span className="hidden font-bold tracking-tight text-slate-900 sm:inline">
              BadmintonMatch
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/sessions" end className={navLinkClass}>
              <MapPin className="h-4 w-4" />
              <span>Tìm sân</span>
            </NavLink>
            <NavLink to="/sessions/create" className={navLinkClass}>
              <PlusCircle className="h-4 w-4" />
              <span>Tạo kèo</span>
            </NavLink>
            <NavLink to="/sessions/host" className={navLinkClass}>
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Buổi của tôi</span>
              <span className="sm:hidden">Quản lý</span>
            </NavLink>
            <NavLink to="/profile" className={navLinkClass}>
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.full_name || 'Hồ sơ'}</span>
              <span className="sm:hidden">Hồ sơ</span>
            </NavLink>

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                title="Đăng xuất"
                className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Đăng xuất</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="ml-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
