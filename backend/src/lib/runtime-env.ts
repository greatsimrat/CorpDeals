import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const runtimeEnvState = globalThis as typeof globalThis & {
  __corpDealsRuntimeEnvLoaded?: boolean;
};

const backendRoot = path.resolve(__dirname, '..', '..');
const envFilePath = (filename: string) => path.join(backendRoot, filename);

const loadEnvFile = (filename: string, override = false) => {
  const filePath = envFilePath(filename);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override });
  }
};

export const loadRuntimeEnv = () => {
  if (runtimeEnvState.__corpDealsRuntimeEnvLoaded) {
    return;
  }

  const requestedAppEnv = (process.env.APP_ENV || process.env.NODE_ENV || '').trim().toLowerCase();
  const hasProdOverride =
    fs.existsSync(envFilePath('.env.prod')) || fs.existsSync(envFilePath('.env.production'));
  const shouldUseProductionEnv =
    requestedAppEnv === 'production' ||
    requestedAppEnv === 'prod' ||
    (!requestedAppEnv && hasProdOverride);

  loadEnvFile('.env');

  if (shouldUseProductionEnv) {
    loadEnvFile('.env.production', true);
    loadEnvFile('.env.prod', true);
  } else {
    loadEnvFile('.env.local', true);
  }

  runtimeEnvState.__corpDealsRuntimeEnvLoaded = true;
};

