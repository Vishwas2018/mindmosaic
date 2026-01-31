import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
      <p className="text-gray-700 mb-4">The page you are looking for does not exist.</p>
      <Link to="/" className="text-blue-600 hover:text-blue-800">
        Return to Home
      </Link>
    </div>
  );
}
