import React from 'react';
import { useAuth } from './useAuth';
import { LoginView } from '../components/LoginView';
import { AuthLoadingState } from './AuthLoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onLoginSuccess?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  onLoginSuccess,
}) => {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <AuthLoadingState />;
  }

  if (!user.isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={() => {
          if (onLoginSuccess) onLoginSuccess();
        }}
      />
    );
  }

  return <>{children}</>;
};
