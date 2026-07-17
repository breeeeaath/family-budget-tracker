// region MODULE_CONTRACT [DOMAIN(8): Auth; CONCEPT(7): SessionManagement; TECH(9): ReactQuery]
// ## @modulecontract
// ## @purpose React Query hooks for authentication flow: login, register, fetch current user.
// ## @scope useLogin, useRegister, useMe hooks.
// ## @input Auth credentials (name, password).
// ## @output Query/mutation results with user data.
// ## @links [USES_API(9): authAPI]
// ## @changes
// ## LAST_CHANGE: [v1.0.0 – Initial auth hooks.]
// ## @modulemap
// ## HOOK 10[Login mutation, sets localStorage] => useLogin
// ## HOOK 10[Register mutation, sets localStorage] => useRegister
// ## HOOK 10[Current user query] => useMe
function _module_contract() {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: useLogin, useRegister, useMe, auth, query, mutation, React Query, localStorage
// STRUCTURE: ▶ useLogin ┌credentials┐ → mutateAsync(authAPI.login) → set localStorage → invalidate 'me' → ⎋ TokenResponse
// STRUCTURE: ▶ useMe → queryFn(authAPI.me) → staleTime 5min → retry false → ⎋ user | null

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../api/client';

// region HOOK_useLogin [DOMAIN(8): Auth; CONCEPT(7): LoginFlow; TECH(8): ReactQuery, useMutation]
// ## @purpose Perform login, persist user flag to localStorage, invalidate 'me' query.
// ## @io (name, password) -> mutation
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, password }) => authAPI.login(name, password),
    onSuccess: () => {
      localStorage.setItem('isLoggedIn', '1');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
// endregion HOOK_useLogin

// region HOOK_useRegister [DOMAIN(8): Auth; CONCEPT(7): RegisterFlow; TECH(8): ReactQuery, useMutation]
// ## @purpose Register new user, persist flag, invalidate 'me'.
// ## @io (name, password) -> mutation
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, password }) => authAPI.register(name, password),
    onSuccess: () => {
      localStorage.setItem('isLoggedIn', '1');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
// endregion HOOK_useRegister

// region HOOK_useMe [DOMAIN(8): Auth; CONCEPT(7): SessionCheck; TECH(8): ReactQuery, useQuery]
// ## @purpose Fetch currently authenticated user. Returns null on 401 without retry.
// ## @io () -> { data, isLoading }
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: authAPI.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!localStorage.getItem('isLoggedIn'),
  });
}
// endregion HOOK_useMe
