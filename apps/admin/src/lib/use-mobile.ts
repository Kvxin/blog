import { Grid } from 'antd';

// Shared with the CSS breakpoint (767px); do not infer device from user-agent.
export function useMobile() {
  const screens = Grid.useBreakpoint();
  return screens.md === false;
}
