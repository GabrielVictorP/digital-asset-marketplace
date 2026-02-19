
import { ReactNode } from 'react';
import Navigation from './Navigation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useSupabaseAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-12 flex-1">
        {children}
      </main>      <footer className="bg-gaming-background py-6 border-t border-gaming-primary/20 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Suport Vendas</p>          <p className="mt-2">
          </p>
          {user && (
            <p className="mt-1 text-xs text-gaming-accent">Logado como {user.email}</p>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Layout;
