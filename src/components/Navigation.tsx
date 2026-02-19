
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, LogIn, LogOut, User, Settings } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserType } from '@/hooks/useUserType';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAllowedEmail } from '@/hooks/useAllowedEmail';
import { getConfig } from '@/lib/config';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isRucoyDropdownOpen, setIsRucoyDropdownOpen] = useState(false);
  const [isOtherGamesDropdownOpen, setIsOtherGamesDropdownOpen] = useState(false);
  const { user, signOut, loading } = useSupabaseAuth();
  const { isAdmin, isCustomer, loading: userTypeLoading } = useUserType();
  const { isSuperAdmin } = useSuperAdmin();
  const { isAllowedEmail, loading: allowedEmailLoading } = useAllowedEmail();
  const location = useLocation();
  const navigate = useNavigate();
  const config = getConfig();

  const isSuportAdmin = user?.email === config.admin.emails[1]; // VITE_ADMIN_EMAIL_SUPORT

  const rucoyRoutes = [
    { name: 'Guerreiro', path: '/kina' },
    { name: 'Mago', path: '/mage' },
    { name: 'Arqueiro', path: '/pally' },
    { name: 'Itens', path: '/itens' },
  ];

  const otherGamesRoutes = [
    { name: 'Supercell', path: '/supercell' },
    { name: 'Free Fire', path: '/freefire' },
    { name: 'Outros', path: '/outros' },
  ];  const adminRoutes = [
    { name: 'Create', path: '/create' },
    { name: 'Delete', path: '/delete' },
    { name: 'Profitable', path: '/profitable' },
    { name: 'KKS', path: '/kks' },
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLinkClick = () => {
    closeMenu();
    // Small delay to ensure route change happens first
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleSignOut = async () => {
    await signOut();
    closeMenu();
    // Redirect to home page after logout
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  }; const toggleAdminDropdown = () => {
    setIsAdminDropdownOpen(!isAdminDropdownOpen);
    // Close other dropdowns
    setIsRucoyDropdownOpen(false);
    setIsOtherGamesDropdownOpen(false);
  };

  const closeAdminDropdown = () => {
    setIsAdminDropdownOpen(false);
  };

  const toggleRucoyDropdown = () => {
    setIsRucoyDropdownOpen(!isRucoyDropdownOpen);
    // Close other dropdowns
    setIsAdminDropdownOpen(false);
    setIsOtherGamesDropdownOpen(false);
  };

  const closeRucoyDropdown = () => {
    setIsRucoyDropdownOpen(false);
  };

  const toggleOtherGamesDropdown = () => {
    setIsOtherGamesDropdownOpen(!isOtherGamesDropdownOpen);
    // Close other dropdowns
    setIsAdminDropdownOpen(false);
    setIsRucoyDropdownOpen(false);
  };

  const closeOtherGamesDropdown = () => {
    setIsOtherGamesDropdownOpen(false);
  };

  if (loading || userTypeLoading || allowedEmailLoading) {
    return <div className="h-16 bg-gaming-background border-b border-gaming-card" />;
  }
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gaming-background border-b border-gaming-card">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">          <div className="flex-shrink-0 flex items-center">
          <Link to="/" className="flex items-center gap-2" onClick={handleLinkClick}>
            <img
              src="/suport.png"
              alt="Suport Vendas"
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>{/* Desktop menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-1">
              {/* Geral Link */}
              <Link
                to="/geral"
                className={`tab-button ${isActive('/geral') ? 'active' : ''}`}
              >
                Geral
              </Link>
              
              {/* Divulgações Link - Visible to all users */}
              <Link
                to="/divulgacoes"
                className={`tab-button ${isActive('/divulgacoes') ? 'active' : ''}`}
              >
                Divulgações
              </Link>

              {/* Rucoy Dropdown */}
              <div className="relative">
                <button
                  onClick={toggleRucoyDropdown}
                  className="tab-button flex items-center"
                >
                  Rucoy <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                <div className={`absolute z-50 bg-gaming-card border border-border rounded-md shadow-lg py-1 mt-1 w-32 left-0 transition-all duration-200 ${isRucoyDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                  }`}>
                  {rucoyRoutes.map((route) => (
                    <Link
                      key={route.path}
                      to={route.path}
                      className="block px-4 py-2 hover:bg-muted text-sm"
                      onClick={closeRucoyDropdown}
                    >
                      {route.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Other Games Dropdown */}
              <div className="relative">
                <button
                  onClick={toggleOtherGamesDropdown}
                  className="tab-button flex items-center"
                >
                  Outros Jogos <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                <div className={`absolute z-50 bg-gaming-card border border-border rounded-md shadow-lg py-1 mt-1 w-36 left-0 transition-all duration-200 ${isOtherGamesDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                  }`}>
                  {otherGamesRoutes.map((route) => (
                    <Link
                      key={route.path}
                      to={route.path}
                      className="block px-4 py-2 hover:bg-muted text-sm"
                      onClick={closeOtherGamesDropdown}
                    >
                      {route.name}
                    </Link>
                  ))}
                </div>
              </div>
              {user && (isAdmin || isAllowedEmail) && (
                <div className="relative ml-2">
                  <button
                    onClick={toggleAdminDropdown}
                    className="tab-button flex items-center"
                  >
                    Admin <ChevronDown className="ml-1 h-4 w-4" />
                  </button>
                  <div className={`absolute z-50 bg-gaming-card border border-border rounded-md shadow-lg py-1 mt-1 w-32 right-0 transition-all duration-200 ${isAdminDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}>
                    {adminRoutes.map((route) => (
                      <Link
                        key={route.path}
                        to={route.path}
                        className="block px-4 py-2 hover:bg-muted text-sm"
                        onClick={closeAdminDropdown}
                      >
                        {route.name}
                      </Link>
                    ))}
                    {isSuperAdmin && (
                      <>
                        <Link
                          to="/sales"
                          className="block px-4 py-2 hover:bg-muted text-sm border-t border-border"
                          onClick={closeAdminDropdown}
                        >
                          Últimas Vendas
                        </Link>
                      </>
                    )}
                    {isSuportAdmin && (
                      <Link
                        to="/admin-management"
                        className="block px-4 py-2 hover:bg-muted text-sm border-t border-border"
                        onClick={closeAdminDropdown}
                      >
                        Gerenciar Admins
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {!user ? (
                <Link
                  to="/auth/login"
                  className="tab-button flex items-center"
                >
                  <LogIn className="mr-1 h-4 w-4" />
                  Entrar
                </Link>
              ) : (
                <>
                  {/* User Dashboard Link - only show for customer users */}
                  {isCustomer && (
                    <Link
                      to="/user/dashboard"
                      className="tab-button flex items-center"
                    >
                      <User className="mr-1 h-4 w-4" />
                      Minhas Compras
                    </Link>
                  )}
                  {/* Account Settings Link */}
                  <Link
                    to="/account/settings"
                    className="tab-button flex items-center"
                  >
                    <Settings className="mr-1 h-4 w-4" />
                    Configurações
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="tab-button flex items-center text-destructive"
                  >
                    <LogOut className="mr-1 h-4 w-4" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-gaming-card focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>      {/* Mobile menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          {/* Geral section */}
          <Link
            to="/geral" className={`block px-3 py-2 rounded-md ${isActive('/geral')
              ? 'bg-gaming-primary/20 text-gaming-primary'
              : 'hover:bg-gaming-card'
              }`}
            onClick={handleLinkClick}
          >
            Geral
          </Link>
          
          {/* Divulgações section - Visible to all users */}
          <Link
            to="/divulgacoes" className={`block px-3 py-2 rounded-md ${isActive('/divulgacoes')
              ? 'bg-gaming-primary/20 text-gaming-primary'
              : 'hover:bg-gaming-card'
              }`}
            onClick={handleLinkClick}
          >
            Divulgações
          </Link>

          {/* Rucoy section */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Rucoy
          </div>          {rucoyRoutes.map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className={`block px-6 py-2 rounded-md ${isActive(route.path)
                ? 'bg-gaming-primary/20 text-gaming-primary'
                : 'hover:bg-gaming-card'
                }`}
              onClick={handleLinkClick}
            >
              {route.name}
            </Link>
          ))}

          {/* Other Games section */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Outros Jogos
          </div>          {otherGamesRoutes.map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className={`block px-6 py-2 rounded-md ${isActive(route.path)
                ? 'bg-gaming-primary/20 text-gaming-primary'
                : 'hover:bg-gaming-card'
                }`}
              onClick={handleLinkClick}
            >
              {route.name}
            </Link>
          ))}          {user && (isAdmin || isAllowedEmail) && adminRoutes.map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className={`block px-3 py-2 rounded-md ${isActive(route.path)
                ? 'bg-gaming-primary/20 text-gaming-primary'
                : 'hover:bg-gaming-card'
                }`}
              onClick={handleLinkClick}
            >
              {route.name}
            </Link>
          ))}
          
          {user && (isAdmin || isAllowedEmail) && isSuperAdmin && (
            <>
              <Link
                to="/sales"
                className={`block px-3 py-2 rounded-md border-t border-border ${isActive('/sales')
                  ? 'bg-gaming-primary/20 text-gaming-primary'
                  : 'hover:bg-gaming-card'
                  }`}
                onClick={handleLinkClick}
              >
                Últimas Vendas
              </Link>
            </>
          )}
          {user && (isAdmin || isAllowedEmail) && isSuportAdmin && (
            <Link
              to="/admin-management"
              className={`block px-3 py-2 rounded-md border-t border-border ${isActive('/admin-management')
                ? 'bg-gaming-primary/20 text-gaming-primary'
                : 'hover:bg-gaming-card'
                }`}
              onClick={handleLinkClick}
            >
              Gerenciar Admins
            </Link>
          )}

          {!user ? (
            <Link
              to="/auth/login"
              className="block px-3 py-2 rounded-md hover:bg-gaming-card"
              onClick={handleLinkClick}
            >
              <LogIn className="inline mr-2 h-4 w-4" />
              Entrar
            </Link>
          ) : (
            <>
              {/* User Dashboard Link - only show for customer users */}
              {isCustomer && (
                <Link
                  to="/user/dashboard"
                  className="block px-3 py-2 rounded-md hover:bg-gaming-card"
                  onClick={handleLinkClick}
                >
                  <User className="inline mr-2 h-4 w-4" />
                  Minhas Compras
                </Link>
              )}
              {/* Account Settings Link (mobile) */}
              <Link
                to="/account/settings"
                className="block px-3 py-2 rounded-md hover:bg-gaming-card"
                onClick={handleLinkClick}
              >
                <Settings className="inline mr-2 h-4 w-4" />
                Configurações
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full text-left block px-3 py-2 rounded-md hover:bg-gaming-card text-destructive"
              >
                <LogOut className="inline mr-2 h-4 w-4" />
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
