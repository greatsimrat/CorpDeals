import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-corp-light flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="w-24 h-24 bg-corp-highlight rounded-3xl flex items-center justify-center mx-auto mb-8">
          <span className="font-montserrat font-bold text-5xl text-corp-blue">404</span>
        </div>
        <h1 className="font-montserrat font-bold text-3xl text-corp-dark mb-4">
          Page Not Found
        </h1>
        <p className="font-inter text-corp-gray mb-8">
          Sorry, we couldn't find the page you're looking for. 
          It might have been moved or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/" className="btn-primary flex items-center gap-2">
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <Link to="/" className="btn-secondary flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Companies
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
