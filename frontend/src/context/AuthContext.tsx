import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "../services/api";

export type UserRole =
  | "client"
  | "lawyer"
  | "admin";

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_active?: boolean;
  is_verified?: boolean;
}

interface AuthUserResponse {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_active?: boolean;
  is_verified?: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUserResponse;
}

interface RegisterResponse {
  access_token: string;
  token_type: string;
  user: AuthUserResponse;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<User>;

  register: (data: {
    full_name: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
  }) => Promise<User>;

  logout: () => void;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

/*
 * ---------------------------------------------------------
 * TOKEN KEYS
 * ---------------------------------------------------------
 *
 * vakilo_access_token is the main key used by AuthContext.
 *
 * access_token and token are also maintained for backward
 * compatibility with existing pages/components.
 */

const TOKEN_KEY = "vakilo_access_token";
const ACCESS_TOKEN_KEY = "access_token";
const OLD_TOKEN_KEY = "token";
const USER_KEY = "user";


/*
 * ---------------------------------------------------------
 * GET STORED TOKEN
 * ---------------------------------------------------------
 */

function getStoredToken(): string | null {
  const vakiloToken =
    localStorage.getItem(TOKEN_KEY);

  if (
    vakiloToken &&
    vakiloToken !== "undefined" &&
    vakiloToken !== "null"
  ) {
    return vakiloToken;
  }

  const accessToken =
    localStorage.getItem(ACCESS_TOKEN_KEY);

  if (
    accessToken &&
    accessToken !== "undefined" &&
    accessToken !== "null"
  ) {
    return accessToken;
  }

  const oldToken =
    localStorage.getItem(OLD_TOKEN_KEY);

  if (
    oldToken &&
    oldToken !== "undefined" &&
    oldToken !== "null"
  ) {
    return oldToken;
  }

  return null;
}


/*
 * ---------------------------------------------------------
 * SAVE TOKEN
 * ---------------------------------------------------------
 */

function saveToken(token: string) {
  if (
    !token ||
    token === "undefined" ||
    token === "null"
  ) {
    throw new Error(
      "Authentication token was not returned by the server."
    );
  }

  localStorage.setItem(
    TOKEN_KEY,
    token
  );

  /*
   * Keep these keys synchronized because some existing
   * pages in the application use them.
   */

  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    token
  );

  localStorage.setItem(
    OLD_TOKEN_KEY,
    token
  );
}


/*
 * ---------------------------------------------------------
 * REMOVE AUTH DATA
 * ---------------------------------------------------------
 */

function clearAuthStorage() {
  localStorage.removeItem(
    TOKEN_KEY
  );

  localStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  localStorage.removeItem(
    OLD_TOKEN_KEY
  );

  localStorage.removeItem(
    USER_KEY
  );
}


/*
 * =========================================================
 * AUTH PROVIDER
 * =========================================================
 */

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] =
    useState<string | null>(() => {
      return getStoredToken();
    });

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);


  /*
   * -------------------------------------------------------
   * RESTORE CURRENT USER
   * -------------------------------------------------------
   */

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const currentUser =
          await apiRequest<User>(
            "/auth/me",
            {
              token,
            }
          );

        setUser(currentUser);

        /*
         * Keep user information synchronized.
         */

        localStorage.setItem(
          USER_KEY,
          JSON.stringify(currentUser)
        );
      } catch (error) {
        console.error(
          "Unable to restore authentication:",
          error
        );

        clearAuthStorage();

        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, [token]);


  /*
   * -------------------------------------------------------
   * LOGIN
   * -------------------------------------------------------
   */

  const login = async (
    email: string,
    password: string
  ): Promise<User> => {
    const response =
      await apiRequest<LoginResponse>(
        "/auth/login",
        {
          method: "POST",

          body: {
            email: email.trim().toLowerCase(),
            password,
          },
        }
      );


    /*
     * Validate server response.
     */

    if (
      !response ||
      !response.access_token
    ) {
      throw new Error(
        "Login succeeded but no access token was returned."
      );
    }

    if (
      !response.user ||
      !response.user.id
    ) {
      throw new Error(
        "Login succeeded but user information was not returned."
      );
    }


    /*
     * Save JWT.
     */

    saveToken(
      response.access_token
    );


    /*
     * Build authenticated user.
     */

    const loggedInUser: User = {
      id: response.user.id,

      full_name:
        response.user.full_name,

      email:
        response.user.email,

      phone:
        response.user.phone ?? null,

      role:
        response.user.role,

      is_active:
        response.user.is_active,

      is_verified:
        response.user.is_verified,
    };


    /*
     * Save user.
     */

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(
        loggedInUser
      )
    );


    /*
     * Update React state.
     */

    setToken(
      response.access_token
    );

    setUser(
      loggedInUser
    );

    return loggedInUser;
  };


  /*
   * -------------------------------------------------------
   * REGISTER
   * -------------------------------------------------------
   */

  const register = async (data: {
    full_name: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
  }): Promise<User> => {
    const response =
      await apiRequest<RegisterResponse>(
        "/auth/register",
        {
          method: "POST",

          body: {
            full_name:
              data.full_name.trim(),

            email:
              data.email.trim().toLowerCase(),

            phone:
              data.phone?.trim() || null,

            password:
              data.password,

            role:
              data.role,
          },
        }
      );


    /*
     * The backend now returns:
     *
     * {
     *   access_token,
     *   token_type,
     *   user
     * }
     */

    if (
      !response ||
      !response.access_token
    ) {
      throw new Error(
        "Registration succeeded but no access token was returned."
      );
    }

    if (
      !response.user ||
      !response.user.id
    ) {
      throw new Error(
        "Registration succeeded but user information was not returned."
      );
    }


    /*
     * Save authentication token.
     */

    saveToken(
      response.access_token
    );


    /*
     * Create user object.
     */

    const registeredUser: User = {
      id: response.user.id,

      full_name:
        response.user.full_name,

      email:
        response.user.email,

      phone:
        response.user.phone ?? null,

      role:
        response.user.role,

      is_active:
        response.user.is_active,

      is_verified:
        response.user.is_verified,
    };


    /*
     * Save user.
     */

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(
        registeredUser
      )
    );


    /*
     * Update authentication state.
     */

    setToken(
      response.access_token
    );

    setUser(
      registeredUser
    );

    return registeredUser;
  };


  /*
   * -------------------------------------------------------
   * LOGOUT
   * -------------------------------------------------------
   */

  const logout = () => {
    clearAuthStorage();

    setToken(null);
    setUser(null);
  };


  /*
   * -------------------------------------------------------
   * CONTEXT
   * -------------------------------------------------------
   */

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


/*
 * =========================================================
 * USE AUTH
 * =========================================================
 */

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}