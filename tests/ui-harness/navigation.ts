export function useRouter() {
  return {
    push: (path: string) => window.location.assign(path),
    refresh: () => window.location.reload(),
  };
}
export function usePathname() {
  return window.location.pathname;
}
