import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUserDisplayName, getUserInitials } from '../../lib/auth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center justify-center rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`;

export default function VendorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const vendorStatus = String(user?.vendor?.status || '').toUpperCase();

  const onLogout = () => {
    logout();
    navigate('/vendor/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-900">Vendor Portal</h1>
              <p className="truncate text-sm font-medium text-slate-900">{user?.vendor?.companyName || displayName}</p>
              <p className="break-all text-xs text-slate-500">{user?.loginEmail || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {vendorStatus ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {vendorStatus}
              </span>
            ) : null}
            <button
              onClick={onLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <nav className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-3 md:flex md:flex-col">
            <NavLink to="/vendor/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/vendor/profile" className={linkClass}>
              Profile
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

