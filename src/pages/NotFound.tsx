
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import logger from '@/lib/logger';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto">        <h1 className="text-6xl font-bold mb-4 bg-gradient-gaming text-transparent bg-clip-text animate-pulse-slow">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Página não encontrada</p>
        <p className="text-sm text-muted-foreground mb-6">
          Rota tentada: <code className="bg-muted px-2 py-1 rounded">{location.pathname}</code>
        </p>
        <div className="space-y-2">
          <Link to="/" className="bg-gaming-primary hover:bg-gaming-primary/90 text-white px-6 py-3 rounded-md transition-colors inline-block font-semibold shadow-lg">
            Voltar ao Início
          </Link>
          <br />

        </div>
      </div>
    </div>
  );
};

export default NotFound;
