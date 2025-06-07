export {};

declare global {
  interface Window {
    electronAPI: {
      downloadAndExtractTool(args: { url: string; firmwarePath: string }): Promise<{ message: string }>;
      createFolders(basePath: string): Promise<any>;
      extractArchive(args: any): Promise<any>;
      downloadFirmware(args: any): Promise<any>;
      downloadKeys(args: any): Promise<any>;
      downloadExtractedKeys(folderPath: string): Promise<any>;
      downloadDynamic(args: any): Promise<any>;
      downloadEmulator(args: any): Promise<any>;

      // Add these new methods:
      pickFolder(): Promise<string | null>;
      pickFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null>;
    };
  }
}
