import { Link } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE } from '@/config/brand';
import { Button } from '@/shared/ui/Button';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-bgSoft">
      <header className="bg-white border-b border-brand-borderSubtle">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-text">{APP_NAME}</h1>
              <p className="text-sm text-brand-textMuted">{APP_TAGLINE}</p>
            </div>
            <nav>
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/">Home</Link>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/pricing">Pricing</Link>
                  </Button>
                </li>
                <li>
                  <Link to="/student" className="text-brand-text hover:text-brand-primary px-3 py-1.5 text-sm">
                    Student
                  </Link>
                </li>
                <li>
                  <Link to="/parent" className="text-brand-text hover:text-brand-primary px-3 py-1.5 text-sm">
                    Parent
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="text-brand-text hover:text-brand-primary px-3 py-1.5 text-sm">
                    Admin
                  </Link>
                </li>
                <li>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/signup">Signup</Link>
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {children}
      </main>

      <footer className="bg-white border-t border-brand-borderSubtle">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-sm text-brand-textMuted text-center">
            {APP_NAME} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
