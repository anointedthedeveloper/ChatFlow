import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  last_seen: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  resetPassword: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  }, []);

  const updatePresence = useCallback(async (userId: string, status: "online" | "offline") => {
    await supabase
      .from("profiles")
      .update({ status, last_seen: new Date().toISOString() })
      .eq("id", userId);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id);
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
        void updatePresence(session.user.id, "online");
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          window.setTimeout(() => {
            void fetchProfile(session.user.id);
            void updatePresence(session.user.id, "online");
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    const handleUnload = () => {
      const activeUser = currentUserRef.current;
      if (activeUser) {
        void updatePresence(activeUser.id, "offline");
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [fetchProfile, updatePresence]);

  // Realtime: keep own profile in sync (avatar, display name, etc.)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`own-profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => { if (payload.new) setProfile(payload.new as Profile); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: username } },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (user) await updatePresence(user.id, "offline");
    setUser(null);
    setProfile(null);
    setSession(null);
    await supabase.auth.signOut({ scope: "local" });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signOut, refreshProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
