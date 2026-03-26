import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../services/api';

type GuardStatus = 'loading' | 'allow' | 'redirect_verify';

export default function CompanyRouteGuard({ children }: { children: React.ReactNode }) {
  const { companySlug } = useParams<{ companySlug: string }>();
  const location = useLocation();
  const [status, setStatus] = useState<GuardStatus>('loading');

  const companyIdOrSlug = useMemo(() => (companySlug || '').trim(), [companySlug]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!companyIdOrSlug) {
        setStatus('redirect_verify');
        return;
      }

      try {
        const me = await api.getMe();
        if (cancelled) return;

        const loggedIn = Boolean(me.logged_in ?? me.loggedIn);
        if (!loggedIn) {
          setStatus('redirect_verify');
          return;
        }

        const verifiedCompanies = [
          ...(Array.isArray(me.verified_companies) ? me.verified_companies : []),
          ...(Array.isArray(me.verifiedCompanies) ? me.verifiedCompanies : []),
        ];

        const isVerifiedForCompany = verifiedCompanies.some((company) => {
          return company?.id === companyIdOrSlug || company?.slug === companyIdOrSlug;
        });

        setStatus(isVerifiedForCompany ? 'allow' : 'redirect_verify');
      } catch {
        if (!cancelled) {
          setStatus('redirect_verify');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [companyIdOrSlug]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'redirect_verify') {
    return (
      <Navigate
        to={`/verify?company=${encodeURIComponent(companyIdOrSlug)}`}
        state={{ redirectTo: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}
