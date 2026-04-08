export {};

declare global {
  type DesktopUpdaterStatus = {
    status: 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';
    message: string;
    version?: string;
    progress?: number;
  };

  interface Window {
    synchoDesktop?: {
      isDesktop: boolean;
      versions: {
        chrome: string;
        node: string;
        electron: string;
      };
      ping: () => string;
      updates: {
        checkNow: () => void;
        installNow: () => void;
        onStatus: (listener: (status: DesktopUpdaterStatus) => void) => () => void;
      };
      ipc: {
        send: (channel: string, payload?: unknown) => void;
        on: (channel: string, listener: (data: unknown) => void) => () => void;
      };
    };
  }
}
