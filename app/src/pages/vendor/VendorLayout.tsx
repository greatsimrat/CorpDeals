import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`;

export default function VendorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/vendor/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Vendor Portal</h1>
            <p className="text-xs text-slate-500">{user?.vendor?.companyName || user?.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row">
        <aside className="md:w-56">
          <nav className="space-y-2 rounded-xl border border-slate-200 bg-white p-2">
            <NavLink to="/vendor/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/vendor/offers" className={linkClass}>
              Offers
            </NavLink>
            <NavLink to="/vendor/leads" className={linkClass}>
              Leads
            </NavLink>
            <NavLink to="/vendor/billing" className={linkClass}>
              Billing
            </NavLink>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

