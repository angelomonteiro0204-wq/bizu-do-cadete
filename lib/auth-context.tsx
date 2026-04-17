import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type AuthGateState = {
  /** Is auth/subscription check still loading? */
  loading: boolean;
  /** Is user logged in? */
  isAuthenticated: boolean;
  /** Does user have an active subscription? */
  hasActiveSubscription: boolean;
  /** Is user an admin? */
  isAdmin: boolean;
  /** User object */
  user: any;
  /** Subscription info */
  subscription: any;
  /** Logout function */
  logout: () => Promise<void>;
  /** Refresh subscription status */
  refreshSubscription: () => void;
};

const AuthGateContext = createContext<AuthGateState>({
  loading: true,
  isAuthenticated: false,
  hasActiveSubscription: false,
  isAdmin: false,
  user: null,
  subscription: null,
  logout: async () => {},
  refreshSubscription: () => {},
});

export function useAuthGate() {
  return useContext(AuthGateContext);
}

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Query subscription status only when authenticated
  const subQuery = trpc.subscription.myStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
    refetchInterval: 60000, // Check every minute for expiration
  });

  // Determine admin status from the auth.me endpoint
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 3,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (meQuery.data) {
      const role = (meQuery.data as any)?.role;
      const isAdminUser = role === "admin";
      console.log(`[AuthGate] User role: ${role}, isAdmin: ${isAdminUser}`);
      setIsAdmin(isAdminUser);
    } else {
      console.log(`[AuthGate] No user data available`);
      setIsAdmin(false);
    }
  }, [meQuery.data]);

  const loading = authLoading || (isAuthenticated && (subQuery.isLoading || meQuery.isLoading));

  if (isAuthenticated && meQuery.isError) {
    console.warn(`[AuthGate] Error fetching user data:`, meQuery.error);
  }

  const hasActiveSubscription = isAdmin || (subQuery.data?.hasActiveSubscription ?? false);

  const refreshSubscription = useCallback(() => {
    console.log(`[AuthGate] Refreshing subscription and user data`);
    subQuery.refetch();
    meQuery.refetch();
  }, [subQuery, meQuery]);

  console.log(`[AuthGate] State: loading=${loading}, isAuthenticated=${isAuthenticated}, isAdmin=${isAdmin}, hasActiveSubscription=${hasActiveSubscription}`);

  return (
    <AuthGateContext.Provider
      value={{
        loading,
        isAuthenticated,
        hasActiveSubscription,
        isAdmin,
        user,
        subscription: subQuery.data?.subscription ?? null,
        logout,
        refreshSubscription,
      }}
    >
      {children}
    </AuthGateContext.Provider>
  );
}
