import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

const AuthContext = createContext(null);

const loadProfile = async (authUser) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_color')
    .eq('id', authUser.id)
    .single();
  return {
    userId: authUser.id,
    email: authUser.email,
    name: profile?.name || authUser.user_metadata?.name || '',
    avatar_color: profile?.avatar_color || authUser.user_metadata?.avatar_color || '#7c3aed',
  };
};

const COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777','#0891b2','#4f46e5'];
const pickColor = (seed) =>
  COLORS[Math.abs([...seed].reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; setLoading(false); } };

    // Safety net: never hang more than 4 seconds
    const timeout = setTimeout(done, 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const profile = await loadProfile(session.user);
            setUser(profile);
          } catch {
            setUser({ userId: session.user.id, email: session.user.email, name: '', avatar_color: '#7c3aed' });
          }
        } else {
          setUser(null);
        }
        clearTimeout(timeout);
        done();
      }
    );

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { response: { data: { error: error.message } } };
    const profile = await loadProfile(data.user);
    setUser(profile);
    return profile;
  };

  const signup = async (name, email, password) => {
    const avatar_color = pickColor(email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, avatar_color } },
    });
    if (error) throw { response: { data: { error: error.message } } };
    const userObj = { userId: data.user.id, email, name, avatar_color };
    setUser(userObj);
    return userObj;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
